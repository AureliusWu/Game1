import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HitFeedback,impactPose} from '../dist/feedback.mjs';
import {Renderer} from '../dist/render.mjs';

test('ordinary hits stay fluid; strong simultaneous hits request a single bounded pause',()=>{
 const clock=new HitFeedback();assert.equal(clock.react([{type:'impact'},{type:'death'}]),0);
 clock.react(Array.from({length:30},()=>({type:'impact',heavy:true})));
 assert.equal(clock.hold,.024);clock.react([{type:'death',boss:true}]);
 assert.ok(Math.abs(clock.hold-.058)<1e-8);assert.ok(Math.abs(clock.advance(.1)-.042)<1e-8);
 assert.equal(clock.hold,0);
});

for(const hz of [30,60,120])test(`sustained impacts at ${hz} Hz cannot lock the simulation or accumulate time debt`,()=>{
 const clock=new HitFeedback(),dt=1/hz;let played=0,wall=0;
 for(let i=0;i<hz*20;i++){
  clock.react([{type:'impact',heavy:true},{type:'dash-hit',hits:8},{type:'death',boss:true}]);
  const step=clock.advance(dt);played+=step;wall+=dt;
  assert.ok(step>=0&&step<=dt);assert.ok(clock.hold<=.058+1e-8);assert.ok(clock.budget>=0);
 }
 assert.ok(clock.frozen<=.075+wall*.1+1e-8);assert.ok(played>wall*.89);
 for(let i=0;i<20;i++)clock.advance(dt);assert.equal(clock.hold,0);assert.equal(clock.advance(dt),dt);
});

test('disabled feedback cancels immediately and a reset cannot leak a previous run pause',()=>{
 const clock=new HitFeedback();clock.react([{type:'death',boss:true}]);
 assert.equal(clock.advance(.016,{enabled:false}),.016);assert.equal(clock.hold,0);
 assert.equal(clock.react([{type:'death',boss:true}],{enabled:false}),0);
 clock.reset();assert.equal(clock.hold,0);assert.equal(clock.frozen,0);assert.equal(clock.stops,0);
 assert.equal(clock.advance(NaN),0);assert.equal(clock.advance(-1),0);
});

test('directional impact compression rebounds, stays finite and settles at rest',()=>{
 assert.ok(impactPose(0,1).x<1);let rebound=false;
 for(let age=0;age<.3;age+=.001){const pose=impactPose(age,100);rebound||=pose.x>1;assert.ok(pose.x>.7&&pose.x<1.3);assert.ok(pose.y>.8&&pose.y<1.2);assert.ok(pose.offset>=0&&pose.offset<=6);}
 assert.equal(rebound,true);assert.deepEqual(impactPose(.22),{x:1,y:1,offset:0});
});

test('dense kill feedback is bounded and does not mutate combat events or actors',()=>{
 const renderer=Object.create(Renderer.prototype);Object.assign(renderer,{particles:[],impacts:[],recoils:new Map(),trails:[],deathBursts:[],lowMotion:false,shake:0});
 const events=[];for(let i=0;i<100;i++)events.push({type:'impact',enemyId:i,x:100,y:100,heavy:true},{type:'death',id:i,x:100,y:100});
 const before=structuredClone(events),s={player:{x:50,y:100},endless:{starter:'thunder'}};
 renderer.react(events,s);assert.deepEqual(events,before);assert.equal(renderer.recoils.size,48);
 assert.equal(renderer.deathBursts.length,16);assert.ok(renderer.particles.length<=220);assert.ok(renderer.impacts.length<=48);
 renderer.lowMotion=true;renderer.trails.push({x:10,y:10,life:.2});renderer.drawTrail({},s,.016);assert.equal(renderer.trails.length,0);
});
