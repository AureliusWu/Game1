import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,tick,chooseUpgrade,serialize,restore} from '../dist/core.mjs';
import {retireEndless,oathRank} from '../dist/endless.mjs';
import {ensureDraft,stepDraft,toggleDraft,recommendedChoice} from '../dist/draft.mjs';
import {playEndless} from './endless-bot.mjs';

// PR #4 retains main's gameplay contracts. These checkpoints come from the
// existing player-action bot: no enemies, XP, health or room progress are edited.
const journeys=new Map();
function journey(difficulty='normal'){
 if(journeys.has(difficulty))return journeys.get(difficulty);
 const checkpoints=new Map();let firstKills=null,earlyDrafts=0;
 const result=playEndless({seed:1301,starter:'thunder',difficulty,
  floors:difficulty==='normal'?5:2,maxTime:600,resume:true,
  observe(s){
   if(!firstKills&&s.kills>=2)firstKills=serialize(s);
   earlyDrafts+=s.events.filter(e=>e.type==='early-draft').length;
   if(s.phase==='upgrade'&&s.endless.clearedRoom&&!checkpoints.has(s.endless.floor)){
    checkpoints.set(s.endless.floor,serialize(s));
   }
  }});
 assert.equal(result.s.phase,'won','the policy must genuinely finish and settle its requested rooms');
 assert.ok(result.resumed,'the actual journey must resume from a serialized checkpoint');
 assert.ok(firstKills,'actual combat must earn at least two kills');
 const record={...result,checkpoints,firstKills,earlyDrafts};journeys.set(difficulty,record);return record;
}
function checkpoint(floor){
 const raw=journey().checkpoints.get(floor);assert.ok(raw,`real room ${floor} must produce a reward checkpoint`);
 const copy=restore(raw);assert.ok(copy);return copy;
}
function chooseUntil(s,predicate){
 for(let count=0;count<64&&!predicate(s);count++){
  assert.equal(s.phase,'upgrade');
  const id=recommendedChoice(s);assert.ok(id&&s.offered.includes(id));
  assert.equal(chooseUpgrade(s,id),true);
  const copy=restore(serialize(s));assert.ok(copy);s=copy;
 }
 assert.ok(predicate(s),'legal reward choices must reach their expected boundary');return s;
}

test('fresh main runs keep independent live-draft and Flow contracts without the rejected PR mode',()=>{
 for(const difficulty of ['normal','wander']){
  const s=createGame({seed:1301,mode:'endless',starter:'thunder',difficulty});
  assert.equal(s.endless.draftSerial,0);assert.equal(s.endless.flow.version,1);
  assert.equal(s.endless.flow.procs,0);assert.equal(s.endless.pending,0);
  assert.equal(s.endless.flowVersion,undefined);assert.ok(restore(serialize(s)));
 }
});

for(const difficulty of ['normal','wander'])test(`real ${difficulty} kills retain earned progress without PR-only free early drafts`,()=>{
 const result=journey(difficulty),first=restore(result.firstKills);assert.ok(first);
 assert.ok(first.kills>=2);assert.ok(first.endless.roomKills>=2);
 assert.equal(first.endless.flowVersion,undefined);
 assert.equal(result.earlyDrafts,0,'two kills must not emit the rejected extra-draft grant');
 assert.ok(result.s.journal.xp>0,'the journey must actually earn experience');
 assert.ok(result.choices>0,'earned upgrades must still be chosen normally');
 assert.ok(restore(result.firstKills),'a live combat checkpoint must remain resumable');
 assert.equal(restore(serialize(result.s)),null,'a finished and settled run must not resume');
});

test('a genuinely cleared ordinary room rejects invalid choices atomically before legal next-room progress',()=>{
 let s=checkpoint(1);const from=s.endless.floor,map=s.endless.mapIndex,flow={...s.endless.flow};
 assert.equal(s.phase,'upgrade');assert.equal(s.endless.cleared,1);
 const raw=serialize(s);assert.equal(chooseUpgrade(s,'pr4-invented-reward'),false);
 assert.equal(serialize(s),raw,'an illegal reward must not spend or advance anything');
 s=chooseUntil(s,state=>state.endless.floor===from+1);
 assert.equal(s.phase,'playing');assert.equal(s.endless.cleared,1);
 assert.notEqual(s.endless.mapIndex,map);assert.deepEqual(s.endless.flow,flow);
 const advanced=serialize(s);assert.equal(chooseUpgrade(s,'hunt'),false);
 assert.equal(serialize(s),advanced,'a repeated route click must not advance twice');
});

test('the actual fifth-floor boss retains manual reward and route decisions through save/resume',()=>{
 let s=checkpoint(5);assert.equal(s.endless.bosses,1);assert.equal(s.endless.cleared,5);
 assert.equal(s.endless.floor,5);assert.notEqual(s.endless.choice,'route');
 const raw=serialize(s);assert.equal(chooseUpgrade(s,'hunt'),false);assert.equal(serialize(s),raw);
 tick(s,{},.05);assert.equal(s.endless.floor,5,'simulation alone must not auto-advance a boss room');
 s=chooseUntil(s,state=>state.endless.choice==='route');
 assert.equal(s.endless.floor,5);assert.ok(s.endless.relics.length>=1,'the boss reward is earned through a legal offer');
 const resumed=restore(serialize(s));assert.ok(resumed);assert.deepEqual(resumed.offered,s.offered);
 assert.equal(chooseUpgrade(resumed,'hunt'),true);assert.equal(resumed.endless.floor,6);
 assert.equal(resumed.endless.flow.version,1);assert.ok(restore(serialize(resumed)));
});

test('an earned third-floor oath can only be claimed once and keeps its rank after checkpoint',()=>{
 let s=chooseUntil(checkpoint(3),state=>state.endless.choice==='oath');
 const id=recommendedChoice(s),before=oathRank(s,id);assert.ok(id&&s.offered.includes(id));
 const raw=serialize(s);assert.equal(chooseUpgrade(s,'pr4-invented-oath'),false);assert.equal(serialize(s),raw);
 assert.equal(chooseUpgrade(s,id),true);assert.equal(oathRank(s,id),before+1);
 s=restore(serialize(s));assert.ok(s);assert.equal(oathRank(s,id),before+1);
 const claimed=serialize(s);assert.equal(chooseUpgrade(s,id),false);assert.equal(serialize(s),claimed);
});

test('main never adds the rejected playing-state pause retirement after a legitimately earned room',()=>{
 const s=chooseUntil(checkpoint(1),state=>state.endless.floor===2);
 assert.equal(s.phase,'playing');assert.equal(s.endless.cleared,1);
 const raw=serialize(s);assert.equal(retireEndless(s),false);
 assert.equal(serialize(s),raw);assert.equal(s.endless.retired,false);
});

test('a real earned live draft keeps its held clock and identity across saves and expires only once',()=>{
 let s=checkpoint(1);const clock=ensureDraft(s),key=clock.key,offered=[...s.offered];
 assert.equal(clock.duration,4);assert.equal(stepDraft(s,.125),null);
 assert.equal(toggleDraft(s),true);const remaining=s.selection.remaining;
 s=restore(serialize(s));assert.ok(s);assert.equal(s.selection.key,key);
 assert.equal(s.selection.held,true);assert.deepEqual(s.offered,offered);
 for(let i=0;i<20;i++)assert.equal(stepDraft(s,.25),null);
 assert.equal(s.selection.remaining,remaining);assert.equal(s.endless.flow.version,1);
 assert.equal(toggleDraft(s),false);let expired=null;
 for(let i=0;i<16;i++)expired=stepDraft(s,.25)||expired;
 assert.ok(expired&&s.offered.includes(expired.id));assert.equal(expired.key,key);
 assert.equal(stepDraft(s,.25),null,'the expired draft must not select twice');
 assert.equal(chooseUpgrade(s,expired.id),true);assert.ok(restore(serialize(s)));
});

test('mixed live-draft, Flow and anti-idle checkpoints reject malformed fields without accepting partial state',()=>{
 const base=checkpoint(1);ensureDraft(base);const raw=serialize(base);assert.ok(restore(raw));
 for(const kind of ['charger','sniper','bulwark']){
  const copy=restore(raw);assert.ok(copy);copy.encountered.push(kind);
  assert.ok(restore(serialize(copy)),`the existing ${kind} archetype must be valid in encounter history`);
 }
 for(const corrupt of [
  s=>{s.endless.stillness={x:s.player.x,y:s.player.y,seconds:Infinity,cooldown:1};},
  s=>{s.endless.stillness={x:s.player.x,y:s.player.y,seconds:1,cooldown:-1};},
  s=>{s.endless.stillness={x:s.player.x,y:s.player.y,seconds:21,cooldown:1};},
  s=>{s.endless.flow.version=2;},
  s=>{s.endless.flow.boostUntil=Infinity;},
  s=>{s.endless.draftSerial=-1;},
  s=>{s.selection.remaining=s.selection.duration+.01;},
  s=>{s.selection.key+=':stale';},
  s=>{s.encountered.push('pr4-invented-enemy');},
 ]){
  const copy=restore(raw);assert.ok(copy);corrupt(copy);assert.equal(restore(serialize(copy)),null);
 }
 assert.ok(restore(raw),'rejected malformed copies must not corrupt the original checkpoint');
});

test('historical v1.5.1 checkpoints remain frozen drafts and never acquire fresh Flow or draftSerial opt-ins',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/v1.5.1-endless.json',import.meta.url),'utf8'));
 for(const fixture of fixtures.records){
  let s=restore(fixture.raw);assert.ok(s);
  assert.equal(s.endless.flow,undefined);assert.equal(s.endless.draftSerial,undefined);
  s=restore(serialize(s));assert.ok(s);
  assert.equal(s.endless.flow,undefined);assert.equal(s.endless.draftSerial,undefined);
  for(let i=0;i<200&&s.phase!=='upgrade';i++)tick(s,{x:Math.cos(i/30),y:Math.sin(i/30)},.05);
  if(s.phase==='upgrade'){
   const clock=ensureDraft(s);assert.equal(clock.duration,s.endless.choice==='route'?12:8);
   const before=s.totalTime;tick(s,{x:1},.05);assert.equal(s.totalTime,before);
   assert.ok(restore(serialize(s)));
  }
 }
});
