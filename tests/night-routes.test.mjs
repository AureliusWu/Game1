import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,tick,pulse,dash,chooseUpgrade,serialize,restore} from '../dist/core.mjs';
import {equip,grantGear,openPOI,usePotion,recalculate,compareGear,setupDistrict} from '../dist/systems.mjs';
import {createProfile,readProfile,recordProgress,challengeKey} from '../dist/progress.mjs';
import {UPGRADES,CONDITIONS} from '../dist/content.mjs';
import {applyLayout,findPath,blocked} from '../dist/routes.mjs';
import {receiveHit} from '../dist/expedition.mjs';
import {playJourney} from './journey-bot.mjs';
const advance=(s,n,input={})=>{for(let i=0;i<n;i++)tick(s,input,.05);};
const shadow=(x,y,kind='shade')=>({id:999,kind,x,y,hp:500,maxHp:500,r:18,speed:0,damage:10,warning:0,stun:0,attack:0,shotCd:3,angle:0});
const set=(s,ids)=>{for(const id of ids){grantGear(s,id);equip(s,id);}};
test('twelve bounded upgrades and four unique route conditions',()=>{assert.equal(UPGRADES.length,12);assert.equal(CONDITIONS.length,4);assert.equal(new Set(UPGRADES.map(u=>u.id)).size,12);assert.ok(UPGRADES.every(u=>u.max>=1&&u.category));});
test('field choice pauses, survives reload and resumes the same chapter exactly once',()=>{
 const {state:s}=playJourney(71,'normal',{stopWhen:s=>s.phase==='upgrade'});assert.equal(s.litTotal,2);assert.equal(s.v12.choiceKind,'field');assert.equal(s.chapter,0);
 const r=restore(serialize(s));assert.ok(r);assert.deepEqual(r.offered,s.offered);const time=r.totalTime;tick(r,{x:1},.05);assert.equal(r.totalTime,time);
 const id=r.offered[0];assert.ok(chooseUpgrade(r,id));assert.equal(r.chapter,0);assert.equal(r.phase,'playing');assert.equal(chooseUpgrade(r,id),false);assert.equal(r.upgrades.length,1);assert.equal(r.v12.buildTaken,true);
});
test('patrol farming stops and saving cannot restore the consumed budget',()=>{
 let at120;
 const {state:s}=playJourney(1004,'normal',{camp:true,noPulse:true,observe:s=>{if(!at120&&s.totalTime>=130)at120={coins:s.journal.coins,xp:s.journal.xp,score:s.score,kills:s.kills};},stopWhen:s=>s.totalTime>=260});
 assert.ok(at120);assert.equal(s.v12.patrolLeft,0);assert.deepEqual({coins:s.journal.coins,xp:s.journal.xp,score:s.score,kills:s.kills},at120);assert.ok(s.v12.goldClaimed<=40);assert.ok(s.v12.xpClaimed<=80);
 const r=restore(serialize(s));assert.ok(r);advance(r,600);assert.equal(r.journal.coins,s.journal.coins);assert.equal(r.journal.xp,s.journal.xp);assert.equal(r.score,s.score);assert.equal(r.v12.patrolLeft,0);
});
test('combat recovery stays reduced until nearby threats and the recovery delay clear',()=>{
 const s=createGame({seed:71}),b=s.beacons[0];b.lit=true;s.player.x=b.x;s.player.y=b.y;s.player.hp=30;s.player.attackCd=999;s.player.invincible=999;s.embers=[];s.spawnCd=999;
 s.enemies=[shadow(b.x+200,b.y)];advance(s,20);assert.ok(Math.abs(s.player.hp-33)<.01);s.enemies=[];advance(s,40);assert.ok(s.player.hp<40);advance(s,40);assert.ok(s.player.hp>50);
 b.suppressedUntil=s.totalTime+2;const hp=s.player.hp;advance(s,20);assert.equal(s.player.hp,hp);assert.equal(b.lit,true);
});
test('boss announces a directional attack and a real pulse interrupts it',()=>{
 const s=createGame({seed:71});s.chapter=2;s.bossSpawned=true;s.obstacles=[];s.player.attackCd=999;const e=shadow(s.player.x+150,s.player.y,'boss');Object.assign(e,{r:44,hp:150,stage70:true});s.enemies=[e];
 tick(s,{},.05);assert.equal(e.castType,'beam');assert.ok(e.cast>=.8);const r=restore(serialize(s));assert.ok(r);assert.equal(r.enemies[0].castType,'beam');assert.ok(pulse(s));assert.equal(e.cast,0);assert.equal(s.v12.interrupts,1);
});
test('suppression never turns a lit beacon back into a main-route requirement',()=>{
 const s=createGame({seed:71});s.chapter=2;s.bossSpawned=true;s.obstacles=[];s.beacons.forEach(b=>b.lit=true);const b=s.beacons[0];s.player.x=b.x;s.player.y=b.y;s.player.attackCd=999;const e=shadow(b.x+220,b.y,'boss');Object.assign(e,{r:44,hp:300});s.enemies=[e];advance(s,30);assert.ok(b.suppressedUntil>s.totalTime);assert.ok(s.beacons.every(b=>b.lit));assert.equal(s.exit.open,false);
 e.hp=0;tick(s,{},.05);tick(s,{},.05);assert.equal(s.exit.open,true);
});
test('all nine authored layouts remain connected across 1000 seeds',()=>{
 const checked=new Set();for(let seed=1;seed<=1000;seed++)for(let chapter=0;chapter<3;chapter++){
  const s=createGame({seed});s.chapter=chapter;applyLayout(s);setupDistrict(s);const key=chapter+':'+s.v12.layout;
  if(checked.has(key))continue;checked.add(key);
  for(const p of [...s.beacons,...s.pois,s.exit]){assert.equal(blocked(s,p.x,p.y,25),false,key);assert.ok(findPath(s,s.player,p,15).length,key+':'+p.id);}
 }
 assert.equal(checked.size,9);
});
test('chapter map positions are independent from preceding combat randomness',()=>{
 const a=createGame({seed:1004}),b=createGame({seed:1004});advance(b,200);for(const s of [a,b]){s.phase='upgrade';s.v12.choiceKind='chapter';s.offered=['wing'];chooseUpgrade(s,'wing');}
 assert.deepEqual(a.beacons,b.beacons);assert.deepEqual(a.obstacles,b.obstacles);assert.deepEqual(a.embers.map(({x,y})=>({x,y})),b.embers.map(({x,y})=>({x,y})));
});
test('challenge loadout ignores purchased courses and carried heirlooms',()=>{
 const p=createProfile();p.talents=Object.fromEntries(Object.keys(p.talents).map(k=>[k,3]));p.collection.push('prism-lamp');p.heirloom='prism-lamp';
 const a=createGame({seed:71,mode:'challenge',difficulty:'night',profile:p}),b=createGame({seed:71,mode:'challenge'});assert.deepEqual(a.player,b.player);assert.deepEqual(a.gear,b.gear);assert.deepEqual(a.journal,b.journal);assert.deepEqual(a.talentSnapshot,b.talentSnapshot);assert.equal(a.difficulty,'normal');assert.equal(a.journal.potions,1);assert.equal(a.gear.slots.lamp,'brass-lamp');
});
test('challenge reward claims persist across reload, new runs and condition ordering',()=>{
 let p=createProfile();const make=(id,conditions)=>{const s=createGame({seed:71,id,daily:'2026-11-06',conditions});s.phase='won';s.litTotal=9;s.story.ending='dawn';s.totalTime=110;return s;};
 const a=make('first',['small-bag','express']);recordProgress(p,a,{final:true});const earned=p.stamps;assert.ok(p.lastRewards.total>0);p=readProfile(JSON.stringify(p));
 const b=make('retry',['express','small-bag']);b.totalTime=100;recordProgress(p,b,{final:true});assert.equal(challengeKey(a),challengeKey(b));assert.equal(p.stamps,earned);assert.equal(p.lastRewards.total,0);assert.equal(p.challengeBests[challengeKey(b)],100);
});
test('small bag leaves excess fire on the ground and never destroys its objective resource',()=>{
 const s=createGame({seed:71,conditions:['small-bag']});s.player.embers=8;s.embers=[{id:900,x:s.player.x,y:s.player.y,wobble:0}];tick(s,{},.05);assert.equal(s.player.embers,8);assert.equal(s.embers.length,1);s.player.embers=6;tick(s,{},.05);assert.equal(s.player.embers,7);assert.equal(s.embers.length,0);
});
test('warden barrier preserves its charge during invulnerability and absorbs one real hit',()=>{
 const s=createGame({seed:71});set(s,['hearth-lamp','sentry-cape','herb-bag']);assert.ok(pulse(s));assert.equal(s.v12.barrier,1);receiveHit(s,10);assert.equal(s.v12.barrier,1);s.player.invincible=0;const hp=s.player.hp;receiveHit(s,10);assert.equal(s.player.hp,hp);assert.equal(s.v12.barrier,0);assert.equal(s.v12.barriers,1);
});
test('courier dash collects an actual ember and triggers bounded tailwind',()=>{
 const s=createGame({seed:71});set(s,['brass-lamp','wind-cape','post-bag']);s.embers=[{id:900,x:s.player.x+36,y:s.player.y,wobble:0}];s.player.aimX=1;s.player.aimY=0;dash(s);tick(s,{},.05);assert.equal(s.v12.tailwinds,1);assert.ok(s.v12.tailwindUntil>s.totalTime);assert.equal(s.player.embers,1);
});
test('dawn pulse marks enemies and subsequent bolts trigger a nonrecursive echo',()=>{
 const s=createGame({seed:71});set(s,['prism-lamp','dawn-cape','echo-bag']);s.obstacles=[];s.enemies=[shadow(s.player.x+100,s.player.y),{...shadow(s.player.x+140,s.player.y+20),id:998}];pulse(s);assert.ok(s.enemies.every(e=>e.markUntil>0));advance(s,30);assert.ok(s.v12.echoes>0);assert.ok(s.v12.echoes<=2);assert.ok(s.effects.length<10);
});
test('potion overflow shield obeys missing-health, duration and cap rules',()=>{
 const s=createGame({seed:71});s.upgrades.push('seal');assert.equal(usePotion(s),false);s.player.hp=95;assert.ok(usePotion(s));assert.equal(s.v12.shield,20);assert.equal(s.player.hp,s.player.maxHp);s.embers=[];s.spawnCd=999;advance(s,170);assert.equal(s.v12.shield,0);
});
test('gear comparison reports the source-calculated difference without mutating or healing',()=>{
 const s=createGame({seed:71});s.player.hp=40;const before=serialize(s),p=compareGear(s,'prism-lamp');assert.equal(p.changes.damage,10);assert.equal(p.changes.crit,.06);assert.equal(serialize(s),before);assert.equal(s.player.hp,40);
});
test('side lane is proximity-checked, pays only after defeat and cannot reopen',()=>{
 const s=createGame({seed:71}),poi=s.pois.find(p=>p.kind==='risk');assert.equal(openPOI(s,poi.id),null);s.player.x=poi.x;s.player.y=poi.y;const coins=s.journal.coins;assert.equal(openPOI(s,poi.id).kind,'risk');assert.equal(s.journal.coins,coins);assert.equal(openPOI(s,poi.id),null);const elite=s.enemies.find(e=>e.route);assert.ok(elite);elite.hp=0;tick(s,{},.05);assert.equal(s.v12.riskCleared,1);assert.ok(s.journal.coins>=coins+24);const paid=s.journal.coins;tick(s,{},.05);assert.equal(s.journal.coins,paid);
});
test('released v1.1.1 save continues with exactly the old simulation and source stats',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/v1.1.1-compat.json',import.meta.url),'utf8'));
 const s=restore(JSON.stringify(fixture.before));assert.ok(s);assert.equal(s.rulesVersion,111);assert.equal(s.v12,undefined);advance(s,200,{x:.3,y:.4});
 const expected={...fixture.after,version:3,rulesVersion:111};assert.deepEqual(JSON.parse(serialize(s)),expected);
 s.journal.coins=100;grantGear(s,'brass-lamp');equip(s,'brass-lamp');s.gear.inventory.find(i=>i.id==='brass-lamp').level=3;recalculate(s);assert.equal(s.player.damage,24+(s.journal.level-1)*2+9);
});
test('boss routes around the corner that stalled the stationary seed 1005 policy',()=>{
 const r=playJourney(1005,'wander',{campBoss:true,noPulse:true});assert.equal(r.phase,'won');assert.ok(r.time<180);assert.equal(r.state.bossDefeated,true);
});
test('corrupt new state is rejected before runtime and choice fields cannot be dropped',()=>{
 for(const key of ['patrolLeft','mapRng','buildTaken','conditions','damageSources']){const s=createGame({seed:71});delete s.v12[key];assert.equal(restore(serialize(s)),null,key);}
 const s=createGame({seed:71});s.phase='upgrade';assert.equal(restore(serialize(s)),null);
});
for(const conditions of [...CONDITIONS.map(c=>[c.id]),CONDITIONS.map(c=>c.id)])test(`real challenge journey with ${conditions.join('+')}, save/resume and all three deliveries`,()=>{
 const {state:s,phase}=playJourney(497,'normal',{mode:'challenge',systems:true,share:true,challenge:true,resume:true,conditions});assert.equal(phase,'won');assert.equal(s.story.ending,'hearth');assert.equal(s.metrics.deliveries,3);assert.equal(s.litTotal,9);assert.equal(s.upgrades.length,3);
});
for(const [build,seed,lamp,metric]of [['courier',1002,'brass-lamp','tailwinds'],['warden',1001,'hearth-lamp','wardenBlocks'],['dawn',1001,'prism-lamp','echoes']])test(`real ${build} build acquires its set, uses its mechanism and completes the boss`,()=>{
 const p=createProfile();p.collection.push(lamp);p.heirloom=lamp;
 const {state:s,phase}=playJourney(seed,'normal',{profile:p,systems:true,risk:true,challenge:true,resume:true,build});assert.equal(phase,'won');assert.ok(s.v12[metric]>0);assert.equal(s.bossDefeated,true);
});
test('real side-route expedition defeats its optional guardians without bypassing the boss',()=>{
 const {state:s,phase}=playJourney(497,'normal',{systems:true,risk:true,challenge:true,resume:true});assert.equal(phase,'won');assert.ok(s.v12.riskVisits>0);assert.ok(s.v12.riskCleared>0);assert.equal(s.bossDefeated,true);assert.equal(s.metrics.deliveries,3);
});
