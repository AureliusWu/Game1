import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,chooseUpgrade,serialize,restore,dash,pulse} from '../dist/core.mjs';
import {advanceEndlessChoices,onEndlessKill,oathRank,OATHS,choiceInfo,rerollEndless} from '../dist/endless.mjs';
import {recommendedChoice,stepDraft} from '../dist/draft.mjs';
const game=(starter='cinder')=>createGame({seed:3194,mode:'endless',starter});
const foe=(id,x=970)=>({id,x,y:690,r:20,hp:1000,maxHp:1000,warning:0,stun:0,kind:'shade'});
const cleared=(s,n)=>{s.endless.floor=n;s.chapter=(n-1)%3;s.endless.remaining=0;s.enemies=[];s.endless.clearedRoom=false;s.endless.pending=0;s.endless.rewardPending=false;s.phase='playing';advanceEndlessChoices(s);};
test('floor three offers exactly one safe, persistent oath before next route',()=>{
 const s=game();cleared(s,3);assert.equal(s.endless.oaths.offerPending,true);
 assert.equal(s.endless.choice,'skill');assert.equal(s.offered.length,3);
 let guard=0;while(s.endless.choice==='skill'&&guard++<20)assert.ok(chooseUpgrade(s,s.offered[0]));
 assert.equal(s.endless.choice,'oath');assert.equal(s.offered.length,3);assert.ok(s.offered.includes('ember'));
 assert.equal(recommendedChoice(s),'ember');assert.equal(rerollEndless(s),false);
 const copy=restore(serialize(s));assert.ok(copy);assert.equal(copy.endless.choice,'oath');
 assert.ok(chooseUpgrade(copy,'ember'));assert.equal(oathRank(copy,'ember'),1);assert.equal(copy.endless.choice,'route');
 assert.equal(chooseUpgrade(copy,'ember'),false);assert.equal(oathRank(copy,'ember'),1);assert.ok(restore(serialize(copy)));
});
test('oaths unlock only once per three floors, repeat ranks and stop at 3',()=>{
 const s=game('orbit');assert.equal(oathRank(s,'gale'),0);
 s.endless.oaths.ranks={ember:3,gale:2,storm:3,frost:3,ward:3};
 cleared(s,3);while(s.endless.choice==='skill')chooseUpgrade(s,s.offered[0]);
 assert.deepEqual(s.offered,['gale']);assert.equal(recommendedChoice(s),'gale');
 assert.ok(chooseUpgrade(s,'gale'));assert.equal(oathRank(s,'gale'),3);
 assert.equal(s.endless.choice,'route');
 assert.ok(chooseUpgrade(s,'hunt'));cleared(s,6);while(s.endless.choice==='skill')chooseUpgrade(s,s.offered[0]);
 assert.equal(s.endless.choice,'route');assert.ok(restore(serialize(s)));
});
test('ember explosions affect nearby enemies and upgrade into persistent fire pools',()=>{
 const s=game();s.endless.oaths.ranks.ember=1;s.kills=6;
 s.enemies=[foe(11,980),foe(12,1400)];const e=foe(10,970);e.hp=0;s.enemies.push(e);
 onEndlessKill(s,e);assert.ok(s.enemies[0].hp<1000);assert.equal(s.enemies[1].hp,1000);
 assert.equal(s.endless.pools.length,0);assert.ok(s.events.some(ev=>ev.type==='oath-proc'&&ev.id==='ember'));
 s.endless.ranks.cinder=3;s.kills=12;onEndlessKill(s,e);assert.equal(s.endless.pools.length,1);
});
test('gale dash deals damage and amplifies with orbit without free unlimited dashes',()=>{
 const make=(orbit=1)=>{const s=game('orbit');s.endless.ranks.orbit=orbit;s.endless.oaths.ranks.gale=1;s.enemies=[foe(1,960)];return s;};
 const normal=make();assert.equal(dash(normal),true);const n=1000-normal.enemies[0].hp;
 const linked=make(3);assert.equal(dash(linked),true);const l=1000-linked.enemies[0].hp;
 assert.ok(n>0&&l>n);assert.equal(dash(linked),false);
 assert.ok(linked.player.dashCd>0);assert.ok(linked.events.some(ev=>ev.type==='oath-proc'&&ev.id==='gale'));
});
test('storm pulse deals chain damage with extra hops and thunder synergy',()=>{
 const s=game('thunder');s.endless.oaths.ranks.storm=1;s.enemies=[0,1,2,3,4,5].map(i=>foe(i,1000+i*55));
 assert.ok(pulse(s));const hits=s.enemies.filter(e=>e.hp<1000).length;assert.ok(hits>=2);
 const linked=game('thunder');linked.endless.oaths.ranks.storm=1;linked.endless.ranks.thunder=3;linked.enemies=[0,1,2,3,4,5].map(i=>foe(i,1000+i*55));
 assert.ok(pulse(linked));assert.ok(linked.enemies.filter(e=>e.hp<1000).length>=hits);
});
test('legacy saves remain without oaths; corrupted oath payloads are rejected',()=>{
 const old=game();delete old.endless.oaths;
 assert.ok(restore(serialize(old)));cleared(old,3);while(old.endless.choice==='skill')chooseUpgrade(old,old.offered[0]);assert.equal(old.endless.choice,'route');
 old.kills=6;old.enemies=[foe(21),{...foe(22),hp:0}];onEndlessKill(old,old.enemies[1]);assert.equal(old.enemies[0].hp,1000);
 for(const alter of [s=>s.endless.oaths.ranks.ember=4,s=>s.endless.oaths.ranks.mystery=1,s=>s.endless.oaths.offerPending='yes',s=>s.endless.oaths.version=2]){
  const s=game();alter(s);assert.equal(restore(serialize(s)),null);
 }
});
test('oath draft countdown auto-selects a legal starter-linked oath',()=>{
 const s=game('thunder');s.endless.pending=0;s.endless.clearedRoom=true;s.endless.oaths.offerPending=true;advanceEndlessChoices(s);
 assert.equal(s.endless.choice,'oath');assert.equal(recommendedChoice(s),'storm');
 let chosen=null;for(let i=0;i<32;i++)chosen=stepDraft(s,.25)||chosen;
 assert.equal(chosen?.id,'storm');assert.equal(chosen?.key,s.selection.key);
});
