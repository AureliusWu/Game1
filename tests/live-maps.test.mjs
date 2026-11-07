import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,chooseUpgrade,dash,pulse,serialize,restore} from '../dist/core.mjs';
import {ENDLESS_MAPS,nextEndlessMap} from '../dist/endless-maps.mjs';
import {blocked,findPath} from '../dist/routes.mjs';
import {liveDraft,advanceEndlessChoices,OATHS,oathRank,endlessEnemy} from '../dist/endless.mjs';
import {ensureDraft,stepDraft} from '../dist/draft.mjs';
import {prepareEnemy,tickEnemy,AFFIXES} from '../dist/tactics.mjs';
const game=(starter='cinder')=>createGame({mode:'endless',starter,seed:8419});
const enemy=(i,x=1000)=>({id:i,x,y:690,kind:'shade',r:18,hp:1000,maxHp:1000,warning:0,stun:0,speed:0,damage:1,attack:0,shotCd:2,angle:0});
test('seven fixed arena geometries and safe lanes; adjacent floors never repeat',()=>{
 assert.equal(ENDLESS_MAPS.length,7);
 const s=game(),seen=new Set();let prev=-1;
 for(let floor=1;floor<=40;floor++){const index=nextEndlessMap(s.seed,floor,prev);assert.ok(index>=0&&index<ENDLESS_MAPS.length);assert.notEqual(index,prev);assert.equal(nextEndlessMap(s.seed,floor,prev),index);prev=index;seen.add(index);}
 assert.ok(seen.size>=6);
 for(const map of ENDLESS_MAPS){const state={obstacles:map.covers.map(([x,y,w,h])=>({x,y,w,h}))};assert.ok(!blocked(state,940,690,18),map.id);
  for(const [x,y] of map.lamps){assert.ok(!blocked(state,x,y,42),map.id);assert.ok(findPath(state,{x:940,y:690},{x,y},18).length>0,map.id);}}
 assert.ok(restore(serialize(s)));
});
test('live picks preserve stable draft key even as combat grants new experience',()=>{
 const s=game();s.endless.pending=1;advanceEndlessChoices(s);
 assert.equal(s.phase,'upgrade');assert.ok(liveDraft(s));const key=ensureDraft(s).key,offered=[...s.offered];
 s.enemies=[enemy(99,1150)];const old=s.player.x;
 for(let i=0;i<20;i++)tick(s,{x:1,y:0},.05);
 assert.ok(s.totalTime>=1);assert.ok(s.player.x>old);assert.ok(s.enemies[0].hp<1000);assert.deepEqual(s.offered,offered);
 s.endless.pending+=2;assert.equal(ensureDraft(s).key,key);assert.ok(dash(s)||s.player.dashCd>0);assert.ok(pulse(s));
 const copy=restore(serialize(s));assert.ok(copy);assert.equal(ensureDraft(copy).key,key);assert.equal(ensureDraft(copy).duration,4);
 let choice=null;for(let i=0;i<16;i++)choice=stepDraft(copy,.25)||choice;
 assert.ok(choice&&copy.offered.includes(choice.id));assert.equal(choice.key,key);
 assert.ok(chooseUpgrade(copy,choice.id));assert.equal(copy.endless.pending,2);
});
test('old endless draft is still frozen and saved eight-second clock remains valid',()=>{
 const s=game();delete s.endless.draftSerial;s.endless.pending=1;advanceEndlessChoices(s);
 assert.equal(liveDraft(s),false);assert.equal(ensureDraft(s).duration,8);const t=s.totalTime;tick(s,{x:1},.05);assert.equal(s.totalTime,t);assert.ok(restore(serialize(s)));
});
test('frost and ward choices are offered and produce distinct combat rules',()=>{
 const s=game('frost');s.endless.remaining=0;s.endless.clearedRoom=true;s.endless.oaths.offerPending=true;advanceEndlessChoices(s);
 assert.equal(s.endless.choice,'oath');assert.ok(s.offered.includes('frost'));assert.ok(s.offered.length<=3);
 const fro=game('frost');fro.endless.oaths.ranks.frost=2;fro.enemies=[enemy(1,1040)];const old=fro.enemies[0].hp;pulse(fro);assert.ok(fro.enemies[0].hp<old);assert.ok(fro.enemies[0].slowUntil>fro.totalTime);
 const ward=game();ward.endless.oaths.ranks.ward=2;ward.endless.ranks.vitality=2;ward.player.hp-=12;const hp=ward.player.hp;pulse(ward);assert.equal(ward.v12.barrier,1);assert.ok(ward.v12.barrierUntil>ward.totalTime);assert.ok(ward.player.hp>hp);assert.equal(oathRank(ward,'ward'),2);assert.equal(OATHS.length,5);
});
test('charger, sniper, bulwark and five bosses telegraph real attacks',()=>{
 const s=game();s.endless.floor=10;s.chapter=0;
 for(const kind of ['charger','sniper','bulwark']){const stats=endlessEnemy(s,kind,{hp:50,r:18,speed:70,damage:12});assert.ok(stats.hp>50);
  const e={...enemy(600,1080),kind,...stats,warning:0,stun:0,aiCd:0,angle:0};s.enemies=[e];prepareEnemy(s,e);e.aiCd=0;
  let hits=0;assert.ok(tickEnemy(s,e,.05,()=>hits++,()=>{}),kind);assert.ok(e.cast>0,kind);assert.equal(hits,0);}
 assert.equal(AFFIXES.length,5);
 for(let type=0;type<5;type++){const e={...enemy(700+type,1000),kind:'boss',bossType:type,hp:300,maxHp:500,aiCd:0};s.enemies=[e];prepareEnemy(s,e);e.aiCd=0;assert.ok(tickEnemy(s,e,.05,()=>{},()=>{}));assert.ok(e.cast>0);}
});
