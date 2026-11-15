import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../dist/core.mjs';
import {updateEndlessCombat} from '../dist/endless.mjs';

// Captured by running the immutable v1.7.1 implementation, not recalculated here.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/v1.7.1-wave-contracts.json',import.meta.url),'utf8'));
for(const sample of fixture.cases)test(`v1.7.1 wave: floor ${sample.floor}, ${sample.route}, ${sample.difficulty}`,()=>{
 const s=createGame({seed:1301,mode:'endless',difficulty:sample.difficulty});
 for(const key of ['draftSerial','encounters','flow'])delete s.endless[key];
 Object.assign(s.endless,{floor:sample.floor,route:sample.route,rng:sample.rng,spawnIn:0,remaining:20,weather:'calm'});
 s.enemies=[];const kinds=[];
 updateEndlessCombat(s,.05,{spawn:(_s,kind)=>{kinds.push(kind);return true;},hurt:()=>{}});
 assert.deepEqual(kinds,sample.kinds);
 assert.equal(s.endless.remaining,sample.remaining);
 assert.equal(s.endless.spawnIn,sample.spawnIn);
});
