import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandscapeGate,landscapeViewport} from '../dist/orientation.mjs';
import {ensureDraft,stepDraft,toggleDraft} from '../dist/draft.mjs';

test('landscape rejects portrait and invalid viewport measurements',()=>{
 assert.equal(landscapeViewport(900,500),true);
 for(const [w,h]of [[500,900],[0,0],[Infinity,500],[900,NaN]])assert.equal(landscapeViewport(w,h),false);
});
test('entering portrait checkpoints once; rotating back preserves prior pause state',()=>{
 let size={width:900,height:500},suspensions=0,shown;
 const gate=createLandscapeGate({viewport:()=>size,show:b=>shown=b,suspend:()=>suspensions++});
 assert.equal(gate.check(),false);
 size={width:500,height:900};gate.check();gate.check();
 assert.equal(shown,true);assert.equal(gate.blocked,true);assert.equal(suspensions,1);
 size={width:900,height:500};gate.check();assert.equal(shown,false);assert.equal(suspensions,1);
 size={width:500,height:900};gate.check();assert.equal(suspensions,2);
});
test('unsupported fullscreen and screen locking retain the physical-rotation fallback',async()=>{
 const calls=[];let size={width:400,height:800};
 const gate=createLandscapeGate({viewport:()=>size,show:()=>{},suspend:()=>{},fullscreen:async()=>{calls.push('fullscreen');throw Error('unsupported');},lock:async kind=>{calls.push(kind);throw Error('denied');}});
 assert.equal(await gate.enter(),false);assert.equal(gate.blocked,true);assert.deepEqual(calls,['fullscreen','landscape']);
 size={width:800,height:400};assert.equal(await gate.enter(),true);
});
test('successful native orientation lock clears the portrait gate',async()=>{
 let size={width:400,height:800};
 const gate=createLandscapeGate({viewport:()=>size,show:()=>{},suspend:()=>{},lock:async()=>{size={width:800,height:400};}});
 gate.check();assert.equal(await gate.enter(),true);assert.equal(gate.blocked,false);
});
test('draft visible time freezes in portrait, resumes accurately and retains manual hold',()=>{
 let size={width:800,height:400};
 const gate=createLandscapeGate({viewport:()=>size,show:()=>{},suspend:()=>{}});
 const run={phase:'upgrade',offered:['vitality']};
 const draft=ensureDraft(run);stepDraft(run,.25,{blocked:gate.check()});assert.equal(draft.remaining,11.75);
 size={width:400,height:800};gate.check();
 for(let i=0;i<200;i++)assert.equal(stepDraft(run,.25,{blocked:gate.blocked}),null);
 assert.equal(draft.remaining,11.75);assert.equal(draft.fired,false);
 size={width:800,height:400};gate.check();stepDraft(run,.25,{blocked:gate.blocked});assert.equal(draft.remaining,11.5);
 toggleDraft(run);size={width:400,height:800};gate.check();size={width:800,height:400};gate.check();
 stepDraft(run,.25,{blocked:gate.blocked});assert.equal(draft.held,true);assert.equal(draft.remaining,11.5);
 toggleDraft(run);for(let i=0;i<45;i++)stepDraft(run,.25,{blocked:gate.blocked});
 assert.deepEqual(stepDraft(run,.25,{blocked:gate.blocked}),{id:'vitality',key:draft.key});
 assert.equal(stepDraft(run,.25),null);
});
