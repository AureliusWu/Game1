import {createGame,tick,pulse,dash,chooseUpgrade,chooseContinuation,collides,distance,finalScore,WORLD,serialize,restore} from '../dist/core.mjs';
import {openPOI,chooseStory,equip,forge,forgeCost,buy,chooseEvent,usePotion} from '../dist/systems.mjs';
import {EVENTS,NPCS,GEAR_BY_ID} from '../dist/content.mjs';
import {pointSegmentDistance} from '../dist/expedition.mjs';
import {safePoint} from '../dist/routes.mjs';
import {followupAvailable,ARCS} from '../dist/narrative.mjs';
const CELL=40,COLS=Math.ceil(WORLD.width/CELL),ROWS=Math.ceil(WORLD.height/CELL);
function route(s,goal){
  const start=[Math.floor(s.player.x/CELL),Math.floor(s.player.y/CELL)];
  const end=[Math.floor(goal.x/CELL),Math.floor(goal.y/CELL)];
  const key=(x,y)=>y*COLS+x,queue=[start],parents=new Map([[key(...start),null]]);
  let found=null;
  for(let q=0;q<queue.length;q++){
    const [x,y]=queue[q];if(x===end[0]&&y===end[1]){found=[x,y];break;}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const nx=x+dx,ny=y+dy,k=key(nx,ny),wx=nx*CELL+20,wy=ny*CELL+20;
      if(nx<0||ny<0||nx>=COLS||ny>=ROWS||parents.has(k)||collides(s,wx,wy,22))continue;
      if(dx&&dy&&(collides(s,x*CELL+20,wy,22)||collides(s,wx,y*CELL+20,22)))continue;
      parents.set(k,[x,y]);queue.push([nx,ny]);
    }
  }
  if(!found)return [goal];
  const result=[goal];let current=found;
  while(current){result.push({x:current[0]*CELL+20,y:current[1]*CELL+20});current=parents.get(key(...current));}
  result.reverse();result.shift();return result;
}
export function playJourney(seed,difficulty='normal',options={}){
  // Optional development policies and read-only observers support balance studies.
  // New-rule policies respond to visible cues; no policy edits simulation state.
  let s=createGame({seed,difficulty,profile:options.profile||{},mode:options.mode,daily:options.daily,conditions:options.conditions,contract:options.contract||(options.systems?'letters':'lamps'),id:`bot-${seed}-${difficulty}-${options.share?'share':'promise'}`});let path=[],targetId='',repath=0;const milestones=[],shops=new Set();
  const wear=id=>{const g=GEAR_BY_ID[id],current=GEAR_BY_ID[s.gear.slots[g.slot]];if(!options.build||g.set===options.build||current.set!==options.build)equip(s,id);};
  for(let frame=0;frame<24000&&s.phase!=='won'&&s.phase!=='lost';frame++){
    if(s.phase==='upgrade'){if(s.v12?.choiceKind!=='field')milestones.push({chapter:s.chapter+1,time:s.totalTime});const id=s.offered.includes('spark')?'spark':s.offered.includes('lantern')?'lantern':s.offered[0];chooseUpgrade(s,id);path=[];targetId='';}
    const p=s.player,unlit=s.beacons.filter(b=>!b.lit);let target,id;
    if(options.systems){
      const npc=s.pois.find(p=>p.kind==='npc'),chest=s.pois.find(p=>p.kind==='chest'),shop=s.pois.find(p=>p.kind==='shop'),event=s.pois.find(p=>p.kind==='event');
      if(!npc.used){
        if(options.share&&p.embers<2){target=s.embers.reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='story-ember'+target?.id;}
        else {target=npc;id=npc.id;if(distance(p,npc)<100){chooseStory(s,npc.id,options.share?'share':'promise');target=null;}}
      }else if(!chest.used){target=chest;id=chest.id;if(distance(p,chest)<100){const loot=openPOI(s,chest.id);if(loot?.gear){wear(loot.gear);if(s.journal.coins>=34)forge(s,loot.gear);}target=null;}}
      else if(!shops.has(shop.id)){target=shop;id=shop.id;if(distance(p,shop)<100){const offers=shop.stock.filter(i=>!['tea','potion'].includes(i.id)&&i.left&&i.price<=s.journal.coins&&!s.gear.inventory.some(g=>g.id===i.id)),offer=offers.find(i=>GEAR_BY_ID[i.id].set===options.build)||offers[0];if(offer){buy(s,shop.id,offer.id);wear(offer.id);}else buy(s,shop.id,'potion');shops.add(shop.id);target=null;}}
      else if(!event.used){target=event;id=event.id;if(distance(p,event)<100){const e=EVENTS[event.event];const choice=e.id==='bell'&&options.challenge?e.choices[0]:e.choices[1];if(!chooseEvent(s,event.id,choice.id)&&e.choices[0])chooseEvent(s,event.id,e.choices[0].id);target=null;}}
      else if(s.story.tasks.some(t=>!t.complete)&&s.beacons.some(b=>b.lit)){target=s.beacons.filter(b=>b.lit).reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='delivery-'+target.id;}
      if(!target&&options.risk&&s.pois.some(p=>p.kind==='risk'&&!p.used)){target=s.pois.find(p=>p.kind==='risk'&&!p.used);id=target.id;if(distance(p,target)<100){openPOI(s,target.id);target=null;}}
      if(!target&&options.followups&&followupAvailable(s,npc)){target=npc;id='followup-'+npc.id;if(distance(p,npc)<100){const arc=ARCS[npc.npc],choice=arc.choices[options.followups==='paid'?1:0];chooseContinuation(s,npc.id,choice.id);target=null;}}
      for(const item of s.gear.inventory)if(item.level<3&&forgeCost(item,s)<=s.journal.coins-(shops.has(shop.id)?0:22)-(options.followups==='paid'?8:0)&&s.gear.slots.lamp===item.id)forge(s,item.id);
      if(options.build)for(const item of s.gear.inventory)if(GEAR_BY_ID[item.id].set===options.build)wear(item.id);
    }
    if(options.camp&&s.litTotal>0){target=s.beacons.find(b=>b.lit);id='camp';}
    if(options.campBoss&&s.bossSpawned&&!s.bossDefeated){target=s.beacons.filter(b=>b.lit).reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='boss-camp'+target.id;}
    if(!target&&unlit.length&&p.embers>=4){target=unlit.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);id=`lamp${s.chapter}:${target.id}`;}
    else if(!target&&unlit.length){
      target=s.embers.reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='ember'+target?.id;
    }else if(!target&&!s.exit.open&&s.bossSpawned){
      const boss=s.enemies.find(e=>e.kind==='boss');target=s.beacons.reduce((a,b)=>distance(b,boss||p)<distance(a,boss||p)?b:a);id='boss-safe'+target.id;
    }else if(!target){target=s.exit;id='exit';}
    if(s.v12&&options.respond!==false&&!options.camp&&!options.campBoss){
      if(p.hp<p.maxHp*.45)usePotion(s);
      const boss=s.enemies.find(e=>e.kind==='boss'&&e.hp>0);
      if(boss&&!s.exit.open&&distance(p,boss)>340){const d=distance(p,boss),point=safePoint(s,{x:boss.x+(p.x-boss.x)/d*260,y:boss.y+(p.y-boss.y)/d*260},20);if(point){target=point;id='approach-boss';}}
      const cast=s.enemies.find(e=>e.cast>0&&e.castType==='beam'&&pointSegmentDistance(p,e,{x:e.castX,y:e.castY})<100);
      if(cast){const dx=cast.castX-cast.x,dy=cast.castY-cast.y,d=Math.hypot(dx,dy),points=[1,-1].map(sign=>({x:p.x-dy/d*180*sign,y:p.y+dx/d*180*sign})),point=points.find(q=>!collides(s,q.x,q.y,22));if(point){target=point;id='evade-'+cast.id;}if(cast.cast<.5)dash(s);}
    }
    if(!target)break;
    repath-=.05;if(id!==targetId||repath<=0){path=route(s,target);targetId=id;repath=1.5;}
    while(path.length>1&&distance(p,path[0])<18)path.shift();
    const aim=path[0]||target,d=distance(p,aim);let x=0,y=0;
    if(d>8){x=(aim.x-p.x)/d;y=(aim.y-p.y)/d;}
    if(!options.noPulse&&s.enemies.some(e=>e.warning<=0&&distance(e,p)<p.pulseRadius-10))pulse(s);
    tick(s,{x,y},.05);
    options.observe?.(s);
    // Camp probes may intentionally stop before the ending and are labeled as such.
    if(options.stopWhen?.(s))break;
    if(options.resume&&frame%280===279&&['playing','upgrade'].includes(s.phase)){const saved=restore(serialize(s));if(!saved)throw new Error('Full journey produced an invalid save');s=saved;}
  }
  return {seed,difficulty,phase:s.phase,chapter:s.chapter+1,beacons:s.litTotal,time:Math.round(s.totalTime),score:finalScore(s),hp:Math.round(s.player.hp),kills:s.kills,milestones,state:s};
}
if(process.argv[1]?.endsWith('journey-bot.mjs'))for(const difficulty of ['wander','normal','night'])for(const seed of [71,497,20261106]){const {state,...r}=playJourney(seed,difficulty);console.log(JSON.stringify(r));}
