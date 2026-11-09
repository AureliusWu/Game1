import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,tick,serialize,restore} from '../dist/core.mjs';
test('ordinary room clear retains valid, saved reward offers for UI auto resolution',()=>{
 const s=createGame({seed:7891,mode:'endless',starter:'orbit'});s.endless.remaining=0;s.enemies=[];
 tick(s,{},.05);
 assert.equal(s.endless.cleared,1);
 assert.equal(s.phase,'upgrade');
 assert.ok(restore(serialize(s)));
});
test('UI auto-resolves ordinary rooms only, preserves boss choices and checkpoint',async()=>{
 const source=await readFile(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(source,/run\.endless\.floor%5===0\)return false/);
 assert.match(source,/chooseUpgrade\(run,id\)/);
 assert.match(source,/checkpoint\(\)/);
});
