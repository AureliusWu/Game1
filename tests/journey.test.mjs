import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playJourney} from './journey-bot.mjs';
import {createGame,tick,collides,restore,serialize} from '../dist/core.mjs';
for(const difficulty of ['wander','normal','night'])for(const seed of [71,497,20261106])test(`complete real journey: ${difficulty}, seed ${seed}`,()=>{
  // Navigation-only bot collects actual pickups, pays lamp costs, fights with real damage,
  // selects offered upgrades, defeats the boss and walks through the final gate. No teleporting.
  const result=playJourney(seed,difficulty);
  assert.equal(result.phase,'won',JSON.stringify({...result,state:undefined}));
  assert.equal(result.beacons,9);assert.equal(result.milestones.length,2);assert.ok(result.kills>0);assert.ok(result.time<180);assert.ok(result.score>5000);
});
test('boss spawn honors its full collision radius at borders and cover',()=>{
  for(let seed=1;seed<=100;seed++){
    const s=createGame({seed});s.chapter=2;s.beacons.forEach(b=>b.lit=true);tick(s,{},.05);
    const boss=s.enemies.find(e=>e.kind==='boss');assert.ok(boss);assert.equal(collides(s,boss.x,boss.y,boss.r),false,`Boss blocked for seed ${seed}`);
  }
});
test('incomplete save schemas are rejected before entering the renderer',()=>{
  for(const key of ['speed','pulseCd','dashMax','aimX','pickup']){const s=createGame();delete s.player[key];assert.equal(restore(serialize(s)),null);}
  const s=createGame();s.enemies.push({x:200,y:300});assert.equal(restore(serialize(s)),null);
});
