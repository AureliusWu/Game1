import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,pulse,chooseUpgrade,serialize,restore} from '../dist/core.mjs';
import {recalculate} from '../dist/systems.mjs';
import {isEndless,SKILLS,rankOf,evolved,gainEndlessXP,advanceEndlessChoices,rerollEndless,retireEndless,choiceInfo,restCost,buyEndlessSupply,supplyCost,updateEndlessCombat,endlessBossCast,reviveEndless} from '../dist/endless.mjs';
import {createProfile,readProfile,recordProgress} from '../dist/progress.mjs';
import {playEndless} from './endless-bot.mjs';
const game=options=>createGame({seed:1301,mode:'endless',...options});
const draft=s=>{s.endless.pending++;advanceEndlessChoices(s);return s;};
test('endless is explicit in simulation; story and fair daily keep their original identities',()=>{
 assert.equal(isEndless(createGame()),false);assert.equal(isEndless(game()),true);
 const daily=game({daily:'2026-11-06'});assert.equal(isEndless(daily),false);assert.equal(daily.v12.mode,'challenge');
 assert.equal(game().pois.length,0);assert.equal(game().player.x,940);
});
test('all four starters produce distinct actual weapon damage without enemy or HP edits during play',()=>{
 const snapshots=[];
 for(const starter of ['cinder','frost','orbit','thunder']){
  const s=game({starter});s.enemies=[{id:999,x:1060,y:690,r:20,hp:5000,maxHp:5000,warning:0,stun:0,kind:'shade',speed:0,damage:1,attack:0,shotCd:2,angle:0}];
  for(let n=0;n<90;n++)tick(s,{},.05);
  snapshots.push(Math.round(5000-s.enemies.find(e=>e.id===999).hp));
 }
 assert.equal(new Set(snapshots).size,4);assert.ok(snapshots.every(n=>n>0));
});
test('XP creates saved three-way drafts and never advances a room or fully heals',()=>{
 const s=game();s.player.hp=50;gainEndlessXP(s,60);advanceEndlessChoices(s);
 assert.equal(s.phase,'upgrade');assert.equal(s.endless.pending,2);assert.equal(s.offered.length,3);
 const saved=serialize(s),copy=restore(saved);assert.ok(copy);assert.deepEqual(copy.offered,s.offered);assert.equal(copy.endless.rng,s.endless.rng);
 const id=s.offered.find(id=>id!=='vitality');assert.ok(chooseUpgrade(s,id));assert.equal(s.endless.floor,1);assert.equal(s.player.hp,50);
 assert.equal(s.phase,'upgrade');assert.equal(s.endless.pending,1);assert.ok(restore(serialize(s)));
});
test('drafts enforce three weapons/four passives and remove capped ranks',()=>{
 const s=game();s.endless.ranks={cinder:5,orbit:5,thunder:5,might:5,haste:5,magnet:5,wing:5};
 draft(s);assert.deepEqual(s.offered,['ash','mend','supplies']);const before=s.player.damage;
 assert.ok(chooseUpgrade(s,'ash'));assert.ok(s.player.damage>before);assert.equal(Object.keys(s.endless.ranks).length,7);
 for(let n=0;n<40;n++){draft(s);rerollEndless(s);assert.ok(s.offered.every(id=>!SKILLS.some(u=>u.id===id)));chooseUpgrade(s,'ash');}
 assert.ok(restore(serialize(s)));
});
test('repeated drafts never introduce a fourth weapon or fifth passive',()=>{
 const s=game();s.endless.ranks={cinder:2,orbit:2,thunder:2,might:2,haste:2,magnet:2,wing:2};
 for(let n=0;n<15;n++){draft(s);assert.ok(!s.offered.includes('frost'));assert.ok(s.offered.every(id=>Object.hasOwn(s.endless.ranks,id)||['ash','mend','supplies'].includes(id)));chooseUpgrade(s,s.offered[0]);}
});
test('reroll spends a persistent limited charge, cannot heal, and cannot reroll routes',()=>{
 const s=draft(game());s.player.hp=35;const rng=s.endless.rng;
 assert.ok(rerollEndless(s));assert.equal(s.endless.rerolls,1);assert.notEqual(s.endless.rng,rng);assert.equal(s.player.hp,35);
 const copy=restore(serialize(s));assert.ok(copy);assert.deepEqual(copy.offered,s.offered);assert.equal(copy.endless.rerolls,1);
 assert.ok(rerollEndless(s));assert.equal(rerollEndless(s),false);
 s.endless.choice='route';s.offered=['hunt','cache','rest'];assert.equal(rerollEndless(s),false);
});
test('every weapon evolves only with its own Lv.2 partner and persists the evolution',()=>{
 for(const u of SKILLS.filter(u=>u.kind==='weapon')){
  const s=game({starter:u.id});s.endless.ranks={[u.id]:4,[u.partner]:2};draft(s);s.offered=[u.id];
  assert.ok(chooseUpgrade(s,u.id));assert.ok(evolved(s,u.id));assert.deepEqual(s.endless.evolutions,[u.id]);
  assert.ok(restore(serialize(s)));assert.equal(rankOf(s,u.id),5);
  const wrong=game({starter:u.id});wrong.endless.ranks[u.id]=5;assert.equal(evolved(wrong,u.id),false);
 }
});
test('clearing a room claims rewards once and collects the remaining real XP',()=>{
 const s=game();s.endless.remaining=0;s.enemies=[];s.embers=[{id:900,x:1000,y:690,wobble:0,xp:6}];
 const coins=s.journal.coins;advanceEndlessChoices(s);assert.equal(s.endless.cleared,1);assert.equal(s.journal.xp,6);assert.equal(s.journal.coins,coins+16);assert.equal(s.collected,1);
 const copy=restore(serialize(s));assert.ok(copy);chooseUpgrade(copy,copy.offered[0]);const after=copy.journal.coins;
 advanceEndlessChoices(copy);assert.equal(copy.journal.coins,after);assert.equal(copy.endless.cleared,1);
});
function routeDraft(s){s.endless.remaining=0;s.enemies=[];s.endless.clearedRoom=true;s.endless.cleared=s.endless.floor;s.endless.pending=0;s.endless.rewardPending=false;advanceEndlessChoices(s);s.offered=['hunt','rest','elite'];return s;}
test('paid rest is atomic; free route advances exactly once and does not end at floor three',()=>{
 const s=routeDraft(game());s.player.hp=20;s.journal.coins=0;assert.equal(choiceInfo(s,'rest').disabled,true);assert.equal(chooseUpgrade(s,'rest'),false);assert.equal(s.endless.floor,1);
 s.journal.coins=100;const cost=restCost(s);assert.ok(chooseUpgrade(s,'rest'));assert.equal(s.journal.coins,100-cost);assert.equal(s.endless.floor,2);assert.equal(s.player.hp,55);assert.equal(s.journal.potions,2);assert.equal(chooseUpgrade(s,'rest'),false);
 routeDraft(s);chooseUpgrade(s,'hunt');routeDraft(s);chooseUpgrade(s,'hunt');assert.equal(s.endless.floor,4);assert.equal(s.chapter,0);assert.equal(s.phase,'playing');assert.ok(restore(serialize(s)));
});
test('intermission supplies spend real coins and cannot be bought twice through a restored draft',()=>{
 const s=routeDraft(game());s.journal.coins=100;s.player.hp=40;
 const cost=supplyCost(s,'tea');assert.ok(buyEndlessSupply(s,'tea'));assert.equal(s.player.hp,65);assert.equal(s.journal.coins,100-cost);assert.equal(buyEndlessSupply(s,'tea'),false);
 const copy=restore(serialize(s));assert.ok(copy);assert.equal(buyEndlessSupply(copy,'tea'),false);assert.ok(buyEndlessSupply(copy,'reroll'));assert.equal(copy.endless.rerolls,3);assert.equal(buyEndlessSupply(copy,'reroll'),false);
 const offers=[...copy.offered];assert.ok(buyEndlessSupply(copy,'potion'));assert.deepEqual(copy.offered,offers);assert.equal(copy.journal.potions,2);assert.ok(restore(serialize(copy)));
});
test('a real cache route grants a relic and can continue with the same saved construction',()=>{
 const r=playEndless({seed:1313,starter:'thunder',route:'cache',floors:7,resume:true,maxTime:600});assert.equal(r.s.phase,'won');assert.ok(r.s.endless.relics.length>=2);assert.ok(r.s.endless.bosses>=1);assert.ok(r.s.endless.floor>3);
});
test('lamps in endless mode provide one finite heal; they neither repel enemies nor become a healing camp',()=>{
 const s=game();s.player.x=s.beacons[0].x;s.player.y=s.beacons[0].y;s.player.hp=40;s.player.embers=5;s.endless.remaining=0;
 s.enemies=[{id:999,x:s.player.x+100,y:s.player.y,r:18,hp:10000,maxHp:10000,kind:'shade',warning:0,stun:0,speed:0,damage:0,attack:0,shotCd:2,angle:0}];
 for(let i=0;i<14;i++)tick(s,{},.05);assert.equal(s.litTotal,1);assert.equal(s.player.embers,0);assert.equal(s.player.hp,60);
 const hp=s.player.hp;for(let i=0;i<200;i++)tick(s,{},.05);assert.equal(s.player.hp,hp);assert.equal(s.exit.open,false);
});
test('lightning jumps only once per enemy and cannot hit distant targets',()=>{
 const s=game({starter:'thunder'});s.endless.thunderCd=0;s.enemies=[0,1,2,3].map((i)=>({id:900+i,kind:'shade',x:i===3?1800:1000+i*90,y:690,r:18,hp:1000,maxHp:1000,warning:0,stun:0}));
 updateEndlessCombat(s,.05,{spawn:()=>false,hurt:()=>{}});assert.ok(s.enemies.slice(0,3).every(e=>e.hp===975));assert.equal(s.enemies[3].hp,1000);
});
test('storm warnings lock their target and allow moving out before damage',()=>{
 const make=()=>{const s=game();s.endless.weather='storm';s.endless.zoneCd=0;return s;};
 let damage=0;const s=make();updateEndlessCombat(s,.05,{spawn:()=>false,hurt:(_,n)=>damage+=n});assert.equal(s.endless.zones.length,1);assert.equal(damage,0);const zone={...s.endless.zones[0]};s.player.x+=200;
 for(let i=0;i<26;i++)updateEndlessCombat(s,.05,{spawn:()=>false,hurt:(_,n)=>damage+=n});assert.equal(damage,0);assert.equal(zone.x,940);
 const t=make();for(let i=0;i<27;i++)updateEndlessCombat(t,.05,{spawn:()=>false,hurt:(_,n)=>damage+=n});assert.ok(damage>0);
});
test('three boss patterns give a full warning and pulse interrupts their locked attack',()=>{
 for(const type of [0,1,2]){
  const s=game(),p=s.player,e={id:999,x:p.x+100,y:p.y,kind:'boss',r:44,hp:2000,maxHp:2000,speed:0,damage:22,warning:0,stun:0,angle:0,patternCd:0,bossType:type};s.enemies=[e];
  let hits=0;endlessBossCast(s,e,.05,()=>hits++,()=>{});assert.ok(e.cast>=1);assert.equal(hits,0);assert.equal(e.castType,['beam','charge','rain'][type]);
  assert.ok(pulse(s));assert.equal(e.cast,0);assert.equal(s.v12.interrupts,1);
 }
});
test('second dawn revives only once and cannot recreate the spent charge after save/resume',()=>{
 const s=game();s.endless.relics=['dawn'];s.player.hp=0;assert.ok(reviveEndless(s));assert.equal(s.player.hp,50);assert.ok(s.player.invincible>=3);
 const t=restore(serialize(s));assert.ok(t);t.player.hp=0;assert.equal(reviveEndless(t),false);assert.equal(t.endless.revived,true);
});
test('endless personal records/rewards survive reload without inventing story endings or duplicate stamps',()=>{
 const s=routeDraft(game()),p=createProfile();s.endless.cleared=7;s.endless.bosses=1;assert.ok(retireEndless(s));
 recordProgress(p,s,{final:true});const stamps=p.stamps;assert.equal(p.endless.bestFloor,7);assert.equal(p.endless.runs,1);assert.equal(p.endless.bosses,1);assert.equal(p.totals.wins,0);assert.deepEqual(p.endings,[]);
 const copy=readProfile(JSON.stringify(p));recordProgress(copy,s,{final:true});assert.equal(copy.stamps,stamps);assert.equal(copy.endless.runs,1);assert.equal(copy.endless.bosses,1);
});
test('malformed endless drafts, slot overflow, huge queues and unknown ranks are rejected',()=>{
 for(const corrupt of [s=>s.endless.ranks.fiction=1,s=>s.endless.ranks.constructor=1,s=>s.endless.ranks.cinder=6,s=>s.endless.pending=501,s=>s.endless.floor=-1,s=>s.offered=['impossible'],s=>s.endless.ranks={cinder:1,frost:1,thunder:1,orbit:1},s=>s.endless.zones=[{x:0,y:0,r:85,warning:999}]]){
  const s=draft(game());corrupt(s);assert.equal(restore(serialize(s)),null);
 }
});
for(const starter of ['cinder','frost','orbit','thunder'])test(`real endless journey: ${starter}, six floors, boss, evolution, save and voluntary settlement`,()=>{
 const r=playEndless({seed:1301,starter,floors:6,resume:true,maxTime:600});
 assert.equal(r.s.phase,'won');assert.equal(r.s.endless.retired,true);assert.equal(r.s.endless.cleared,6);assert.ok(r.s.endless.bosses>=1);assert.ok(r.s.endless.evolutions.includes(starter));assert.ok(r.resumed);assert.ok(r.choices>=10);assert.equal(r.milestones.length,6);
 assert.ok(r.maxEnemies<=30&&r.maxProjectiles<=250&&r.maxEffects<=120);
});
test('real idle run eventually dies without input; an endless run never auto-wins after three chapters',()=>{
 const r=playEndless({seed:1309,starter:'cinder',idle:true,floors:50,maxTime:600});assert.equal(r.s.phase,'lost');assert.ok(r.s.damageTaken>=100);assert.ok(r.s.endless.floor>3);assert.equal(r.s.endless.retired,false);
});
