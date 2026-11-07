import {followupAvailable} from './narrative.mjs';
import {drawWeapons,drawProjectile,drawBattleEffect,drawEnemyIntent,drawFirePool} from './battlefx.mjs';
import {isTactical,AFFIXES} from './tactics.mjs';
import { WORLD, CHAPTERS, distance, clamp } from './core.mjs';
import {isEndless,orbitPositions,rankOf,evolved} from './endless.mjs';
import {ENDLESS_MAPS} from './endless-maps.mjs';
import {overdriving} from './combat.mjs';
import {NPCS,EVENTS,GEAR_BY_ID} from './content.mjs';
const TAU=Math.PI*2;
const gold='#f8c67a', cream='#f3e2bc';
function circle(c,x,y,r,fill,stroke=null,lw=1){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function line(c,points,color,width=1){c.beginPath();for(let i=0;i<points.length;i++)c[i?'lineTo':'moveTo'](...points[i]);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function round(c,x,y,w,h,r,fill,stroke=null){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');circle(c,x,y,r,g);}
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function drawOwl(c,x,y,scale=1,t=0,facing=1,lit=false){
  c.save();c.translate(x,y);c.scale(scale*facing,scale);
  c.fillStyle='#07171888';c.beginPath();c.ellipse(0,24,22,8,0,0,TAU);c.fill();
  const bob=Math.sin(t*6)*1.4;c.translate(0,bob);
  // Cape, wings, rounded heart-shaped face, little post bag.
  c.fillStyle='#719890';c.beginPath();c.moveTo(-16,-9);c.quadraticCurveTo(-35,9,-25,22);c.lineTo(-10,15);c.fill();
  c.fillStyle='#bfd1bf';c.beginPath();c.moveTo(-19,-13);c.lineTo(-17,-33);c.lineTo(-5,-24);c.quadraticCurveTo(0,-26,8,-24);c.lineTo(21,-33);c.lineTo(20,-10);c.quadraticCurveTo(29,6,17,23);c.quadraticCurveTo(0,35,-18,22);c.quadraticCurveTo(-28,9,-19,-13);c.fill();
  c.fillStyle='#edf0d5';c.beginPath();c.moveTo(0,-12);c.bezierCurveTo(-19,-32,-27,-5,-10,7);c.lineTo(0,17);c.lineTo(11,7);c.bezierCurveTo(28,-5,18,-32,0,-12);c.fill();
  for(const ex of [-10,11]){
    circle(c,ex,-5,7,'#254241');circle(c,ex+1,-5,4.2,lit?'#fff6b8':gold);circle(c,ex+2,-6,2,'#163333');circle(c,ex+2.5,-7,1,'#fff9df');
  }
  c.fillStyle='#dda556';c.beginPath();c.moveTo(-3,3);c.lineTo(4,3);c.lineTo(.5,9);c.fill();
  line(c,[[-8,17],[-4,20],[0,17],[4,20],[8,17]],'#94ada0',1.4);
  line(c,[[-14,0],[16,21]],'#836341',3.5);
  round(c,9,12,17,16,4,'#b77b45','#d3a368');round(c,10,11,16,5,2,'#d29d60');circle(c,18,20,1.3,'#f8e2b5');
  line(c,[[-9,29],[-10,33],[-13,33]],'#e4ad64',2.5);line(c,[[8,29],[9,33],[12,33]],'#e4ad64',2.5);
  c.restore();
}
function drawResident(c,index,x,y,t=0,scale=1){
  c.save();c.translate(x,y);c.scale(scale,scale);
  c.fillStyle='#071c2177';c.beginPath();c.ellipse(0,21,23,8,0,0,TAU);c.fill();
  if(index===2){drawOwl(c,0,0,1,t*.2,-1);round(c,-20,7,39,6,3,'#9d9eb4');}
  else{
    c.translate(0,Math.sin(t*2+index)*1.2);const color=index===0?'#cabc98':'#a6b795';
    round(c,-17,-3,34,33,13,index===0?'#718b84':'#738d6b');
    if(index===0){round(c,-15,-47,9,29,5,color);round(c,5,-47,9,29,5,color);round(c,-12,-42,3,19,2,'#b39280');round(c,8,-42,3,19,2,'#b39280');}
    else{for(const f of [-1,1]){line(c,[[f*13,-25],[f*23,-43],[f*18,-48]],'#b7a785',3);line(c,[[f*22,-40],[f*31,-43]],'#b7a785',2);}}
    circle(c,0,-13,20,color);c.fillStyle='#e4ddbb';c.beginPath();c.ellipse(0,-7,13,12,0,0,TAU);c.fill();
    for(const xx of [-8,8])circle(c,xx,-15,2.2,'#29433e');circle(c,0,-7,2,index===0?'#b78473':'#5f6a50');
    round(c,-20,5,40,6,3,index===0?'#c68e66':'#cec394');line(c,[[10,9],[12,20]],index===0?'#c68e66':'#cec394',5);
    round(c,-7,14,15,10,2,'#d9d0ab');line(c,[[-6,15],[.5,20],[7,15]],'#9d8d69',1);
  }
  c.restore();
}
export function drawResidentPortrait(canvas,index){
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#294d43';c.fillRect(0,0,canvas.width,canvas.height);glow(c,72,70,73,'#d1bb7c33');drawResident(c,index,72,88,0,1.55);
}
function drawPOI(c,p,t,s){
  c.save();if(p.used&&p.kind!=='npc')c.globalAlpha=.5;
  if(!p.used||followupAvailable(s,p))glow(c,p.x,p.y,55,p.kind==='event'?'#b5a7d422':'#c6ca9622');
  if(p.kind==='npc')drawResident(c,p.npc,p.x,p.y,t,.95);
  if(p.kind==='chest'){
    c.translate(p.x,p.y);c.fillStyle='#0d282b88';c.beginPath();c.ellipse(0,15,32,12,0,0,TAU);c.fill();round(c,-25,-12,50,31,5,'#8b7651','#c1b27d');
    round(c,-25,-25,50,24,12,p.used?'#566c56':'#b9a16b','#c1b27d');line(c,[[-17,-23],[-17,18]],'#5f684c',3);line(c,[[17,-23],[17,18]],'#5f684c',3);round(c,-5,-5,10,12,2,p.used?'#66765a':'#dfc582');
  }
  if(p.kind==='shop'){
    c.translate(p.x,p.y);round(c,-36,-19,72,48,5,'#496556','#96a57c');round(c,-40,-53,80,35,4,'#b9b482');
    for(let i=0;i<4;i++)round(c,-35+i*20,-52,9,34,2,'#668d79');line(c,[[-37,-18],[-37,35]],'#7e9172',3);line(c,[[37,-18],[37,35]],'#7e9172',3);
    circle(c,-15,3,7,'#d0b377');round(c,-4,-1,12,17,3,'#a1b493');round(c,16,3,11,14,2,'#d4c298');
  }
  if(p.kind==='risk'){c.translate(p.x,p.y);line(c,[[0,25],[0,-65]],'#c2a16f',4);c.fillStyle='#bd8395';c.beginPath();c.moveTo(0,-65);c.lineTo(39,-52);c.lineTo(0,-35);c.fill();circle(c,0,30,20,null,'#bd839577',2);}
  if(p.kind==='event'){
    c.translate(p.x,p.y);const type=EVENTS[p.event].id;
    if(type==='well'){c.fillStyle='#687c6c';c.beginPath();c.ellipse(0,0,31,20,0,0,TAU);c.fill();c.fillStyle='#193a3f';c.beginPath();c.ellipse(0,-5,22,12,0,0,TAU);c.fill();circle(c,0,-8,5,'#c6b88c');}
    else if(type==='bell'){round(c,-14,-61,28,67,4,'#65776e');circle(c,0,-57,24,'#809087','#c7bb88',2);circle(c,0,-57,19,'#314e4e');line(c,[[0,-72],[0,-57],[10,-52]],'#e0cca2',2);round(c,-22,5,44,12,3,'#87977b');}
    else{round(c,-16,-39,32,42,6,'#789a87','#c3bf8c');round(c,-20,-43,40,9,4,'#a9b58c');round(c,-10,-31,20,5,2,'#233f42');line(c,[[0,3],[0,24]],'#668571',8);}
  }
  c.restore();c.save();c.textAlign='center';c.font='10px sans-serif';
  const label=p.kind==='npc'?NPCS[p.npc].name+(followupAvailable(s,p)?' · 后续来信':p.used?' · 已托付':''):p.kind==='shop'?'夜路杂货铺':p.kind==='chest'?(p.used?'空的失物箱':'失物箱'):p.kind==='risk'?(p.used?'侧巷 · 已进入':'风险支路 · 精英与行装'):EVENTS[p.event].name;
  c.fillStyle=p.used?'#89a18c':'#c4d0ac';c.fillText(label,p.x,p.y+46);c.restore();
}
export function drawBeacon(c,b,t=0,clock=t){
  const lit=b.lit, a=lit?1:.3,suppressed=(b.suppressedUntil||0)>clock;
  c.save();c.translate(b.x,b.y);
  c.fillStyle='#071c2188';c.beginPath();c.ellipse(0,23,53,22,0,0,TAU);c.fill();
  c.fillStyle=lit?'#466664':'#2b4547';c.beginPath();c.ellipse(0,11,43,18,0,0,TAU);c.fill();
  c.fillStyle=lit?'#597f72':'#334d4e';c.beginPath();c.ellipse(0,4,43,18,0,0,TAU);c.fill();
  circle(c,0,0,32,null,lit?'#e8c680':'#597373',1.5);
  for(let i=0;i<8;i++){const ang=i*TAU/8;line(c,[[Math.cos(ang)*28,Math.sin(ang)*15],[Math.cos(ang)*35,Math.sin(ang)*19]],lit?'#d0b87e':'#4a6665',1.5);}
  round(c,-12,-62,24,62,4,lit?'#57746a':'#3a5453');round(c,-20,-68,40,8,3,'#708b77');
  round(c,-17,-104,34,36,5,lit?'#dbb775':'#233b40','#879077');
  if(suppressed){circle(c,0,0,146,null,'#d99eb8',3);c.fillStyle='#efc6d6';c.font='12px sans-serif';c.textAlign='center';c.fillText('回复受压制',0,58);}
  if(lit){glow(c,0,-88,70,suppressed?'#b69cdd55':'#ffc36d66');round(c,-11,-100,22,28,2,'#ffda87');circle(c,0,-87,8,'#fff0b9');}
  for(const xx of [-14,14])line(c,[[xx,-103],[xx,-70]],'#89a08b',2);
  c.fillStyle='#7e8b6d';c.beginPath();c.moveTo(-25,-106);c.lineTo(0,-125);c.lineTo(25,-106);c.closePath();c.fill();
  circle(c,0,-124,3,lit?gold:'#9a9c7c');
  if(!lit){
    if(b.progress>0){c.beginPath();c.arc(0,0,47,-Math.PI/2,-Math.PI/2+TAU*b.progress);c.strokeStyle=gold;c.lineWidth=4;c.stroke();}
    for(let i=0;i<4;i++)circle(c,-15+i*10,38,2.5,i<b.cost?'#ae956c':'#45615c');
  }
  if(lit){for(let i=0;i<3;i++){const an=t*.5+i*2.1;circle(c,Math.cos(an)*38,-90+Math.sin(an)*22,1.5,'#ffe0a4');}}
  c.restore();
}
function drawBuilding(c,o,chapter){
  c.save();c.translate(o.x,o.y);const w=o.w,h=o.h;
  round(c,9,14,w+8,h+15,6,'#071c2166');
  round(c,0,13,w,h-5,4,'#1d373a','#3b5554');
  c.fillStyle=chapter===1?'#41615e':'#3b5654';c.beginPath();c.moveTo(-6,4);c.lineTo(w*.23,-23);c.lineTo(w+5,1);c.lineTo(w+5,h*.53);c.lineTo(-6,h*.53);c.fill();
  line(c,[[-6,h*.53],[w+5,h*.53]],'#58746a',3);
  for(let i=18;i<w-10;i+=30){line(c,[[i,-12+i/w*12],[i,h*.5]],'#496760',1);}
  for(let i=16;i<w-16;i+=36){round(c,i,h*.65,14,17,5,'#152d32','#48605c');}
  round(c,w*.55,h*.63,17,h*.37,7,'#10292e','#3f5854');
  // Moss and little roof gardens.
  for(let i=0;i<5;i++){const x=w*(.12+i*.16);circle(c,x,h*.5,4+i%3,'#517560');}
  c.restore();
}
function drawEnemy(c,e,t,flash=0){
  c.save();c.translate(e.x,e.y);
  if(flash>0)c.scale(1.08,.94);
  if(e.warning>0){circle(c,0,0,e.r*1.6,null,'#ce859a99',1.5);line(c,[[-10,0],[10,0]],'#d89c9c',2);c.globalAlpha=.3;}
  const bob=Math.sin(t*4+e.id)*3;c.translate(0,bob);
  const boss=e.kind==='boss',r=e.r;
  c.fillStyle='#081b26aa';c.beginPath();c.ellipse(0,r*.9,r*1.2,r*.4,0,0,TAU);c.fill();
  if(boss){
    glow(c,0,-10,85,'#b65f8b22');c.fillStyle='#494459';
    c.beginPath();c.moveTo(-20,-10);c.quadraticCurveTo(-70,-60,-86,4);c.lineTo(-27,27);c.fill();
    c.beginPath();c.moveTo(20,-10);c.quadraticCurveTo(70,-60,86,4);c.lineTo(27,27);c.fill();
  }
  c.fillStyle=flash>0?'#fff0c2':e.stun>0?'#8b7c82':boss?['#54445a','#695152','#485c78','#6d5364','#67637d'][e.bossType??0]:e.kind==='bulwark'?'#6c6e7e':e.kind==='charger'?'#ae5f68':e.kind==='sniper'?'#846ab0':e.kind==='brute'?'#4e4a61':e.kind==='caster'?'#76577d':e.kind==='warder'?'#4c6d76':'#2d354b';
  c.beginPath();c.moveTo(-r,-r*.5);c.lineTo(-r*.8,-r*1.35);c.lineTo(-r*.2,-r*.9);c.quadraticCurveTo(0,-r*1.1,r*.3,-r*.9);c.lineTo(r*.9,-r*1.35);c.lineTo(r,-r*.4);c.quadraticCurveTo(r*1.3,r*.7,r*.5,r);c.lineTo(0,r*.7);c.lineTo(-r*.5,r);c.quadraticCurveTo(-r*1.3,r*.7,-r,-r*.5);c.fill();
  c.strokeStyle=flash>0?'#fff5d7':boss?'#ca91ba':'#9d7c9a';c.lineWidth=1.4;c.stroke();
  for(const ex of [-r*.36,r*.36]){circle(c,ex,-r*.18,boss?6:3,'#dc9fbc');circle(c,ex,-r*.18,boss?2.5:1.2,'#3c2545');}
  if(e.kind==='brute'){round(c,-r-5,-r*.1,r*.55,r*.8,4,'#7c6b80','#c0a2af');round(c,r*.5,-r*.1,r*.55,r*.8,4,'#7c6b80','#c0a2af');line(c,[[-r*.6,-r*.7],[0,-r*.35],[r*.6,-r*.7]],'#c4a3b4',3);}
  if(e.kind==='runner'||e.kind==='charger')line(c,[[-r*.6,r*.8],[-r*.4,r*1.5],[r*.3,r*.9]],'#d4a2bd',3);
  if(e.kind==='bulwark'){round(c,-r-5,-r*.2,r*2+10,r*.7,5,'#718f9a88','#b8d9e0');circle(c,0,-r*.2,r*.6,null,'#e2c68a',2);}
  if(e.kind==='sniper')line(c,[[r*.6,-r],[r*1.4,-r*1.6],[r*1.7,-r*.8]],'#d2b1f0',3);
  if(e.kind==='caster')line(c,[[r,12],[r,-35],[r+10,-28],[r,-21]],'#dfc1a4',3);
  if(boss&&e.bossType===1)line(c,[[-r*.7,-r*.8],[0,-r*1.4],[r*.7,-r*.8]],'#f0b492',4);
  if(boss&&e.bossType>=3){circle(c,0,-8,r+13,null,e.bossType===3?'#e7ac97':'#acb4e8',2);}
  if(boss&&e.bossType===2)for(let i=0;i<5;i++){const a=t+i*TAU/5;circle(c,Math.cos(a)*68,Math.sin(a)*38-12,4,'#b6c8ee');}
  if(e.kind==='warder')circle(c,0,0,r+5,null,'#94c4d9',3);
  if(e.patrolElite){circle(c,0,0,r+10,null,'#f0ba83',2);c.fillStyle='#f9d8a5';c.font='bold 10px sans-serif';c.textAlign='center';c.fillText((AFFIXES[e.affix]||'精英')+'·精英',0,-r-25);}
  if(boss){c.save();c.setLineDash([7,6]);circle(c,0,-6,r+24,null,e.enraged?'#ff8ab9':'#baa1d4',2);c.restore();if(e.enraged)runeBoss(c,r,t);}
  if(e.kind==='runner')line(c,[[-r*.7,r*.2],[0,r*.4],[r*.7,r*.2]],'#7c687d',1.5);
  if(e.hp<e.maxHp){round(c,-r,-r-17,r*2,3,2,'#192e34');round(c,-r,-r-17,r*2*Math.max(0,e.hp/e.maxHp),3,2,'#d0a0a8');}
  c.restore();
}
function runeBoss(c,r,t){for(let i=0;i<5;i++){const a=-Math.PI+i*Math.PI/4;line(c,[[Math.cos(a)*(r+15),Math.sin(a)*(r+15)],[Math.cos(a)*(r+27),Math.sin(a)*(r+27)]],'#ffbfd8',3);}}
export class Renderer{
  constructor(canvas,mini){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.mini=mini;this.particles=[];this.shake=0;this.chapter=-1;this.lowMotion=false;this.camera={x:0,y:0};this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const dpr=Math.min(window.devicePixelRatio||1,1.75);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.dpr=dpr;this.zoom=this.w<650?.77:1;this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  buildMap(s){
    this.chapter=s.chapter;this.seed=s.seed;this.floor=s.endless?.floor||0;const map=document.createElement('canvas');map.width=WORLD.width;map.height=WORLD.height;
    const fresh=s.endless?.draftSerial!==undefined,variant=fresh?(s.endless.mapIndex??0):(s.v12.layout??0);
    const c=map.getContext('2d'),rand=rng(9281+s.chapter*477+(fresh?variant*1807+(s.endless.floor||0)*31:0));c.fillStyle=fresh?ENDLESS_MAPS[variant]?.tone||'#193c3d':['#193c3d','#1d383f','#303a40'][s.chapter];c.fillRect(0,0,map.width,map.height);
    // Quiet stone streets and narrow seams.
    for(let y=0;y<WORLD.height;y+=64)for(let x=0;x<WORLD.width;x+=84){
      const off=(y/64)%2*42;const shadeSets=[['#284b48','#264945','#2b4d49','#214542'],['#2c4757','#2a4454','#334e5c','#25404e'],['#3d5351','#354b49','#415957','#2c4345'],['#345843','#30513c','#3c604c','#2b493f'],['#2b4e61','#305468','#26495b','#24485a'],['#4f555a','#464b51','#54575b','#393f49'],['#424459','#3c4052','#4d4a59','#353b4d']];const shades=fresh?shadeSets[variant%shadeSets.length]:shadeSets[0];
      round(c,x-off+2,y+2,80,60,3,shades[Math.floor(rand()*shades.length)]);
      if(rand()>.74)line(c,[[x-off+15,y+15],[x-off+23,y+20],[x-off+19,y+28]],'#183e3d66',1);
    }
    // Planted edges, open paved routes.
    for(let i=0;i<230;i++){
      const x=rand()*WORLD.width,y=rand()*WORLD.height;
      if(x>95&&x<WORLD.width-95&&y>110&&y<WORLD.height-100&&rand()>.1)continue;
      circle(c,x,y,12+rand()*30,'#173a36');circle(c,x-5,y-9,9+rand()*17,'#315647');
    }
    line(c,[[80,80],[1800,80],[1800,1300],[80,1300],[80,80]],'#71907a55',3);
    c.setLineDash([3,12]);line(c,[[80,110],[1800,110]],'#b0b88c66',1);c.setLineDash([]);
    // The brass route runs beneath the city, linking all lanterns.
    c.beginPath();c.moveTo(180,690);for(const b of s.beacons)c.lineTo(b.x,b.y);c.lineTo(s.exit.x,s.exit.y);c.strokeStyle='#b7ad7040';c.lineWidth=3;c.stroke();
    for(const b of s.beacons){circle(c,b.x,b.y,100,'#244b46','#6f876b55');circle(c,b.x,b.y,84,null,'#68836944');
      for(let i=0;i<12;i++){const a=i*TAU/12;circle(c,b.x+Math.cos(a)*95,b.y+Math.sin(a)*95,3,'#a4ac7c55');}}
    // Mailboxes and street stones are decoration, not hidden collisions.
    for(let i=0;i<26;i++){const x=140+rand()*1600,y=140+rand()*1100;if(s.obstacles.some(o=>x>o.x-40&&x<o.x+o.w+40&&y>o.y-40&&y<o.y+o.h+40))continue;
      if(s.beacons.some(b=>distance(b,{x,y})<110))continue;
      circle(c,x,y,3+rand()*4,'#88977944');line(c,[[x-5,y+4],[x+5,y+4]],'#102e2a66',2);}
    this.map=map;
  }
  react(events){for(const e of events){
    if(e.type==='impact'){this.flashes??=new Map();this.flashes.set(e.enemyId,.09);if(!this.lowMotion&&(e.critical||e.heavy))this.shake=Math.max(this.shake,e.critical?3:2);}
    if(e.type==='damage-number'){this.numbers??=[];const same=this.numbers.find(n=>e.enemyId&&n.enemyId===e.enemyId&&n.life>.51);if(same){same.damage+=e.damage;same.critical||=e.critical;}else if(this.numbers.length<48)this.numbers.push({...e,life:.65});}
    if(e.type==='overdrive')this.callout={text:'破晓超载',detail:'技能就绪 · 武器极速 · 6 秒爆发',life:1.7};
    if(e.type==='boss-defeated'){if(!this.lowMotion)this.shake=7;this.callout={text:'首领击破',detail:'让这束光，继续向前',life:1.4};}
    if(e.type==='shoot')this.muzzle=.12;
    if(e.type==='death'){this.killMarks??=[];if(e.coins||e.elite)this.killMarks.push({...e,life:.75});this.killMarks=this.killMarks.slice(-12);const now=performance.now()/1000;this.killBurst=now-(this.lastKillAt||0)<.7?(this.killBurst||0)+1:1;this.lastKillAt=now;if(this.killBurst>=3&&!e.boss&&!e.elite)this.callout={text:this.killBurst+' 连破',detail:'把包围，打成突破口',life:.85};}
    if(e.type==='combo-milestone')this.callout={text:e.text,detail:e.combo+' 连击 · 冲刺冷却 -0.5s'+(e.coins?' · +'+e.coins+' 星砂':''),life:1.25};
    if(e.type==='elite-defeated'){if(!this.lowMotion)this.shake=Math.max(this.shake,4);this.callout={text:'精英击破',detail:AFFIXES[e.affix]+' · +'+e.coins+' 星砂',life:1.25};}
    if(e.type==='boss-enrage')this.callout={text:'首领 · 破限',detail:'第二阶段 · 招式轮换加快',life:1.4};
    if(e.type==='hurt'&&!this.lowMotion)this.shake=8;
    if(['collect','hit','death','beacon','boss-defeated'].includes(e.type)){
      const n=this.lowMotion?2:e.type==='beacon'?30:e.type==='death'?12:6;
      const x=e.x??0,y=e.y??0;if(!x&&!y)continue;
      for(let i=0;i<n;i++){const a=Math.random()*TAU,sp=(e.type==='death'?70:30)+Math.random()*(e.type==='death'?180:120);this.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-20,life:.25+Math.random()*.4,max:.65,color:e.type==='hit'?'#fff0c2':gold});}
    }
  }if(this.particles.length>180)this.particles.splice(0,this.particles.length-180);}
  draw(s,dt=1/60){
    if(!s||!this.w)return;
    if(this.chapter!==s.chapter||this.seed!==s.seed||this.floor!==(s.endless?.floor||0))this.buildMap(s);
    const c=this.ctx,z=this.zoom,p=s.player,t=this.lowMotion?0:s.time;
    const vw=this.w/z,vh=this.h/z;
    this.camera.x=clamp(p.x-vw/2,-35,Math.max(-35,WORLD.width-vw+35));
    this.camera.y=this.selection?p.y-vh*.28:clamp(p.y-vh*.53,-70,Math.max(-70,WORLD.height-vh+70));
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#102d32';c.fillRect(0,0,this.w,this.h);
    if(this.lowMotion)this.shake=0;c.save();if(this.shake>0){c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);this.shake=Math.max(0,this.shake-dt*30);}
    c.scale(z,z);c.translate(-this.camera.x,-this.camera.y);c.drawImage(this.map,0,0);
    if(this.destination){circle(c,this.destination.x,this.destination.y,11,null,'#b8cfaa77',1);circle(c,this.destination.x,this.destination.y,2,'#d8c795');}
    for(const b of s.beacons)if(b.lit){glow(c,b.x,b.y,180,(b.suppressedUntil||0)>s.totalTime?'#b28bbf33':'#dfc88825');circle(c,b.x,b.y,148,null,'#e1c88d44',1);}
    // Wind on the paving.
    if(!this.lowMotion){for(let i=0;i<20;i++){
      const x=(i*137+s.time*8)%WORLD.width,y=(i*239+s.time*3)%WORLD.height;
      line(c,[[x,y],[x+12,y-3]],'#b5c5ac13',1);
    }}
    const ex=s.exit;if(!isEndless(s)){c.save();c.translate(ex.x,ex.y);
    circle(c,0,0,63,'#294643',ex.open?'#e5c486':'#6a7b6c',2);
    if(ex.open)glow(c,0,-30,120,'#f4c48344');
    round(c,-40,-80,80,100,35,ex.open?'#997e50':'#263b3d','#80917a');
    round(c,-28,-69,56,89,26,ex.open?'#ffe0a0':'#132f35');
    if(ex.open){c.globalAlpha=.5+Math.sin(t*3)*.2;round(c,-21,-63,42,82,22,'#fff0c0');}c.globalAlpha=1;
    c.fillStyle=ex.open?cream:'#9ca790';c.font='12px sans-serif';c.textAlign='center';c.fillText(ex.open?(s.chapter===2?'把黎明送达':'前往下一片街区'):'归途 · 等待灯火',0,48);c.restore();}
    for(const e of s.embers){const bob=Math.sin(t*3+e.wobble)*3;glow(c,e.x,e.y+bob,20,'#eac67a44');
      c.save();c.translate(e.x,e.y+bob);c.rotate(Math.PI/4);round(c,-4,-4,8,8,2,'#ffdc92');c.restore();circle(c,e.x-1,e.y+bob-2,1.5,'#fff1c6');}
    const actors=s.obstacles.map(o=>({y:o.y+o.h,draw:()=>drawBuilding(c,o,s.chapter)}));
    for(const poi of s.pois||[])actors.push({y:poi.y,draw:()=>drawPOI(c,poi,t,s)});
    for(const b of s.beacons)actors.push({y:b.y,draw:()=>drawBeacon(c,b,t,s.totalTime)});
    for(const e of s.enemies)actors.push({y:e.y,draw:()=>drawEnemy(c,e,t,this.lowMotion?0:this.flashes?.get(e.id)||0)});
    actors.push({y:p.y,draw:()=>{
      glow(c,p.x,p.y-8,105,'#f8ca7a28');
      if(overdriving(s)){circle(c,p.x,p.y,43,null,'#ffd18c',3);if(!this.lowMotion)for(let i=0;i<6;i++){const a=t*5+i*TAU/6;line(c,[[p.x+Math.cos(a)*47,p.y+Math.sin(a)*47],[p.x+Math.cos(a-.2)*57,p.y+Math.sin(a-.2)*57]],'#ffd18caa',2);}}
      if(p.dash>0){for(let i=1;i<5;i++){c.globalAlpha=(1-i/5)*.35;drawOwl(c,p.x-p.aimX*i*18,p.y-p.aimY*i*18,.92,t,p.facing);}c.globalAlpha=1;}
      if(p.invincible>0&&Math.sin(t*28)>.6)c.globalAlpha=.5;
      drawOwl(c,p.x,p.y,.92,t,p.facing);c.globalAlpha=1;drawWeapons(c,s,t,this.lowMotion);if(this.muzzle>0&&!this.lowMotion){const x=p.x+p.aimX*28,y=p.y+p.aimY*28;circle(c,x,y,6+this.muzzle*80,'#ffe5a655');line(c,[[x-p.aimY*10,y+p.aimX*10],[x+p.aimY*10,y-p.aimX*10]],'#fff5d4',2);}
      const outfit=GEAR_BY_ID[s.gear?.slots.cape]?.set;
      if(outfit==='warden')circle(c,p.x,p.y+1,33,null,'#a2c8b755',1.5);
      if(outfit==='dawn')for(let i=0;i<3;i++){const a=t*.9+i*TAU/3;circle(c,p.x+Math.cos(a)*32,p.y-4+Math.sin(a)*18,2.1,'#e1c392');}
      if(outfit==='courier')line(c,[[p.x-14*p.facing,p.y+3],[p.x-35*p.facing,p.y+8],[p.x-47*p.facing,p.y+4]],'#c6c19177',2);
      if(s.v12?.barrier)circle(c,p.x,p.y,39,null,'#c6ecc7',3);
      if(s.v12?.shield)circle(c,p.x,p.y,43,null,'#a5c8ea',2);
      if(p.invincible>0)circle(c,p.x,p.y,29,null,'#f3dca444',1);
    }});
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
    if(isEndless(s)){for(const z of s.endless.zones){circle(c,z.x,z.y,z.r,'#b07ad02b','#dbacfa',2);circle(c,z.x,z.y,z.r*(1-z.warning/1.25),null,'#e9caff',3);line(c,[[z.x-9,z.y],[z.x+9,z.y]],'#efcaff',2);line(c,[[z.x,z.y-9],[z.x,z.y+9]],'#efcaff',2);}
       for(const f of s.endless.pools)drawFirePool(c,f,t,this.lowMotion);for(const b of orbitPositions(s)){const a=Math.atan2(b.y-p.y,b.x-p.x);if(!this.lowMotion){const r=distance(b,p);c.beginPath();c.arc(p.x,p.y,r,a-.5,a);c.strokeStyle='#d2eaa755';c.lineWidth=11;c.stroke();}c.save();c.translate(b.x,b.y);c.rotate(a+.8);glow(c,0,0,25,'#d5ebaa55');c.fillStyle=evolved(s,'orbit')?'#fff6cb':'#c6e0ab';c.beginPath();c.ellipse(0,0,6,19,0,0,TAU);c.fill();line(c,[[0,-19],[0,19]],'#f5ffe8',1.5);c.restore();}}
    for(const b of s.projectiles)drawProjectile(c,b,s);
    for(const f of s.effects){if(drawBattleEffect(c,f,t,this.lowMotion))continue;if(f.type==='dash-cut'){const alpha=f.life/f.maxLife;c.save();c.globalAlpha=alpha;line(c,[[f.x,f.y],[f.toX,f.toY]],'#ffe1a1',f.r*1.5);line(c,[[f.x,f.y],[f.toX,f.toY]],'#fff7df',6);c.restore();continue;}if(f.type==='lightning'){line(c,[[f.x,f.y],[(f.x+f.toX)/2+12,(f.y+f.toY)/2-14],[f.toX,f.toY]],'#d1b7ff',4);continue;}if(f.type==='beam'){line(c,[[f.x,f.y],[f.toX,f.toY]],'#edbbce99',35);continue;}const k=1-f.life/f.maxLife;circle(c,f.x,f.y,f.r*k,null,f.type==='frost'?`rgba(150,225,238,${(1-k)*.85})`:f.type==='lightning-burst'?`rgba(207,173,255,${(1-k)*.85})`:`rgba(250,190,110,${(1-k)*.8})`,4*(1-k)+1);if(k<.5)glow(c,f.x,f.y,Math.max(1,f.r*k),'#ffe3a033');}
    for(const a of this.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;c.globalAlpha=Math.max(0,a.life/a.max);circle(c,a.x,a.y,2,a.color);}c.globalAlpha=1;this.particles=this.particles.filter(a=>a.life>0);
    // Labels appear only nearby, leaving most of the city quiet.
    for(const b of s.beacons)if(!b.lit&&distance(p,b)<165){
      c.textAlign='center';c.font='12px sans-serif';const text=isEndless(s)?(p.embers>=b.cost?'5 火种 · 恢复 20% 生命':`一次补给需要 5 火种 · 已有 ${p.embers}`):p.embers>=4?(b.progress>0?'正在点灯…':'靠近自动点亮'):`需要 4 枚火种 · 已有 ${p.embers}`;
      const tw=c.measureText(text).width+22;round(c,b.x-tw/2,b.y+51,tw,27,8,'#0d272ddd','#7e8c6877');c.fillStyle=cream;c.fillText(text,b.x,b.y+69);
    }
    if(s.v12?.conditions.includes('fog')){const fog=c.createRadialGradient(p.x,p.y,150,p.x,p.y,350);fog.addColorStop(0,'#10283500');fog.addColorStop(1,'#102835f2');c.fillStyle=fog;c.fillRect(this.camera.x,this.camera.y,vw,vh);}
    for(const e of s.enemies){
      if(e.kind==='warder'&&e.hp>0)circle(c,e.x,e.y,130,null,(e.shieldBrokenUntil||0)>s.totalTime?'#94c4d922':'#94c4d977',2);
      if((e.markUntil||0)>s.totalTime)circle(c,e.x,e.y,e.r+9,null,'#f7d58c',2);
      if(isTactical(s)&&e.cast>0){drawEnemyIntent(c,e,s,t);continue;}
      if(e.cast>0){c.save();c.setLineDash([12,9]);if(e.castType==='beam'||e.castType==='charge'){line(c,[[e.x,e.y],[e.castX,e.castY]],'#f1b9d4',5);c.globalAlpha=.13;line(c,[[e.x,e.y],[e.castX,e.castY]],'#f1b9d4',100);}else if(e.castType==='rain'){circle(c,e.x,e.y,120,null,'#edb1da',4);c.fillStyle='#f5d8e9';c.font='bold 14px sans-serif';c.textAlign='center';c.fillText('弹幕将至',e.x,e.y-100);}else{const b=s.beacons.find(b=>b.id===e.castBeacon);if(b){circle(c,b.x,b.y,150,null,'#f1b9d4',4);c.fillStyle='#f6d7e5';c.font='bold 15px sans-serif';c.textAlign='center';c.fillText('即将压灯 · 换位',b.x,b.y-145);}}c.restore();}
    }
    for(const k of this.killMarks||[]){k.life-=dt;c.globalAlpha=Math.max(0,k.life/.75);c.textAlign='center';c.font='bold '+(k.elite?16:11)+'px sans-serif';c.fillStyle=k.elite?'#ffe0a1':'#d6eac1';c.fillText(k.elite?'✦ 精英 +'+k.coins:'+'+k.coins+' 砂',k.x+15,k.y-42-(.75-k.life)*32);}c.globalAlpha=1;this.killMarks=(this.killMarks||[]).filter(k=>k.life>0);
    for(const n of this.numbers||[]){n.life-=dt;c.globalAlpha=Math.max(0,n.life/.65);c.fillStyle=n.critical?'#fff4c1':'#e8d8b8';c.font=(n.critical?'bold 20px':'bold 14px')+' sans-serif';c.textAlign='center';c.fillText(n.damage,n.x,n.y-26-(.65-n.life)*30);}c.globalAlpha=1;this.numbers=(this.numbers||[]).filter(n=>n.life>0);
    c.restore();
    // A soft vignette creates depth without obscuring the character.
    const g=c.createRadialGradient(this.w/2,this.h*.5,Math.min(this.w,this.h)*.2,this.w/2,this.h*.5,Math.max(this.w,this.h)*.75);g.addColorStop(0,'#04171900');g.addColorStop(1,'#0417199a');c.fillStyle=g;c.fillRect(0,0,this.w,this.h);
    this.compass(s);this.minimap(s);this.muzzle=Math.max(0,(this.muzzle||0)-dt);
    for(const [id,life]of this.flashes||[]){if(life<=dt)this.flashes.delete(id);else this.flashes.set(id,life-dt);}
    if(this.callout){const a=this.callout;a.life-=dt;c.save();c.globalAlpha=Math.min(1,Math.max(0,a.life*2));c.textAlign='center';c.fillStyle='#ffe1a1';c.font='bold 30px sans-serif';c.fillText(a.text,this.w/2,this.h*(this.selection?.18:.27));c.font='12px sans-serif';c.fillStyle='#ffebc6';c.fillText(a.detail,this.w/2,this.h*(this.selection?.18:.27)+25);c.restore();if(a.life<=0)this.callout=null;}
  }
  compass(s){
    const p=s.player,targets=isEndless(s)?[]:s.beacons.filter(b=>!b.lit);let target;
    if(targets.length)target=targets.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);
    else if(s.exit.open)target=s.exit;else target=s.enemies.find(e=>e.kind==='boss')||(isEndless(s)?s.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(p,a)-distance(p,b))[0]:null);
    if(!target)return;
    const tx=(target.x-this.camera.x)*this.zoom,ty=(target.y-this.camera.y)*this.zoom;
    if(tx>55&&tx<this.w-55&&ty>150&&ty<this.h-145)return;
    const cx=this.w/2,cy=this.h*.5,ang=Math.atan2(ty-cy,tx-cx);
    const edgeX=(this.w/2-42)/Math.max(.001,Math.abs(Math.cos(ang))),edgeY=(this.h/2-160)/Math.max(.001,Math.abs(Math.sin(ang))),len=Math.max(35,Math.min(edgeX,edgeY));
    const x=cx+Math.cos(ang)*len,y=cy+Math.sin(ang)*len,c=this.ctx;
    circle(c,x,y,18,'#173336dd','#a99a6b99',1);c.save();c.translate(x,y);c.rotate(ang);c.fillStyle=gold;c.beginPath();c.moveTo(8,0);c.lineTo(-4,-5);c.lineTo(-2,0);c.lineTo(-4,5);c.fill();c.restore();
  }
  minimap(s){
    if(!this.mini)return;const c=this.mini.getContext('2d'),w=this.mini.width,h=this.mini.height;c.clearRect(0,0,w,h);c.fillStyle='#0c242b';c.fillRect(0,0,w,h);const sx=w/WORLD.width,sy=h/WORLD.height;
    for(const o of s.obstacles){c.fillStyle='#43605b';c.fillRect(o.x*sx,o.y*sy,o.w*sx,o.h*sy);}
    for(const b of s.beacons)circle(c,b.x*sx,b.y*sy,b.lit?4:3,b.lit?gold:'#78928a');
    for(const poi of s.pois||[])if(!poi.used||poi.kind==='shop'||followupAvailable(s,poi))circle(c,poi.x*sx,poi.y*sy,2.2,poi.kind==='event'?'#b4a5c9':poi.kind==='chest'?'#d5bb83':'#a3c8ba');
    if(s.exit.open)circle(c,s.exit.x*sx,s.exit.y*sy,4,'#f8e5ad');
    const boss=s.enemies.find(e=>e.kind==='boss');if(boss)circle(c,boss.x*sx,boss.y*sy,4,'#d098b6');
    circle(c,s.player.x*sx,s.player.y*sy,3,'#fff4d5');
    c.strokeStyle='#d1d7b633';c.lineWidth=1;c.strokeRect(this.camera.x*sx,this.camera.y*sy,this.w/this.zoom*sx,this.h/this.zoom*sy);
  }
}
export function drawTitle(canvas,time=0,lowMotion=false){
  if(!canvas)return;const rect=canvas.getBoundingClientRect();if(!rect.width)return;
  const dpr=Math.min(window.devicePixelRatio||1,1.5);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const c=canvas.getContext('2d'),sx=w/680,sy=h/640;c.setTransform(sx,0,0,sy,0,0);c.clearRect(0,0,680,640);
  const t=lowMotion?0:time,rand=rng(4776);
  const bg=c.createLinearGradient(0,0,0,640);bg.addColorStop(0,'#12353c');bg.addColorStop(.65,'#1f4245');bg.addColorStop(1,'#173539');round(c,0,0,680,640,20,bg);
  // Celestial cartography.
  circle(c,420,180,139,null,'#799a7c30');circle(c,420,180,118,null,'#c5be8d36');
  c.setLineDash([1,8]);circle(c,420,180,153,null,'#9ba88744');c.setLineDash([]);
  for(let i=0;i<32;i++){const a=i*TAU/32;line(c,[[420+Math.cos(a)*147,180+Math.sin(a)*147],[420+Math.cos(a)*152,180+Math.sin(a)*152]],'#b0ac7b55',1);}
  glow(c,420,182,125,'#f9cf8940');circle(c,420,182,64,'#c4c6a1');circle(c,434,171,62,'#294a4b');
  for(let i=0;i<44;i++){const x=rand()*680,y=rand()*380;circle(c,x,y,rand()*1.4+.4,'#c9cfab66');}
  for(let row=0;row<2;row++){
    for(let i=0;i<12;i++){const x=i*70-25+row*24,hh=55+rand()*100,y=420-row*40-hh;
      round(c,x,y,57,hh+100,3,row?'#1b3a40':'#234649');c.fillStyle=row?'#1b3a40':'#234649';c.beginPath();c.moveTo(x-7,y+4);c.lineTo(x+28,y-28);c.lineTo(x+64,y+4);c.fill();
      for(let k=0;k<3;k++)for(let j=0;j<2;j++)if(rand()>.55)round(c,x+12+j*22,y+20+k*24,6,11,3,rand()>.7?'#b3a86a66':'#48676266');
    }
  }
  // The curving rooftop bridge.
  c.fillStyle='#395454';c.beginPath();c.moveTo(-30,480);c.bezierCurveTo(140,315,300,560,720,350);c.lineTo(720,429);c.bezierCurveTo(300,640,140,395,-30,560);c.fill();
  c.strokeStyle='#718076';c.lineWidth=4;c.beginPath();c.moveTo(-30,478);c.bezierCurveTo(140,315,300,560,720,350);c.stroke();
  c.strokeStyle='#9d9c7666';c.lineWidth=2;c.beginPath();c.moveTo(-30,510);c.bezierCurveTo(140,345,300,590,720,380);c.stroke();
  for(let i=0;i<20;i++){const x=i*40,y=475+Math.sin(i*.23)*19-i*2.8;line(c,[[x,y],[x+2,y+30]],'#213d3c77',2);}
  c.save();c.translate(485,370);c.scale(1.15,1.15);drawBeacon(c,{x:0,y:0,lit:true,cost:4},t);c.restore();
  // Tall foliage frames a little hero with a big delivery.
  for(let i=0;i<20;i++){const x=i<10?rand()*120:550+rand()*130,y=470+rand()*190;const hh=25+rand()*70;
    line(c,[[x,y],[x-10,y-hh]],'#4c705c',2);c.fillStyle='#436a56';c.beginPath();c.ellipse(x-10,y-hh*.6,6,16,-.6,0,TAU);c.fill();c.beginPath();c.ellipse(x-2,y-hh*.4,5,12,.4,0,TAU);c.fill();}
  glow(c,260,425,160,'#fac78028');drawOwl(c,260,452,2.65,t*.15,1,true);
  // A sealed letter in the wind.
  c.save();c.translate(350,354+Math.sin(t*.7)*8);c.rotate(-.18);round(c,-21,-13,42,27,3,'#e5cf9b');line(c,[[-20,-12],[0,3],[20,-12]],'#a48758',1.5);circle(c,0,3,4,'#a76a4b');c.restore();
  for(let i=0;i<30;i++){const x=(rand()*680+t*(2+i%3))%680,y=150+rand()*450+Math.sin(t+i)*5;glow(c,x,y,10,'#ffd28622');circle(c,x,y,1.2+(i%3)*.3,`rgba(255,218,146,${.25+(Math.sin(t+i)+1)*.2})`);}
  const mist=c.createLinearGradient(0,470,0,640);mist.addColorStop(0,'#132f3700');mist.addColorStop(1,'#122e38ee');c.fillStyle=mist;c.fillRect(0,470,680,170);
  c.fillStyle='#bfc7ab88';c.font='10px sans-serif';c.letterSpacing='4px';c.fillText('NIGHTFALL POST OFFICE',30,604);c.letterSpacing='0px';
}
