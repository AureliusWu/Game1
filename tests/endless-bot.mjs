/** A player-action policy. Never edits health, actors, XP, positions or room completion. */
import {createGame,tick,dash,pulse,chooseUpgrade,usePotion,collides,serialize,restore} from '../dist/core.mjs';
import {rankOf,SKILL_BY_ID,choiceInfo,retireEndless} from '../dist/endless.mjs';
import {findPath,clearLine} from '../dist/routes.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function playEndless({seed=1,starter='cinder',difficulty='normal',floors=10,maxTime=1500,resume=false,route='hunt',idle=false,observe=()=>{}}={}){
 let s=createGame({seed,mode:'endless',starter,difficulty,id:`endless-${seed}-${starter}-${difficulty}`});
 let resumed=false,frames=0,choices=0,maxEnemies=0,maxProjectiles=0,maxEffects=0;const milestones=[];let lastFloor=1;
 const partner=SKILL_BY_ID[starter].partner;
 while(['playing','upgrade'].includes(s.phase)&&s.totalTime<maxTime){
  if(s.phase==='upgrade'){
   if(s.endless.choice==='route'){
    milestones.push({floor:s.endless.floor,time:s.totalTime,hp:s.player.hp,level:s.journal.level,damage:s.damageTaken,kills:s.kills});
    if(s.endless.cleared>=floors){retireEndless(s);break;}
    const id=s.offered.includes(route)&&!choiceInfo(s,route).disabled?route:'hunt';chooseUpgrade(s,id);lastFloor=s.endless.floor;
   }else{
    const priorities=[starter,partner,'might','orbit','cinder','thunder','haste','vitality','sustain','focus','magnet','wing','pulsecraft','frost'];
    const score=id=>{if(!SKILL_BY_ID[id])return ({dawn:100,glass:80,ink:85,lodestone:70,hourglass:50,hunger:60,moon:55,coin:40,ash:20,mend:10,supplies:5})[id]||0;
      if(id===starter)return 150;
      if(id===partner&&rankOf(s,partner)<2)return 145;
      return 100-priorities.indexOf(id)*4+(rankOf(s,id)>0?4:0);};
    chooseUpgrade(s,[...s.offered].sort((a,b)=>score(b)-score(a))[0]);choices++;
   }
   if(++frames>100000)throw new Error('Draft loop');continue;
  }
  const p=s.player,near=s.enemies.filter(e=>e.hp>0&&e.warning<=0&&distance(e,p)<p.pulseRadius+e.r);
  if(!idle&&p.hp<p.maxHp*.45)usePotion(s);
  let input={x:0,y:0};
  if(!idle){
   const enemies=s.enemies.filter(e=>e.hp>0&&e.warning<=0),closest=[...enemies].sort((a,b)=>distance(p,a)-distance(p,b))[0];
   let goal=s.embers.filter(e=>e.xp>0).sort((a,b)=>distance(p,a)-distance(p,b))[0];
   const lamp=s.beacons.filter(b=>!b.lit&&p.embers>=b.cost&&p.hp<p.maxHp*.65).sort((a,b)=>distance(p,a)-distance(p,b))[0];
   if(lamp&&distance(lamp,p)<500)goal=lamp;
   if(!goal&&closest){const d=distance(p,closest),range=rankOf(s,'orbit')?120:260;goal={x:closest.x+(p.x-closest.x)/(d||1)*range,y:closest.y+(p.y-closest.y)/(d||1)*range};}
   goal??={x:940,y:690};
   if(!clearLine(s,p,goal,p.r)){const path=findPath(s,p,goal,p.r);goal=path.find(q=>distance(p,q)>12)||goal;}
   let best=Infinity;
   for(let i=-1;i<20;i++){
    const a=i*Math.PI/10,x=i<0?0:Math.cos(a),y=i<0?0:Math.sin(a),q={x:p.x+x*p.speed*.45,y:p.y+y*p.speed*.45};
    if(collides(s,q.x,q.y,p.r+2)||!clearLine(s,p,q,p.r+1))continue;
    let cost=distance(q,goal);
    for(const e of enemies){const d=distance(q,e),danger=e.r+p.r+50;if(d<danger)cost+=(danger-d)*9;
     if(e.cast>0&&(e.castType==='beam'||e.castType==='charge')){const dx=e.castX-e.x,dy=e.castY-e.y,t=Math.max(0,Math.min(1,((q.x-e.x)*dx+(q.y-e.y)*dy)/(dx*dx+dy*dy||1))),line=Math.hypot(q.x-e.x-t*dx,q.y-e.y-t*dy);if(line<80)cost+=(80-line)*7;}}
    for(const z of s.endless.zones){const d=distance(q,z);if(d<z.r+40)cost+=(z.r+40-d)*8;}
       for(const b of s.projectiles)if(b.enemy&&Math.hypot(q.x-b.x-b.vx*.25,q.y-b.y-b.vy*.25)<50)cost+=220;
    if(cost<best){best=cost;input={x,y};}
   }
   if(near.length>=2||near.some(e=>e.kind==='boss'||e.cast>0))pulse(s);
   if(closest&&distance(p,closest)<85&&p.dashCd<=0)dash(s);
  }
  tick(s,input,.05);frames++;
  maxEnemies=Math.max(maxEnemies,s.enemies.length);maxProjectiles=Math.max(maxProjectiles,s.projectiles.length);maxEffects=Math.max(maxEffects,s.effects.length);
  observe(s);
  if(resume&&!resumed&&s.totalTime>17){const loaded=restore(serialize(s));if(!loaded)throw new Error('Endless save rejected');s=loaded;resumed=true;}
  if(s.endless.floor<lastFloor)throw new Error('Floor regressed');
 }
 return {s,milestones,choices,frames,resumed,maxEnemies,maxProjectiles,maxEffects};
}
