import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore} from '../dist/core.mjs';
import {updateEndlessCombat} from '../dist/endless.mjs';

function simulate(s,{move=false,duration=12}={}){
 let warnings=0,hits=0;
 for(let i=0;i<duration*20;i++){
  s.totalTime+=.05;
  s.events=[];
  if(move)s.player.x+=4;
  updateEndlessCombat(s,.05,{spawn:()=>false,hurt:(_state,amount)=>{hits+=amount;}});
  warnings+=s.events.filter(e=>e.type==='pressure-warning').length;
 }
 return {warnings,hits};
}

test('standing still with no enemies never produces tracking hazards or damage',()=>{
 for(const difficulty of ['normal','night'])for(const weather of ['calm','storm']){
  const s=createGame({seed:982,mode:'endless',starter:'cinder',difficulty});s.endless.weather=weather;
  const result=simulate(s,{duration:30});assert.equal(result.warnings,0);assert.equal(result.hits,0);assert.equal(s.endless.zones.length,0);
  assert.ok(restore(serialize(s)));
 }
});
test('queued tracking strikes from an existing modern save are canceled',()=>{
 const s=createGame({seed:982,mode:'endless'});delete s.endless.encounters;
 s.endless.stillness={x:940,y:690,seconds:4,cooldown:0};s.endless.zones=[{x:940,y:690,r:85,warning:.01,pressure:true}];
 const loaded=restore(serialize(s));assert.ok(loaded);const result=simulate(loaded);
 assert.equal(result.hits,0);assert.equal(result.warnings,0);assert.equal(loaded.endless.zones.length,0);
});

test('Wander and legacy endless runs remain free of new anti-idle hazards',()=>{
 const wander=createGame({seed:982,mode:'endless',difficulty:'wander'});
 const legacy=createGame({seed:982,mode:'endless'});
 delete legacy.endless.draftSerial;
 assert.equal(simulate(wander).warnings,0);
 assert.equal(simulate(legacy).warnings,0);
});

test('malformed pressure state is rejected on restore',()=>{
 for(const corrupt of [
  s=>{s.endless.stillness={x:Infinity,y:0,seconds:0,cooldown:0};},
  s=>{s.endless.stillness={x:0,y:0,seconds:0,cooldown:-1};},
  s=>{s.endless.zones.push({x:100,y:100,r:85,warning:1,pressure:'yes'});}
 ]){
  const s=createGame({seed:982,mode:'endless'});
  corrupt(s);
  assert.equal(restore(serialize(s)),null);
 }
});
