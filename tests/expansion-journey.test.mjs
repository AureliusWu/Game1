import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playJourney} from './journey-bot.mjs';
import {createProfile,recordProgress,readProfile} from '../dist/progress.mjs';
for(const share of [false,true])for(const difficulty of ['wander','normal','night'])test(`full expansion journey: ${difficulty}, ${share?'shared light':'promised delivery'}`,()=>{
 const {state:s,...r}=playJourney(497,difficulty,{systems:true,share,challenge:true,resume:true});
 assert.equal(r.phase,'won');assert.equal(s.story.ending,share?'hearth':'letters');assert.equal(s.metrics.deliveries,3);
 assert.equal(s.metrics.chests,3);assert.equal(s.metrics.events,3);assert.equal(s.metrics.purchases,3);assert.ok(s.metrics.forges>=1);
 assert.ok(s.journal.level>=6);assert.ok(s.contract.complete);assert.equal(s.litTotal,9);assert.ok(r.time<240);
 const p=createProfile();recordProgress(p,s,{final:true});
 for(const id of ['first-light','district','treasure','shopper','smith','letters','courier','dawn','level'])assert.ok(p.achievements.includes(id),id);
 const restored=readProfile(JSON.stringify(p)),before=restored.stamps;recordProgress(restored,s,{final:true});assert.equal(restored.stamps,before);assert.equal(restored.totals.runs,1);assert.equal(restored.letters.length,3);
});
test('the original direct route remains a distinct, achievable ending',()=>{const {state:s,phase}=playJourney(71);assert.equal(phase,'won');assert.equal(s.story.ending,'dawn');assert.equal(s.metrics.deliveries,0);});
