import {createGame,tick,pulse,chooseUpgrade,collides,distance,finalScore,WORLD,serialize,restore} from '../dist/core.mjs';
import {openPOI,chooseStory,equip,forge,forgeCost,buy,chooseEvent,usePotion} from '../dist/systems.mjs';
import {EVENTS,NPCS} from '../dist/content.mjs';
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
  let s=createGame({seed,difficulty,contract:options.systems?'letters':'lamps',id:`bot-${seed}-${difficulty}-${options.share?'share':'promise'}`});let path=[],targetId='',repath=0;const milestones=[],shops=new Set();
  for(let frame=0;frame<24000&&s.phase!=='won'&&s.phase!=='lost';frame++){
    if(s.phase==='upgrade'){milestones.push({chapter:s.chapter+1,time:s.totalTime});const id=s.offered.includes('spark')?'spark':s.offered.includes('lantern')?'lantern':s.offered[0];chooseUpgrade(s,id);path=[];targetId='';}
    const p=s.player,unlit=s.beacons.filter(b=>!b.lit);let target,id;
    if(options.systems){
      const npc=s.pois.find(p=>p.kind==='npc'),chest=s.pois.find(p=>p.kind==='chest'),shop=s.pois.find(p=>p.kind==='shop'),event=s.pois.find(p=>p.kind==='event');
      if(!npc.used){
        if(options.share&&p.embers<2){target=s.embers.reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='story-ember'+target?.id;}
        else {target=npc;id=npc.id;if(distance(p,npc)<100){chooseStory(s,npc.id,options.share?'share':'promise');target=null;}}
      }else if(!chest.used){target=chest;id=chest.id;if(distance(p,chest)<100){const loot=openPOI(s,chest.id);if(loot?.gear){equip(s,loot.gear);forge(s,loot.gear);}target=null;}}
      else if(!shops.has(shop.id)){target=shop;id=shop.id;if(distance(p,shop)<100){const offer=shop.stock.find(i=>!['tea','potion'].includes(i.id)&&i.left&&i.price<=s.journal.coins&&!s.gear.inventory.some(g=>g.id===i.id));if(offer){buy(s,shop.id,offer.id);equip(s,offer.id);}else buy(s,shop.id,'potion');shops.add(shop.id);target=null;}}
      else if(!event.used){target=event;id=event.id;if(distance(p,event)<100){const e=EVENTS[event.event];const choice=e.id==='bell'&&options.challenge?e.choices[0]:e.choices[1];if(!chooseEvent(s,event.id,choice.id)&&e.choices[0])chooseEvent(s,event.id,e.choices[0].id);target=null;}}
      else if(s.story.tasks.some(t=>!t.complete)&&s.beacons.some(b=>b.lit)){target=s.beacons.filter(b=>b.lit).reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='delivery-'+target.id;}
      if(p.hp<p.maxHp*.45)usePotion(s);
      for(const item of s.gear.inventory)if(item.level<3&&forgeCost(item)<=s.journal.coins&&s.gear.slots.lamp===item.id)forge(s,item.id);
    }
    if(!target&&unlit.length&&p.embers>=4){target=unlit.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);id=`lamp${s.chapter}:${target.id}`;}
    else if(!target&&unlit.length){
      target=s.embers.reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='ember'+target?.id;
    }else if(!target&&!s.exit.open&&s.bossSpawned){
      const boss=s.enemies.find(e=>e.kind==='boss');target=s.beacons.reduce((a,b)=>distance(b,boss||p)<distance(a,boss||p)?b:a);id='boss-safe'+target.id;
    }else if(!target){target=s.exit;id='exit';}
    if(!target)break;
    repath-=.05;if(id!==targetId||repath<=0){path=route(s,target);targetId=id;repath=1.5;}
    while(path.length>1&&distance(p,path[0])<18)path.shift();
    const aim=path[0]||target,d=distance(p,aim);let x=0,y=0;
    if(d>8){x=(aim.x-p.x)/d;y=(aim.y-p.y)/d;}
    if(s.enemies.some(e=>e.warning<=0&&distance(e,p)<p.pulseRadius-10))pulse(s);
    tick(s,{x,y},.05);
    if(options.resume&&frame%280===279&&['playing','upgrade'].includes(s.phase)){const saved=restore(serialize(s));if(!saved)throw new Error('Full journey produced an invalid save');s=saved;}
  }
  return {seed,difficulty,phase:s.phase,chapter:s.chapter+1,beacons:s.litTotal,time:Math.round(s.totalTime),score:finalScore(s),hp:Math.round(s.player.hp),kills:s.kills,milestones,state:s};
}
if(process.argv[1]?.endsWith('journey-bot.mjs'))for(const difficulty of ['wander','normal','night'])for(const seed of [71,497,20261106]){const {state,...r}=playJourney(seed,difficulty);console.log(JSON.stringify(r));}
