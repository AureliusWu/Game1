import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dash,tick,serialize,restore} from '../dist/core.mjs';
import {flowCharge,flowMultiplier,flowing,breakCombatFlow} from '../dist/combat.mjs';
const game=()=>createGame({seed:98565,mode:'endless',starter:'orbit'});
const foe=(id,x,y)=>({id,x,y,r:20,kind:'shade',hp:1500,maxHp:1500,speed:0,damage:0,stun:0,warning:0,attack:0,shotCd:3,angle:0});
test('dash hits build an earned Flow Burst, with no free healing',()=>{
 const s=game();assert.equal(s.endless.flow.version,1);const hp=s.player.hp;
 s.player.aimX=1;s.player.aimY=0;s.enemies=[0,1,2,3].map(i=>foe(300+i,s.player.x+75+i*15,s.player.y));
 assert.equal(dash(s),true);
 for(let i=0;i<8;i++)tick(s,{x:1,y:0},.05);
 assert.ok(s.endless.combat.dashHits>=4);
 assert.equal(s.endless.flow.procs,1);assert.ok(flowing(s));assert.equal(flowMultiplier(s),1.25);
 assert.equal(s.player.hp,hp);assert.equal(s.endless.flow.chain,0);assert.ok(restore(serialize(s)));
 breakCombatFlow(s);assert.equal(flowMultiplier(s),1);
});
test('flow timer and counter are bounded and rejected when malformed',()=>{
 const s=game(),f=s.endless.flow;f.chain=2;f.chainUntil=s.totalTime+1;assert.equal(flowCharge(s),2);
 s.totalTime+=1.1;assert.equal(flowCharge(s),0);
 f.chain=0;f.boostUntil=s.totalTime+2;assert.equal(flowMultiplier(s),1.25);
 s.totalTime+=2.1;assert.equal(flowMultiplier(s),1);assert.ok(restore(serialize(s)));
 for(const change of [f=>f.chain=4,f=>f.boostUntil=Infinity,f=>f.procs=-1,f=>f.chainUntil=1000000]){const copy=game();change(copy.endless.flow);assert.equal(restore(serialize(copy)),null);}
});
test('historical saves without flow keep their former dash behavior',()=>{
 const s=game();delete s.endless.flow;assert.equal(flowMultiplier(s),1);assert.equal(flowCharge(s),0);
 s.player.aimX=1;s.player.aimY=0;s.enemies=[foe(301,s.player.x+70,s.player.y)];
 dash(s);for(let i=0;i<8;i++)tick(s,{x:1,y:0},.05);
 assert.equal(s.endless.flow,undefined);assert.ok(restore(serialize(s)));
});