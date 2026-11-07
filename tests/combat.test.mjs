import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,tick,dash,pulse,serialize,restore,chooseUpgrade} from '../dist/core.mjs';
import {damageEnemy,chargeCombat,isCombat,overdriving} from '../dist/combat.mjs';
import {advanceEndlessChoices} from '../dist/endless.mjs';
import {recalculate} from '../dist/systems.mjs';
const game=()=>createGame({seed:1404,mode:'endless'});
const enemy=(s,x=1000,y=690,extra={})=>({id:s.nextId++,kind:'shade',x,y,r:18,hp:1000,maxHp:1000,speed:0,damage:0,stun:0,warning:0,attack:0,shotCd:1,angle:0,...extra});
test('every haste rank continues improving real attack cadence in the faster combat rules',()=>{
 const s=game();let rate=s.player.attackRate;for(let level=1;level<=5;level++){s.endless.ranks.haste=level;recalculate(s);assert.ok(s.player.attackRate<rate);rate=s.player.attackRate;}
});
test('dash cuts a real movement segment once per enemy, rather than once per frame',()=>{
 const s=game();s.endless.remaining=0;s.player.attackCd=100;s.enemies=[enemy(s)];
 assert.ok(dash(s));for(let n=0;n<10;n++)tick(s,{x:1,y:0},.016);
 assert.equal(s.endless.combat.dashHits,1);assert.ok(s.enemies[0].hp<1000);assert.ok(s.enemies[0].hp>900);
 assert.equal(dash(s),false);assert.equal(s.endless.combat.dashSerial,1);
});
test('dash does not cut through cover or damage a spawning warning',()=>{
 const s=game();s.obstacles=[{x:970,y:630,w:30,h:120}];s.endless.remaining=0;s.player.attackCd=100;
 s.enemies=[enemy(s,1030),enemy(s,955,690,{warning:1})];dash(s);
 for(let i=0;i<6;i++)tick(s,{x:1},.02);assert.ok(s.player.x<955.01);assert.ok(s.enemies.every(e=>e.hp===1000));
});
test('pulse removes nearby hostile bullets while preserving allied and distant shots',()=>{
 const s=game();s.projectiles=[{x:950,y:690,r:8,enemy:true},{x:1450,y:690,r:8,enemy:true},{x:950,y:690,enemy:false}];
 assert.ok(pulse(s));assert.equal(s.projectiles.length,2);assert.equal(s.projectiles.filter(b=>b.enemy).length,1);
 assert.equal(pulse(s),false);
});
test('overdrive rewards real kills, refreshes skills once and cannot farm heat during the burst',()=>{
 const s=game();s.player.hp=35;s.player.pulseCd=3;s.player.dashCd=1;
 for(let i=0;i<9;i++)chargeCombat(s,{kind:'shade'});assert.equal(s.endless.combat.heat,90);assert.equal(overdriving(s),false);
 chargeCombat(s,{kind:'shade'});assert.ok(overdriving(s));assert.equal(s.endless.combat.overdrives,1);assert.equal(s.player.hp,35);assert.equal(s.player.pulseCd,0);assert.equal(s.player.dashCd,0);
 s.player.pulseCd=2;for(let i=0;i<30;i++)chargeCombat(s,{kind:'shade'});assert.equal(s.endless.combat.heat,0);assert.equal(s.player.pulseCd,2);
});
test('overdrive blast resolves before death accounting and a killed enemy is rewarded once',()=>{
 const s=game();s.endless.remaining=0;s.endless.combat.heat=90;s.player.attackCd=100;
 // The live actor precedes the dead actor in array order: no skipped reward.
 s.enemies=[enemy(s,1000,690,{hp:20,rewardXP:6}),enemy(s,1010,690,{hp:0,rewardXP:6})];
 tick(s,{},.01);assert.equal(s.kills,1);assert.equal(s.enemies.length,1);
 tick(s,{},.01);assert.equal(s.kills,2);assert.equal(s.enemies.length,0);const kills=s.kills;
 const copy=restore(serialize(s));assert.ok(copy);chooseUpgrade(copy,copy.offered[0]);tick(copy,{},.01);assert.equal(copy.kills,kills);
});
test('overdrive, pending blast and dash identities persist across save/resume and freeze in a draft',()=>{
 const s=game();for(let i=0;i<10;i++)chargeCombat(s,{kind:'shade'});dash(s);s.endless.pending=1;advanceEndlessChoices(s);
 const copy=restore(serialize(s));assert.ok(copy);assert.equal(copy.endless.combat.burstPending,true);assert.equal(copy.endless.combat.dashSerial,1);
 const until=copy.endless.combat.overdriveUntil;for(let i=0;i<20;i++)tick(copy,{},.05);assert.equal(copy.totalTime,0);assert.equal(copy.endless.combat.overdriveUntil,until);
});
test('invalid combat payloads are rejected rather than granting infinite burst or free heat',()=>{
 for(const corrupt of [c=>c.heat=100,c=>c.heat=-1,c=>c.overdriveUntil=100,c=>c.dashSerial=1.5,c=>c.perfects=-1,c=>c.burstPending='yes',c=>c.version=2]){
  const s=game();corrupt(s.endless.combat);assert.equal(restore(serialize(s)),null);
 }
});
test('flawless reward belongs to atomic room clearance, including after reload',()=>{
 const s=game();s.endless.remaining=0;const coins=s.journal.coins;advanceEndlessChoices(s);
 assert.equal(s.journal.coins,coins+16);assert.equal(s.endless.combat.perfects,1);
 const copy=restore(serialize(s));assert.ok(copy);advanceEndlessChoices(copy);assert.equal(copy.journal.coins,coins+16);assert.equal(copy.endless.combat.perfects,1);
});
test('damage numbers reflect damage actually dealt, including a final overkill hit',()=>{
 const s=game(),e=enemy(s,1000,690,{hp:5});assert.equal(damageEnemy(s,e,500,{critical:true}),5);
 assert.equal(s.events.find(e=>e.type==='damage-number').damage,5);assert.equal(damageEnemy(s,e,500),0);
});
test('v1.3 real save fixtures replay identically without enabling new combat rules',()=>{
 for(const f of JSON.parse(fs.readFileSync(new URL('./fixtures/v1.3.0-endless.json',import.meta.url),'utf8'))){
  const s=restore(f.raw);assert.ok(s);assert.equal(isCombat(s),false);
  for(let i=0;i<20;i++)tick(s,{x:.7,y:.2},.05);
  assert.deepEqual({time:s.totalTime,hp:s.player.hp,kills:s.kills,xp:s.journal.xp,damage:s.player.damage,attackRate:s.player.attackRate,enemies:s.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp}))},f.expected);
 }
});
