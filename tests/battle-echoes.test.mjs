import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,tick,pulse,chooseUpgrade,serialize,restore} from '../dist/core.mjs';
import {ensureDraft,stepDraft,toggleDraft,recommendedChoice} from '../dist/draft.mjs';
import {isTactical,prepareEnemy,tickEnemy,interruptEnemy,rewardKill} from '../dist/tactics.mjs';
import {advanceEndlessChoices,rerollEndless} from '../dist/endless.mjs';
const game=()=>createGame({seed:1503,mode:'endless'});
const draft=()=>{const s=game();s.endless.pending=1;advanceEndlessChoices(s);ensureDraft(s);return s;};
const actor=(s,kind='runner',extra={})=>{const e={id:999,kind,x:1040,y:690,r:18,hp:1000,maxHp:1000,speed:80,damage:15,stun:0,warning:0,attack:0,shotCd:2,angle:0,...extra};prepareEnemy(s,e);return e;};
test('a live draft expires after four seconds and produces exactly one legal choice',()=>{
 const s=draft();let auto=null;for(let i=0;i<15;i++)assert.equal(stepDraft(s,.25),null);
 auto=stepDraft(s,.25);assert.ok(auto);assert.ok(s.offered.includes(auto.id));assert.equal(stepDraft(s,.25),null);
 assert.ok(chooseUpgrade(s,auto.id));assert.equal(s.selection,undefined);assert.equal(s.endless.pending,0);
});
test('held or obscured draft clocks do not advance or spend game time',()=>{
 const s=draft();stepDraft(s,.25);const time=s.totalTime,remaining=s.selection.remaining;
 toggleDraft(s);for(let i=0;i<60;i++)stepDraft(s,.25);assert.equal(s.selection.remaining,remaining);
 toggleDraft(s);for(let i=0;i<60;i++)stepDraft(s,.25,{blocked:true});assert.equal(s.selection.remaining,remaining);assert.equal(s.totalTime,time);
});
test('draft save/resume preserves the remaining time, recommendation and explicit hold',()=>{
 const s=draft();for(let i=0;i<12;i++)stepDraft(s,.25);toggleDraft(s);const copy=restore(serialize(s));
 assert.ok(copy);assert.equal(ensureDraft(copy).remaining,1);assert.equal(copy.selection.held,true);assert.equal(recommendedChoice(copy),recommendedChoice(s));
});
test('automatic route selection waits six seconds and never spends coins on rest',()=>{
 const s=game();s.endless.remaining=0;s.endless.clearedRoom=true;s.endless.cleared=1;s.endless.pending=0;s.endless.rewardPending=false;
 advanceEndlessChoices(s);s.offered=['rest','hunt','elite'];s.journal.coins=0;assert.equal(ensureDraft(s).duration,6);assert.equal(recommendedChoice(s),'hunt');
 for(let i=0;i<23;i++)assert.equal(stepDraft(s,.25),null);assert.equal(stepDraft(s,.25).id,'hunt');assert.equal(s.journal.coins,0);
});
test('recommendation prefers immediate evolution, then a needed survival choice, and avoids glass relic',()=>{
 const s=draft();s.endless.ranks={cinder:4,haste:2};s.offered=['cinder','might','wing'];delete s.selection;assert.equal(recommendedChoice(s),'cinder');
 s.player.hp=15;s.offered=['might','vitality','wing'];assert.equal(recommendedChoice(s),'vitality');
 s.endless.choice='relic';s.offered=['glass','moon','coin'];assert.equal(recommendedChoice(s),'moon');
});
test('paid reroll resets only its draft countdown and the spent charge remains spent after reload',()=>{
 const s=draft();stepDraft(s,.25);const rolls=s.endless.rerolls;assert.ok(rerollEndless(s));assert.equal(ensureDraft(s).remaining,4);
 const c=restore(serialize(s));assert.ok(c);assert.equal(c.endless.rerolls,rolls-1);assert.equal(c.selection.remaining,4);
});
test('invalid timer state is rejected without discarding a valid old run with no timer',()=>{
 for(const change of [c=>c.remaining=999,c=>c.remaining=-1,c=>c.duration=3,c=>c.key='unrelated',c=>c.held=1]){const s=draft();change(s.selection);assert.equal(restore(serialize(s)),null);}
 const s=game();assert.ok(restore(serialize(s)));
});
test('runner lunge locks its destination before moving and can be interrupted',()=>{
 const s=game(),e=actor(s);e.aiCd=0;s.enemies=[e];let hits=0,moved=0;
 assert.ok(tickEnemy(s,e,.05,()=>hits++,()=>moved++));assert.equal(e.castType,'lunge');assert.ok(e.cast>=.7);const aim=e.castX;
 s.player.x=700;tickEnemy(s,e,.05,()=>hits++,()=>moved++);assert.equal(e.castX,aim);assert.equal(hits,0);assert.equal(moved,0);
 assert.ok(interruptEnemy(s,e));assert.equal(e.cast,0);assert.equal(e.charging,0);
});
test('brute shockwave gives time to leave its locked area before damage',()=>{
 const s=game(),e=actor(s,'brute');e.aiCd=0;let hits=0;tickEnemy(s,e,.05,()=>hits++,()=>{});assert.equal(e.castType,'slam');assert.equal(hits,0);
 s.player.x=600;for(let i=0;i<22;i++)tickEnemy(s,e,.05,()=>hits++,()=>{});assert.equal(hits,0);
});
test('caster fan uses finite real hostile projectiles after a visible windup',()=>{
 const s=game(),e=actor(s,'caster');e.aiCd=0;tickEnemy(s,e,.05,()=>{},()=>{});assert.equal(e.castType,'volley');assert.equal(s.projectiles.length,0);
 for(let i=0;i<20;i++)tickEnemy(s,e,.05,()=>{},()=>{});assert.equal(s.projectiles.length,3);assert.ok(s.projectiles.every(b=>b.enemy&&b.life===3.3));
});
test('warder protection opens a saved three-second weakness when hit by the real pulse',()=>{
 const s=game(),e=actor(s,'warder');s.enemies=[e];assert.ok(pulse(s));assert.equal(e.shieldBrokenUntil,3);
 const c=restore(serialize(s));assert.ok(c);assert.equal(c.enemies[0].shieldBrokenUntil,3);
});
test('elite affixes produce different actual windups rather than only extra hit points',()=>{
 const types=[];for(let affix=0;affix<3;affix++){const s=game(),e=actor(s,'shade',{patrolElite:true});e.affix=affix;e.aiCd=0;tickEnemy(s,e,.05,()=>{},()=>{});types.push(e.castType);}
 assert.deepEqual(types,['lunge','slam','volley']);
});
test('all bosses rotate three attacks, enter phase two once and save their phase and windup',()=>{
 for(let type=0;type<3;type++){
  const s=game(),e=actor(s,'boss',{bossType:type,r:44,hp:400,maxHp:1000});e.aiCd=0;s.enemies=[e];
  tickEnemy(s,e,.05,()=>{},()=>{});assert.equal(e.enraged,true);assert.equal(s.endless.tactics.phaseChanges,1);
  const c=restore(serialize(s));assert.ok(c);assert.equal(c.enemies[0].castType,e.castType);assert.equal(c.enemies[0].enraged,true);
  const patterns=new Set([e.castType]);for(let i=0;i<2;i++){e.cast=0;e.charging=0;e.aiCd=0;tickEnemy(s,e,.05,()=>{},()=>{});patterns.add(e.castType);}
  assert.equal(patterns.size,3);assert.equal(s.endless.tactics.phaseChanges,1);
 }
});
test('real pulse interrupts boss windup and creates a counterattack window',()=>{
 const s=game(),e=actor(s,'boss',{bossType:0,r:44});e.aiCd=0;s.enemies=[e];tickEnemy(s,e,.05,()=>{},()=>{});assert.ok(e.cast>0);
 assert.ok(pulse(s));assert.equal(e.cast,0);assert.equal(e.aiCd,2.5);assert.equal(s.v12.interrupts,1);
});
test('kill milestones spend no HP and elite counters persist without inventing a story victory',()=>{
 const s=game();s.journal.combo=12;s.player.hp=40;s.player.dashCd=2;const coins=s.journal.coins;
 rewardKill(s,{patrolElite:true,affix:1,rewardCoins:5});assert.equal(s.player.dashCd,1.5);assert.equal(s.player.hp,40);assert.equal(s.journal.coins,coins+2);
 const c=restore(serialize(s));assert.ok(c);assert.equal(c.endless.tactics.eliteKills,1);assert.equal(c.endless.tactics.milestones,1);assert.equal(c.phase,'playing');
});
test('v1.4 real saves keep identical combat replay and opt out of new enemy tactics',()=>{
 for(const f of JSON.parse(fs.readFileSync(new URL('./fixtures/v1.4.0-endless.json',import.meta.url),'utf8'))){
  const s=restore(f.raw);assert.ok(s);assert.equal(isTactical(s),false);for(let i=0;i<30;i++)tick(s,{x:.7,y:.2},.05);
  assert.deepEqual({phase:s.phase,time:s.totalTime,hp:s.player.hp,kills:s.kills,xp:s.journal.xp,damage:s.player.damage,enemies:s.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp}))},f.expected);
 }
});
