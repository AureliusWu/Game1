import test from 'node:test';
import assert from 'node:assert/strict';
import {planJobs} from '../scripts/ci-plan.mjs';
const main={event:'push',ref:'refs/heads/main',tagExists:true};
test('new unpublished versions build all platforms before release and Pages',()=>{
 const p=planJobs({...main,tagExists:false,changed:['package.json']});
 assert.deepEqual(p,{web:true,android:true,windows:true,release:true,deploy_web:true,sign_android:true});
});
test('native QA and desktop-only edits skip unrelated platform jobs',()=>{
 const a=planJobs({...main,message:'[qa-only] stabilize native test',changed:['android/app/src/androidTest/Smoke.java']});
 assert.equal(a.android,true);assert.equal(a.windows,false);assert.equal(a.web,false);assert.equal(a.release,false);
 const w=planJobs({...main,changed:['scripts/smoke_windows.ps1']});
 assert.equal(w.android,false);assert.equal(w.windows,true);assert.equal(w.deploy_web,false);
});
test('rules-only tests run the shared quality job without native rebuilds',()=>{
 const p=planJobs({...main,changed:['tests/core.test.mjs']});
 assert.equal(p.android,false);assert.equal(p.windows,false);assert.equal(p.web,false);assert.equal(p.release,false);
});
test('shared runtime edits validate both native packages',()=>{
 const p=planJobs({...main,changed:['dist/app.mjs']});
 assert.equal(p.android,true);assert.equal(p.windows,true);assert.equal(p.deploy_web,true);
});
test('pull requests never publish or request Android signing',()=>{
 const p=planJobs({event:'pull_request',ref:'refs/pull/12/merge',changed:['dist/app.mjs']});
 assert.equal(p.android,true);assert.equal(p.windows,true);assert.equal(p.release,false);assert.equal(p.sign_android,false);assert.equal(p.deploy_web,false);
});
test('manual target check does not accidentally publish a missing version',()=>{
 const p=planJobs({...main,event:'workflow_dispatch',tagExists:false,target:'check'});
 assert.deepEqual(p,{web:false,android:false,windows:false,release:false,deploy_web:false,sign_android:false});
});
test('manual web deploy can repair Pages without rebuilding or replacing packages',()=>{
 const p=planJobs({...main,event:'workflow_dispatch',target:'web'});
 assert.equal(p.deploy_web,true);assert.equal(p.android,false);assert.equal(p.windows,false);assert.equal(p.release,false);
});
test('manual dry run builds all packages without external publication',()=>{
 const p=planJobs({...main,event:'workflow_dispatch',tagExists:false,target:'all',publish:false});
 assert.equal(p.android,true);assert.equal(p.windows,true);assert.equal(p.web,true);
 assert.equal(p.release,false);assert.equal(p.sign_android,false);assert.equal(p.deploy_web,false);
});
