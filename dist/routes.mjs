/** Authored, connected street templates and bounded, radius-aware navigation. */
const W=1880,H=1380,CELL=50;
export const ROUTE_NAMES=['灯下大街','雨棚回廊','钟楼侧巷'];
const lamps=[
 [[570,420,980,995,1410,400],[520,960,1030,390,1450,1000],[510,360,970,1030,1470,390]],
 [[500,995,990,385,1460,945],[530,410,1040,1000,1450,390],[510,1020,960,390,1470,1000]],
 [[520,420,1010,1000,1450,430],[540,980,1040,390,1460,960],[500,360,980,1050,1460,400]]
];
const covers=[
 [[400,660,190,86],[780,530,110,160],[1110,680,180,85],[1200,220,130,85],[680,1120,145,80],[1530,700,90,155],[290,220,100,85],[1590,1110,125,78]],
 [[430,590,150,100],[760,350,135,110],[1120,670,150,85],[1190,1080,140,85],[690,1120,120,80],[1550,700,100,150],[300,200,100,85],[1580,230,115,90]],
 [[390,650,180,90],[750,470,120,150],[1110,720,150,85],[1190,200,130,80],[680,1120,145,80],[1550,700,100,150],[310,220,100,85],[1580,1110,110,80]]
];
export function seedMix(seed,salt){let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return(x^(x>>>15))>>>0;}
export function blocked(s,x,y,r=15){return x<65+r||y<65+r||x>W-65-r||y>H-65-r||s.obstacles.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h);}
export function applyLayout(s){
 const v=s.v12,index=v.firstJourney?0:seedMix(s.seed,s.chapter+40)%3;v.layout=index;
 const points=lamps[s.chapter][index];
 s.beacons=Array.from({length:3},(_,i)=>({id:i,x:points[i*2],y:points[i*2+1],lit:false,progress:0,cost:4,r:38}));
 s.obstacles=covers[index].map(([x,y,w,h])=>({x,y:s.chapter===1?H-y-h:y,w,h}));
 // Facilities occupy authored open plazas across all nine combinations.
}
export function clearLine(s,a,b,r=15){
 if(blocked(s,a.x,a.y,r)||blocked(s,b.x,b.y,r))return false;
 // Exact segment/expanded-rectangle clipping avoids corner gaps between samples.
 for(const o of s.obstacles){
  let lo=0,hi=1,intersects=true;
  for(const [start,delta,min,max]of [[a.x,b.x-a.x,o.x-r,o.x+o.w+r],[a.y,b.y-a.y,o.y-r,o.y+o.h+r]]){
   if(Math.abs(delta)<1e-9){if(start<=min||start>=max){intersects=false;break;}continue;}
   const t0=(min-start)/delta,t1=(max-start)/delta;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>=hi){intersects=false;break;}
  }
  if(intersects)return false;
 }
 return true;
}
export function safePoint(s,point,r=25){if(!blocked(s,point.x,point.y,r))return point;for(let radius=40;radius<=240;radius+=40)for(let i=0;i<12;i++){const a=i*Math.PI/6,p={x:point.x+Math.cos(a)*radius,y:point.y+Math.sin(a)*radius};if(!blocked(s,p.x,p.y,r))return p;}return null;}
export function findPath(s,start,goal,r=15){
 if(clearLine(s,start,goal,r))return [{x:goal.x,y:goal.y}];
 const cols=Math.floor((W-130)/CELL),rows=Math.floor((H-130)/CELL),point=i=>({x:90+(i%cols)*CELL,y:90+Math.floor(i/cols)*CELL});
 const nearest=(p,strict)=>{let best=-1,score=Infinity;for(let i=0;i<cols*rows;i++){const q=point(i),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<score&&!blocked(s,q.x,q.y,r)&&(!strict||clearLine(s,p,q,r))){best=i;score=d;}}return best;};
 const from=nearest(start,true),to=nearest(goal,!blocked(s,goal.x,goal.y,r));if(from<0||to<0)return [];
 const queue=[from],parents=new Map([[from,-1]]);
 for(let n=0;n<queue.length&&!parents.has(to);n++){
  const id=queue[n],x=id%cols,y=Math.floor(id/cols),a=point(id);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const nx=x+dx,ny=y+dy,k=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||parents.has(k))continue;
   const b=point(k);if(blocked(s,b.x,b.y,r)||!clearLine(s,a,b,r))continue;parents.set(k,id);queue.push(k);
  }
 }
 if(!parents.has(to))return [];
 const path=[];for(let i=to;i!==-1;i=parents.get(i))path.push(point(i));path.reverse();
 if(clearLine(s,path.at(-1),goal,r))path.push({x:goal.x,y:goal.y});return path;
}
export function pursuit(s,e,target){
 if(clearLine(s,e,target,e.r+1)){e.path=[];return target;}
 if((!e.path?.length||s.totalTime>=(e.repathAt||0))&&s.v12.pathBudget>0){s.v12.pathBudget--;e.path=findPath(s,e,target,e.r+1);e.repathAt=s.totalTime+1.15;}
 while(e.path?.length>1&&Math.hypot(e.x-e.path[0].x,e.y-e.path[0].y)<5)e.path.shift();
 return e.path?.[0]||target;
}
