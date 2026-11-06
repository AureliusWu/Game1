import {createGame,tick,pulse,chooseUpgrade,collides,distance,finalScore,WORLD} from '../dist/core.mjs';
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
export function playJourney(seed,difficulty='normal'){
  const s=createGame({seed,difficulty});let path=[],targetId='',repath=0;const milestones=[];
  for(let frame=0;frame<24000&&s.phase!=='won'&&s.phase!=='lost';frame++){
    if(s.phase==='upgrade'){milestones.push({chapter:s.chapter+1,time:s.totalTime});const id=s.offered.includes('spark')?'spark':s.offered.includes('lantern')?'lantern':s.offered[0];chooseUpgrade(s,id);path=[];targetId='';}
    const p=s.player,unlit=s.beacons.filter(b=>!b.lit);let target,id;
    if(unlit.length&&p.embers>=4){target=unlit.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);id=`lamp${s.chapter}:${target.id}`;}
    else if(unlit.length){
      target=s.embers.reduce((a,b)=>!a||distance(p,b)<distance(p,a)?b:a,null);id='ember'+target?.id;
    }else if(!s.exit.open&&s.bossSpawned){
      const boss=s.enemies.find(e=>e.kind==='boss');target=s.beacons.reduce((a,b)=>distance(b,boss||p)<distance(a,boss||p)?b:a);id='boss-safe'+target.id;
    }else{target=s.exit;id='exit';}
    if(!target)break;
    repath-=.05;if(id!==targetId||repath<=0){path=route(s,target);targetId=id;repath=1.5;}
    while(path.length>1&&distance(p,path[0])<18)path.shift();
    const aim=path[0]||target,d=distance(p,aim);let x=0,y=0;
    if(d>8){x=(aim.x-p.x)/d;y=(aim.y-p.y)/d;}
    if(s.enemies.some(e=>e.warning<=0&&distance(e,p)<p.pulseRadius-10))pulse(s);
    tick(s,{x,y},.05);
  }
  return {seed,difficulty,phase:s.phase,chapter:s.chapter+1,beacons:s.litTotal,time:Math.round(s.totalTime),score:finalScore(s),hp:Math.round(s.player.hp),kills:s.kills,milestones,state:s};
}
if(process.argv[1]?.endsWith('journey-bot.mjs'))for(const difficulty of ['wander','normal','night'])for(const seed of [71,497,20261106]){const {state,...r}=playJourney(seed,difficulty);console.log(JSON.stringify(r));}
