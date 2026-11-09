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

test('staying still in standard endless triggers repeated warned hits',()=>{
 const s=createGame({seed:982,mode:'endless',starter:'cinder'});
 const result=simulate(s);
 assert.ok(result.warnings>=2,'stationary warnings repeat after a cooldown');
 assert.ok(result.hits>30,'warned zones eventually cause damage');
 assert.ok(restore(serialize(s)),'pressure state survives validated saving');
});

test('moving prevents anti-idle tracking warnings',()=>{
 const s=createGame({seed:982,mode:'endless',starter:'cinder'});
 assert.equal(simulate(s,{move:true}).warnings,0);
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
