import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,autoAdvanceEndlessRoom,serialize,restore} from '../dist/core.mjs';
const game=()=>createGame({seed:7891,mode:'endless',starter:'orbit',difficulty:'normal'});
test('ordinary clear automatically resolves rewards and loads next random arena without upgrade dialogs',()=>{
 const s=game(),r=s.endless;r.remaining=0;s.enemies=[];r.pending=2;r.clearedRoom=false;
 const events=tick(s,{},.05);
 assert.equal(r.floor,2);assert.equal(s.phase,'playing');assert.equal(r.choice,'');assert.equal(r.pending,0);
 assert.ok(events.some(e=>e.type==='room-clear'));assert.ok(!events.some(e=>e.type==='upgrade'));
 assert.ok(restore(serialize(s)));
});
test('boss clear still exposes a deliberate build and route choice',()=>{
 const s=game(),r=s.endless;r.floor=5;r.remaining=0;r.pending=0;s.enemies=[];r.clearedRoom=true;r.rewardPending=true;
 assert.equal(autoAdvanceEndlessRoom(s),false);
 assert.equal(r.floor,5);
});
test('mid-room level-up remains available and combat pressure is telegraphed',()=>{
 const s=game();const r=s.endless;
 r.zoneCd=0;const events=tick(s,{},.05);
 assert.ok(r.zones.length>=1);assert.ok(events.some(e=>e.type==='storm-warning'));
 assert.equal(r.zones[0].warning>0,true);
 assert.equal(r.floor,1);
});
