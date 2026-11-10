import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore} from '../dist/core.mjs';
import {encounterGoal,prepareEnemy,tickEnemy} from '../dist/tactics.mjs';
import {playEndless} from './endless-bot.mjs';
const game=()=>createGame({seed:1301,mode:'endless'});
const actor=(s,kind,id=888)=>{const e={id,kind,x:s.player.x+330,y:s.player.y,r:18,hp:1000,maxHp:1000,speed:60,damage:15,stun:0,warning:0,attack:0,shotCd:2,angle:0};prepareEnemy(s,e);e.aiCd=0;return e;};
test('mixed enemies approach from opposite flanks and ranged enemies hold distance',()=>{
 const s=game();s.obstacles=[];
 const a=actor(s,'shade',887),b=actor(s,'shade',888);
 assert.ok((encounterGoal(s,a).y-s.player.y)*(encounterGoal(s,b).y-s.player.y)<0);
 const caster=actor(s,'caster');caster.x=s.player.x+100;
 const goal=encounterGoal(s,caster);assert.ok(Math.hypot(goal.x-s.player.x,goal.y-s.player.y)>250);
 delete s.endless.encounters;assert.equal(encounterGoal(s,a),s.player);
});
test('sniper locks a readable beam, allows a sidestep and cannot hit through solid cover',()=>{
 for(const response of ['stand','sidestep','cover']){
  const s=game();s.obstacles=[];const e=actor(s,'sniper');s.enemies=[e];let damage=0;
  tickEnemy(s,e,.05,(_s,n)=>damage+=n,()=>{});assert.equal(e.castType,'beam');assert.ok(e.cast>=1.1);assert.equal(damage,0);
  const target=e.castY;if(response==='sidestep')s.player.y+=150;
  if(response==='cover')s.obstacles=[{x:s.player.x+100,y:s.player.y-80,w:70,h:160}];
  const copy=restore(serialize(s));assert.ok(copy);assert.equal(copy.enemies[0].castY,target);
  for(let i=0;i<24;i++)tickEnemy(s,e,.05,(_s,n)=>damage+=n,()=>{});
  assert.equal(e.castY,target);assert.equal(damage>0,response==='stand',response);
 }
});
test('storm pressure is an enemy volley with a windup and ordinary finite projectiles',()=>{
 const s=game();s.endless.weather='storm';const e=actor(s,'caster');let damage=0;
 tickEnemy(s,e,.05,()=>damage++,()=>{});assert.ok(e.cast>0);assert.equal(s.projectiles.length,0);
 for(let i=0;i<20;i++)tickEnemy(s,e,.05,()=>damage++,()=>{});
 assert.equal(damage,0);assert.equal(s.endless.zones.length,0);assert.equal(s.projectiles.length,5);
 assert.ok(s.projectiles.every(b=>b.enemy&&Number.isFinite(b.vx)&&b.life>0));
});
test('actual enemy pressure defeats stationary play while active play clears the first boss across seeds',()=>{
 for(const seed of [1301,1309,1313,982]){
  const idle=playEndless({seed,starter:'cinder',floors:6,maxTime:600,idle:true});
  const active=playEndless({seed,starter:'cinder',floors:6,maxTime:600,resume:true});
  assert.equal(idle.s.phase,'lost',String(seed));assert.equal(idle.s.endless.bosses,0);
  assert.equal(active.s.phase,'won',String(seed));assert.ok(active.s.endless.bosses>=1);assert.ok(active.resumed);
 }
});
