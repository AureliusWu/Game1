/** Original Canvas weapon silhouettes and bounded skill effects; presentation only. */
const TAU=Math.PI*2;
export const WEAPON_COLORS={cinder:'#ffb56b',frost:'#95e5f1',orbit:'#c9eda4',thunder:'#d2b3ff'};
const circle=(c,x,y,r,color,width=1,fill=false)=>{c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);if(fill){c.fillStyle=color;c.fill();}else{c.strokeStyle=color;c.lineWidth=width;c.stroke();}};
const line=(c,points,color,width=1)=>{c.beginPath();for(let i=0;i<points.length;i++)c[i?'lineTo':'moveTo'](...points[i]);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
function rune(c,x,y,r,color,phase=0){c.save();c.translate(x,y);c.rotate(phase);for(let i=0;i<6;i++){const a=i*TAU/6;line(c,[[Math.cos(a)*r*.75,Math.sin(a)*r*.75],[Math.cos(a)*r,Math.sin(a)*r]],color,2);}c.restore();}
function flame(c,x,y,size,color,t){c.save();c.translate(x,y);c.fillStyle=color;c.beginPath();c.moveTo(-size*.6,size*.3);c.bezierCurveTo(-size,size*.0,-size*.25,-size*.5,0,-size*(1.2+Math.sin(t*8)*.12));c.bezierCurveTo(size*.1,-size*.1,size*.9,-size*.35,size*.55,size*.4);c.quadraticCurveTo(0,size*.85,-size*.6,size*.3);c.fill();c.restore();}
export function drawWeapons(c,s,t,lowMotion=false){
 const ranks=s.endless?.ranks;if(!ranks)return;const p=s.player,m=lowMotion?0:t;
 c.save();
 if(ranks.cinder){const x=p.x+29*p.facing,y=p.y+5;circle(c,x,y,19,'#ffb56b24',1,true);c.strokeStyle='#e3b37b';c.lineWidth=2;c.strokeRect(x-8,y-10,16,21);line(c,[[x-6,y-10],[x-6,y-17],[x+6,y-17],[x+6,y-10]],'#c7a278',2);flame(c,x,y,7,'#ffe2a2',m);}
 if(ranks.frost){const a=m*.55,x=p.x+Math.cos(a+2.8)*45,y=p.y-22+Math.sin(a+2.8)*18;c.save();c.translate(x,y);c.rotate(-.25);c.fillStyle='#305c68';c.fillRect(-9,-10,18,20);c.strokeStyle='#a2edf1';c.lineWidth=1.5;c.strokeRect(-9,-10,18,20);rune(c,0,0,7,'#cefbff',m*.3);c.restore();}
 if(ranks.thunder){const x=p.x-33*p.facing,y=p.y-38+Math.sin(m*2)*3;c.save();c.translate(x,y);c.rotate(.18);c.fillStyle='#66537e';c.fillRect(-11,-8,22,16);line(c,[[-11,-8],[0,1],[11,-8]],'#e3ceff',1.5);line(c,[[2,-9],[-4,-1],[3,-1],[-2,8]],'#f4e8ff',2);c.restore();circle(c,x,y,20,'#c9a8ff33');}
 if(p.pulseCd<=0){c.save();c.setLineDash([6,10]);circle(c,p.x,p.y,35,'#ffe0a188',1.5);c.restore();}
 c.restore();
}
export function drawProjectile(c,b,s){
 const type=b.enemy?'hostile':s.endless?.starter||'cinder',color=b.enemy?'#f093bf':WEAPON_COLORS[type]||'#ffe3a0';
 const speed=Math.hypot(b.vx,b.vy)||1,dx=b.vx/speed,dy=b.vy/speed;
 c.save();c.lineCap='round';line(c,[[b.x-dx*28,b.y-dy*28],[b.x,b.y]],color+'66',b.r*2.5);line(c,[[b.x-dx*17,b.y-dy*17],[b.x,b.y]],color,b.r*1.1);
 if(b.enemy){circle(c,b.x,b.y,b.r+2,'#ffa7d3',1.3);circle(c,b.x,b.y,b.r*.7,'#fadae9',1,true);}
 else if(type==='frost'){c.translate(b.x,b.y);c.rotate(Math.atan2(dy,dx));c.fillStyle='#d1fcff';c.beginPath();c.moveTo(11,0);c.lineTo(-6,-5);c.lineTo(-2,0);c.lineTo(-6,5);c.fill();}
 else if(type==='thunder')line(c,[[b.x-dx*11+dy*3,b.y-dy*11-dx*3],[b.x+dy*4,b.y-dx*4],[b.x-dy*4,b.y+dx*4],[b.x+dx*8,b.y+dy*8]],'#f6edff',2.5);
 else{circle(c,b.x,b.y,b.r+2,color+'bb',1,true);circle(c,b.x,b.y,b.r*.6,'#fff8de',1,true);}
 c.restore();
}
export function drawBattleEffect(c,f,t,lowMotion=false){
 const k=Math.max(0,Math.min(1,1-f.life/f.maxLife)),a=1-k;
 if(!['ring','frost','blast','overdrive','feather','lightning','lightning-burst','dash-cut','hostile-ring','flow-burst'].includes(f.type))return false;
 c.save();c.globalAlpha=a;c.lineCap='round';
 if(f.type==='lightning'){
  const dx=f.toX-f.x,dy=f.toY-f.y,len=Math.hypot(dx,dy)||1,points=[[f.x,f.y]];
  for(let i=1;i<7;i++){const n=lowMotion?0:Math.sin(i*16+t*35)*12*a;points.push([f.x+dx*i/7-dy/len*n,f.y+dy*i/7+dx/len*n]);}points.push([f.toX,f.toY]);line(c,points,'#be8aff55',12);line(c,points,'#cba4ff',5);line(c,points,'#fff4ff',1.5);
 }else if(f.type==='dash-cut'){line(c,[[f.x,f.y],[f.toX,f.toY]],'#ffbe6d44',f.r*2);line(c,[[f.x,f.y],[f.toX,f.toY]],'#ffe1a1',f.r);line(c,[[f.x,f.y],[f.toX,f.toY]],'#fff9e3',4);}
 else{
  const color=f.type==='frost'?'#9ee8f4':f.type==='lightning-burst'?'#d0b3ff':f.type==='feather'?'#d1efa5':f.type==='flow-burst'?'#b6f8d8':f.type==='hostile-ring'?'#ef8cbd':'#ffd18c';
  const radius=f.r*(f.type==='blast'?.4+k*.6:.35+Math.min(1,k*1.7)*.65);
  circle(c,f.x,f.y,radius,color+'22',1,true);circle(c,f.x,f.y,radius,color,Math.max(1,7*a));circle(c,f.x,f.y,radius*.9,color+'66',2);
  if(f.inner)circle(c,f.x,f.y,f.inner,'#fff0fa',2);
  if(f.type==='ring'||f.type==='overdrive'||f.type==='frost'){rune(c,f.x,f.y,radius,color,lowMotion?0:t*.35);circle(c,f.x,f.y,radius*.68,color+'77',1.5);}
  if(!lowMotion){const n=f.type==='blast'?7:10;for(let i=0;i<n;i++){const ang=i*TAU/n,rr=radius*(.85+k*.35);line(c,[[f.x+Math.cos(ang)*rr*.8,f.y+Math.sin(ang)*rr*.8],[f.x+Math.cos(ang)*rr,f.y+Math.sin(ang)*rr]],color,2.5*a);}}
 }
 c.restore();return true;
}
export function drawEnemyIntent(c,e,s,t){
 if(!(e.cast>0))return;const k=1-e.cast/(e.castMax||1),color=e.kind==='boss'?'#ff9cc8':'#e7a0c2';
 c.save();c.globalAlpha=.9;c.strokeStyle=color;
 if(['slam','nova'].includes(e.castType)){
  const radius=e.castType==='nova'?270:175;circle(c,e.x,e.y,radius,color+'19',1,true);circle(c,e.x,e.y,radius,color,2);circle(c,e.x,e.y,radius*k,color+'99',3);if(e.castType==='nova'){circle(c,e.x,e.y,86,'#a3d8b4',2);}
 }else if(['charge','lunge','beam'].includes(e.castType)){
  line(c,[[e.x,e.y],[e.castX,e.castY]],color+'26',e.castType==='beam'?68:e.r*2+25);c.setLineDash([10,9]);line(c,[[e.x,e.y],[e.castX,e.castY]],color,3);c.setLineDash([]);
 }else if(e.castType==='volley'){
  const angle=Math.atan2(e.castY-e.y,e.castX-e.x);for(const da of [-.38,0,.38])line(c,[[e.x,e.y],[e.x+Math.cos(angle+da)*260,e.y+Math.sin(angle+da)*260]],color+'88',2);
 }else if(e.castType==='rain')circle(c,e.x,e.y,115,color,2);
 circle(c,e.x,e.y,e.r+14,color+'44',3);c.beginPath();c.arc(e.x,e.y,e.r+14,-Math.PI/2,-Math.PI/2+TAU*k);c.lineWidth=4;c.strokeStyle=color;c.stroke();
 c.fillStyle='#ffe5ef';c.font='bold 11px sans-serif';c.textAlign='center';c.fillText(({charge:'冲锋',lunge:'扑击',slam:'震地',nova:'内圈安全',volley:'散射',rain:'弹幕',beam:'光束'})[e.castType]||'蓄力',e.x,e.y-e.r-25);c.restore();
}

export function drawFirePool(c,f,t,lowMotion=false){
 c.save();circle(c,f.x,f.y,65,'#ffad6522',1,true);circle(c,f.x,f.y,57,'#ffd38a66',2);for(let i=0;i<(lowMotion?1:3);i++){const a=i*TAU/3+f.x*.02;flame(c,f.x+Math.cos(a)*27,f.y+Math.sin(a)*22,12,'#ffc47b99',lowMotion?0:t+i);}c.restore();
}
