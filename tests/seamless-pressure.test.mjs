import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,tick,chooseUpgrade,serialize,restore} from '../dist/core.mjs';
import {advanceEndlessChoices,endlessEnemy,updateEndlessCombat,retireEndless} from '../dist/endless.mjs';

const newRun=(seed=1221)=>createGame({seed,mode:'endless',starter:'cinder',seamless:true});
const oldRun=()=>createGame({seed:1221,mode:'endless',starter:'cinder'});
const clearWithRules=s=>{
 // Isolated transition unit test: gameplay actors are tested separately below.
 s.endless.remaining=0;s.enemies=[];s.embers=[];
 return tick(s,{x:0,y:0},.05);
};
test('new continuous endless automatically settles skill, oath, relic and route before loading next arena',()=>{
 const s=newRun(),initial=s.endless.mapIndex;
 assert.equal(s.endless.flowVersion,1);
 const events=clearWithRules(s);
 assert.equal(s.endless.floor,2);assert.equal(s.phase,'playing');assert.equal(s.endless.pending,0);
 assert.equal(s.endless.cleared,1);assert.notEqual(s.endless.mapIndex,initial);
 assert.ok(events.some(e=>e.type==='auto-floor'));assert.ok(!events.some(e=>e.type==='upgrade'));
 for(let floor=2;floor<=6;floor++){
  const events=clearWithRules(s);
  assert.equal(s.endless.floor,floor+1);
  assert.ok(events.some(e=>e.type==='auto-floor'));
  assert.equal(s.offered.length,0);
  assert.equal(s.phase,'playing');
 }
 assert.ok(Object.values(s.endless.oaths.ranks).some(x=>x>0),'third-floor oath automatically granted');
 assert.ok(s.endless.relics.length>=1,'fifth-floor relic automatically granted');
 assert.ok(restore(serialize(s)),'automatic transition remains save-valid');
});
test('XP-level cards stay optional four-second live picks while floor rewards remain non-blocking',()=>{
 const s=newRun();s.endless.pending=1;advanceEndlessChoices(s);
 assert.equal(s.phase,'upgrade');assert.equal(s.endless.choice,'skill');
 assert.equal(s.offered.length,3);assert.ok(restore(serialize(s)));
 assert.ok(chooseUpgrade(s,s.offered[0]));assert.equal(s.phase,'playing');
 clearWithRules(s);assert.equal(s.phase,'playing');assert.equal(s.endless.floor,2);
});
test('earlier direct/API runs preserve old choice and paid route state',()=>{
 const s=oldRun();assert.equal(s.endless.flowVersion,undefined);
 clearWithRules(s);assert.equal(s.phase,'upgrade');assert.equal(s.endless.choice,'skill');
 assert.equal(s.endless.floor,1);assert.ok(restore(serialize(s)));
});
test('new enemy scaling starts at floor one without altering legacy enemy profiles',()=>{
 const normal=oldRun(),hard=newRun(),base={hp:45,r:18,speed:76,damage:13};
 const a=endlessEnemy(normal,'shade',base),b=endlessEnemy(hard,'shade',base);
 assert.ok(b.hp>=a.hp*1.5);assert.ok(b.speed>=a.speed*1.2);assert.ok(b.damage>=a.damage*1.2);
});
test('remaining stationary produces telegraphed pressure and damage; moving avoids the hazard',()=>{
 const run=newRun(),mover=newRun();let hits=0,warnings=0,walkerWarnings=0;
 // Advance only the procedural combat subsystem; do not create or remove enemies.
 for(let i=0;i<300;i++){
  run.totalTime+=.05;run.events=[];
  updateEndlessCombat(run,.05,{spawn:()=>false,hurt:(_s,n)=>hits+=n});
  warnings+=run.events.filter(e=>e.type==='pressure-warning').length;
  mover.totalTime+=.05;mover.player.x=940+(i%20)*7;mover.events=[];
  updateEndlessCombat(mover,.05,{spawn:()=>false,hurt:()=>{}});
  walkerWarnings+=mover.events.filter(e=>e.type==='pressure-warning').length;
 }
 assert.ok(warnings>=2,'the stationary player is warned repeatedly');
 assert.ok(hits>=40,'the stationary player eventually takes real hits');
 assert.equal(walkerWarnings,0,'movement resets stationary charge');
 assert.ok(restore(serialize(run)));assert.ok(restore(serialize(mover)));
});
test('new state cannot be poisoned with invalid pressure data or flow flags',()=>{
 for(const mutate of [s=>s.endless.flowVersion=2,s=>s.endless.stillness={x:0,y:0,seconds:Infinity,cooldown:1},s=>s.endless.stillness={x:0,y:0,seconds:1,cooldown:-1}]){
  const s=newRun();mutate(s);assert.equal(restore(serialize(s)),null);
 }
});
test('landscape skill rail has nonoverlapping fixed rows and footer, combat notice is away from center',async()=>{
 const css=await readFile(new URL('../dist/battle.css',import.meta.url),'utf8');
 assert.match(css,/v1\.8\.2: fixed-height non-modal right rail/);
 assert.match(css,/grid-template-rows:16px 14px/);
 assert.match(css,/height:46px;min-height:46px;max-height:46px/);
 assert.match(css,/height:35px;min-height:35px;max-height:35px/);
 assert.match(css,/max-height:calc\(100dvh - 175px/);
 assert.match(css,/draft-footer[\s\S]*?flex-wrap:nowrap/);
 assert.match(css,/\.game-view \.toast\{left:50%;bottom:/);
});

test('continuous runs can bank their earned result from pause after one completed floor',()=>{
 const s=newRun();assert.equal(retireEndless(s),false);
 clearWithRules(s);assert.equal(s.endless.cleared,1);assert.equal(s.phase,'playing');
 assert.equal(retireEndless(s),true);assert.equal(s.phase,'won');assert.equal(s.endless.retired,true);
 assert.equal(retireEndless(s),false);
});

test('first two genuine kills grant one early skill draft only for the new continuous mode',async()=>{
 const {onEndlessKill}=await import('../dist/endless.mjs');
 const s=newRun(),e={kind:'shade',id:999,x:1000,y:650,r:18,rewardCoins:2,rewardXP:6,damage:13};
 s.kills=1;onEndlessKill(s,e);assert.equal(s.endless.pending,0);
 s.kills=2;onEndlessKill(s,{...e,id:1000});assert.equal(s.endless.pending,1);
 s.kills=3;onEndlessKill(s,{...e,id:1001});assert.equal(s.endless.pending,1);
 const legacy=oldRun();legacy.kills=2;legacy.endless.roomKills=1;onEndlessKill(legacy,e);assert.equal(legacy.endless.pending,0);
});
test('wander remains playable for mobile learning without removing normal anti-AFK pressure',()=>{
 const s=createGame({seed:1221,mode:'endless',starter:'cinder',seamless:true,difficulty:'wander'});
 const old=oldRun();const base={hp:45,r:18,speed:76,damage:13};
 assert.equal(endlessEnemy(s,'shade',base).hp,endlessEnemy(old,'shade',base).hp);
 let warnings=0;
 for(let i=0;i<150;i++){s.totalTime+=.05;s.events=[];updateEndlessCombat(s,.05,{spawn:()=>false,hurt:()=>{}});warnings+=s.events.filter(e=>e.type==='pressure-warning').length;}
 assert.equal(warnings,0);
});
