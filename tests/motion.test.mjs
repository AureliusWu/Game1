import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionTracker,REST_POSE} from '../dist/motion.mjs';

test('stationary actor stays at rest',()=>{
 const t=new MotionTracker();t.beginFrame();assert.deepEqual(t.sample('p',10,20,1/60),REST_POSE);
 t.beginFrame();assert.deepEqual(t.sample('p',10,20,1/60),REST_POSE);
});
test('motion leans and compresses without affecting coordinates',()=>{
 const t=new MotionTracker();t.beginFrame();t.sample('p',0,0,1/60);
 t.beginFrame();const p=t.sample('p',4,0,1/60);
 assert.ok(p.tilt>0&&p.tilt<=.1&&p.bob<0&&p.bob>=-4.01);
 assert.ok(p.scaleX>1&&p.scaleY<1);assert.deepEqual([t.actors.get('p').x,t.actors.get('p').y],[4,0]);
});
test('dash adds a distinct stretching silhouette',()=>{
 const t=new MotionTracker();t.beginFrame();t.sample('p',0,0,1/60);
 t.beginFrame();const before=t.sample('p',2,0,1/60);
 t.beginFrame();const dash=t.sample('p',4,0,1/60,{dash:true});
 assert.ok(dash.scaleX>before.scaleX&&dash.scaleY<before.scaleY);
});
test('windup adds a readable anticipation pose',()=>{
 const t=new MotionTracker();t.beginFrame();t.sample('e',10,12,1/60);
 t.beginFrame();const p=t.sample('e',11,12,1/60,{windup:true});
 assert.ok(p.scaleX>1&&p.scaleY<1);
});
test('teleports and room changes reset previous gait',()=>{
 const t=new MotionTracker();t.beginFrame();t.sample('p',0,0,1/60);
 t.beginFrame();t.sample('p',4,0,1/60);
 t.beginFrame();assert.deepEqual(t.sample('p',300,0,1/60),REST_POSE);
 t.clear();assert.equal(t.actors.size,0);
});
test('low-motion preference drops all animated offsets',()=>{
 const t=new MotionTracker();t.beginFrame();t.sample('p',0,0,1/60);
 t.beginFrame();t.sample('p',4,0,1/60);
 assert.deepEqual(t.sample('p',5,0,1/60,{lowMotion:true,dash:true}),REST_POSE);
 assert.equal(t.actors.size,0);
});
test('tracker evicts stale wave actors and caps memory',()=>{
 const t=new MotionTracker(8);
 for(let i=0;i<16;i++){t.beginFrame();t.sample('e'+i,i,0,1/60);}
 assert.equal(t.actors.size,8);
 for(let i=0;i<16;i++)t.beginFrame();
 assert.equal(t.actors.size,0);
});
test('identical frame samples yield identical visual poses',()=>{
 const f=()=>{const t=new MotionTracker(),result=[];for(let i=0;i<20;i++){t.beginFrame();result.push(t.sample('p',i*3,0,1/60,{dash:i>12}));}return result;};
 assert.deepEqual(f(),f());
});
