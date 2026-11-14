import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {ART_FILES,SPRITES,ENEMY_SPRITES,GROUND_SPRITES,STORY_GROUNDS,registerArt,drawSprite,skillIcon} from '../dist/art.mjs';
import {WORLD_ART_FILES} from '../dist/world-art.mjs';
import {BESTIARY,GEAR} from '../dist/content.mjs';
import {SKILLS,RELICS} from '../dist/endless.mjs';
import {createGame,serialize,restore} from '../dist/core.mjs';
import {Renderer,drawTitle,drawResidentPortrait} from '../dist/render.mjs';

test('every shipped monster, boss, gear, passive and relic has a bounded, nonempty atlas crop',()=>{
 for(const b of BESTIARY)assert.ok(SPRITES[b.id==='boss'?'boss-0':ENEMY_SPRITES[b.id]],b.id);
 for(let i=0;i<5;i++)assert.ok(SPRITES['boss-'+i]);
 assert.equal(new Set(GROUND_SPRITES).size,7);assert.equal(new Set(STORY_GROUNDS).size,3);
 for(const item of [...GEAR,...SKILLS.filter(x=>x.kind==='passive'),...RELICS])assert.ok(SPRITES[item.id],item.id);
 for(const [id,{src,box:[x,y,w,h]}]of Object.entries(SPRITES)){
  assert.ok(ART_FILES.includes(src),id);const [iw,ih]=WORLD_ART_FILES[src];
  assert.ok([x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=iw&&y+h<=ih,id);
 }
});

test('all three resident dialogue portraits keep their painted ears, antlers and feet inside the frame',()=>{
 const src=SPRITES['resident-0'].src,[width,height]=WORLD_ART_FILES[src];registerArt(src,{src,width,height});
 for(let index=0;index<3;index++){
  let m={x:0,y:0,sx:1,sy:1};const stack=[],bounds=[];
  const target={save(){stack.push({...m});},restore(){m=stack.pop();},translate(x,y){m.x+=x*m.sx;m.y+=y*m.sy;},scale(x,y){m.sx*=x;m.sy*=y;},
   createRadialGradient:()=>({addColorStop(){}}),
   drawImage(img,...args){const [x,y,w,h]=args.slice(4);bounds.push({x:m.x+x*m.sx,y:m.y+y*m.sy,w:w*m.sx,h:h*m.sy});}};
  const c=new Proxy(target,{get:(o,k)=>k in o?o[k]:()=>{}});
  drawResidentPortrait({width:144,height:144,getContext:()=>c},index);
  assert.equal(bounds.length,1);const b=bounds[0];
  assert.ok(b.x>=8&&b.y>=8&&b.x+b.w<=136&&b.y+b.h<=136,JSON.stringify({index,...b}));
 }
});

test('immutable atlas evidence matches the exact shipped WebP bytes and offline cache',()=>{
 const audit=JSON.parse(fs.readFileSync(new URL('../docs/art/v1.12-assets.json',import.meta.url)));
 const sw=fs.readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
 for(const asset of audit.assets){
  const bytes=fs.readFileSync(new URL('../'+asset.file,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.file);
  assert.equal(bytes.length,asset.bytes);assert.match(bytes.toString('ascii',0,4),/^RIFF$/);
  assert.ok(sw.includes("'./"+asset.file.slice(5)+"'"),asset.file);
 }
});

test('unavailable atlas images keep a safe fallback; decoded crops retain source coordinates and aspect',()=>{
 const calls=[],c={drawImage(...args){calls.push(args);}};
 assert.equal(drawSprite(c,'shade',10,20,100,80),false);
 const sprite=SPRITES.shade,[iw,ih]=WORLD_ART_FILES[sprite.src],img={width:iw,height:ih};registerArt(sprite.src,img);
 assert.equal(drawSprite(c,'shade',10,20,100,80),true);
 const call=calls[0];assert.equal(call[0],img);assert.deepEqual(call.slice(1,5),sprite.box);
 assert.ok(Math.abs(call[7]/call[8]-sprite.box[2]/sprite.box[3])<1e-10);
 assert.ok(call[5]>=10&&call[6]>=20&&call[5]+call[7]<=110.00001&&call[6]+call[8]<=100.00001);
 assert.equal(drawSprite(c,'unknown-art',0,0,40),false);
 assert.match(skillIcon('magnet','star'),/world-charms.webp/);assert.match(skillIcon('unknown-art','star'),/svg/);
});

// Canvas contract probe. Pixel appearance is separately inspected with the real renderer.
test('all seven arenas, story props and five bosses draw shipped art without mutating simulation or RNG',()=>{
 const calls=[];
 function canvas(w=800,h=400){
  const gradient=()=>({addColorStop(){}}),target={drawImage(img,...args){calls.push({src:img.src,args});},createLinearGradient:gradient,createRadialGradient:gradient,measureText:t=>({width:String(t).length*7})};
  const ctx=new Proxy(target,{get:(o,k)=>k in o?o[k]:()=>{}});
  return {width:w,height:h,getContext:()=>ctx,getBoundingClientRect:()=>({width:w,height:h})};
 }
 for(const src of ART_FILES){const [width,height]=WORLD_ART_FILES[src]||[512,512];registerArt(src,{src,width,height});}
 const oldWindow=globalThis.window,oldDocument=globalThis.document;
 globalThis.window={devicePixelRatio:1};globalThis.document={createElement:()=>canvas()};
 try{
  for(let map=0;map<7;map++){
   let s;for(let seed=1;seed<1000;seed++){const run=createGame({seed,mode:'endless'});if(run.endless.mapIndex===map){s=run;break;}}
   s.enemies=BESTIARY.map((b,i)=>({kind:b.id,id:800+i,x:600+i*35,y:650,r:25,hp:80,maxHp:100,stun:0,warning:0,cast:0,bossType:map%5}));
   const before=serialize(s),r=new Renderer(canvas(),null);r.draw(s,0);
   assert.equal(serialize(s),before);assert.equal(r.sceneArt,GROUND_SPRITES[map]);assert.equal(r.paintedGround,true);
  }
  const story=createGame({seed:3}),before=serialize(story),r=new Renderer(canvas(),null);r.draw(story,0);assert.equal(serialize(story),before);
  const legacyFixture=JSON.parse(fs.readFileSync(new URL('./fixtures/v1.1.1-compat.json',import.meta.url)));
  for(const saved of [legacyFixture.before,legacyFixture.after]){
   const legacy=restore(JSON.stringify(saved));assert.ok(legacy);assert.equal(legacy.rulesVersion,111);assert.equal(legacy.v12,undefined);
   const before=serialize(legacy),r=new Renderer(canvas(),null);r.draw(legacy,0);
   assert.equal(serialize(legacy),before);assert.equal(r.sceneArt,STORY_GROUNDS[legacy.chapter]);
  }

  for(let i=0;i<3;i++)drawResidentPortrait(canvas(144,144),i);
  drawTitle(canvas(680,640),0,true);
  for(const name of ['enemies','bosses','props','decor','residents','grounds-a','grounds-b','title'])assert.ok(calls.some(x=>x.src==='./world-'+name+'.webp'),name);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
