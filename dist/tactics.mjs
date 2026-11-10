/** v1.5 telegraphed enemy actions, elite affixes and earned kill milestones. */
import {seedMix,clearLine,safePoint} from './routes.mjs';
export const isTactical=s=>s?.endless?.tactics?.version===1;
export const isEncounterAI=s=>isTactical(s)&&s.endless.draftSerial!==undefined&&s.endless.encounters?.version===1;
export const AFFIXES=['迅袭','震地','散射','震爆','追光'];
const emit=(s,type,data={})=>s.events.push({type,...data});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function initTactics(s){s.endless.tactics={version:1,eliteKills:0,milestones:0,phaseChanges:0};}
export function prepareEnemy(s,e){
 if(!isTactical(s))return;
 e.aiCd=e.kind==='boss'?.6:1.4+(e.id%4)*.22;e.aiSeq=0;e.enraged=false;e.shieldBrokenUntil=0;
 if(e.patrolElite){e.affix=seedMix(s.seed,e.id+s.endless.floor)%(s.endless.draftSerial!==undefined?5:3);e.damage*=1.12;if(e.affix===0)e.speed=Math.min(170,e.speed*1.16);}
}
export function interruptEnemy(s,e){
 if(!isTactical(s))return false;
 if(e.kind==='warder'){e.shieldBrokenUntil=s.totalTime+3;emit(s,'ward-break',{x:e.x,y:e.y});}
 if(!(e.cast>0||e.charging>0))return false;
 e.cast=0;e.charging=0;e.aiCd=2.5;return true;
}
/** Mixed enemy paths retain the existing cover-aware navigation. No player-idle state. */
export function encounterGoal(s,e){
 const p=s.player;if(!isEncounterAI(s)||e.kind==='boss'||e.patrolElite)return p;
 const dx=p.x-e.x,dy=p.y-e.y,d=Math.max(1,Math.hypot(dx,dy)),side=e.id%2?1:-1;
 let goal=p;
 const range=e.kind==='sniper'?620:280;
 if(['caster','sniper','warder'].includes(e.kind)&&d<range+140){
  goal={x:p.x-dx/d*range-dy/d*side*100,y:p.y-dy/d*range+dx/d*side*100};
 }else if(['shade','runner','charger'].includes(e.kind)&&d>120){
  const flank=Math.min(155,(d-120)*.5);
  goal={x:p.x-dy/d*side*flank,y:p.y+dx/d*side*flank};
 }
 const safe=safePoint(s,goal,e.r+4);return safe&&clearLine(s,p,safe,e.r+2)?safe:p;
}
function begin(s,e,type,duration){
 const p=s.player,d=Math.max(1,distance(e,p)),range=type==='charge'?Math.min(520,d+90):type==='lunge'?Math.min(290,d+60):1100;
 e.castType=type;e.cast=duration;e.castMax=duration;e.castX=e.x+(p.x-e.x)/d*range;e.castY=e.y+(p.y-e.y)/d*range;
 if(e.kind==='boss'){s.v12.bossCasts++;emit(s,'boss-warning',{text:({beam:'锁线光束 · 侧移或光环打断',charge:'猎手冲锋 · 躲开锁定路线',rain:'环形弹幕 · 寻找弹隙，光环清弹',nova:'震荡光环 · 贴近内圈或退到圈外',volley:'扇形连射 · 横移，保持距离'})[type]});}
 else emit(s,'enemy-warning',{x:e.x,y:e.y,kind:e.kind});
}
function volley(s,e,count,speed,arc){
 const a=Math.atan2(e.castY-e.y,e.castX-e.x);
 for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*arc;s.projectiles.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7,enemy:true,life:3.3,damage:e.damage*.7,source:e.kind==='boss'?'夜航首领·扇形连射':'散射影兽·飞弹'});}
}
function resolve(s,e,hurt){
 const type=e.castType;
 if(type==='charge'||type==='lunge'){e.charging=type==='charge'?.55:.34;e.chargeVX=(e.castX-e.x)/e.charging;e.chargeVY=(e.castY-e.y)/e.charging;}
 else if(type==='slam'||type==='nova'){
  const radius=type==='nova'?270:175,d=distance(e,s.player);
  if(d<radius+s.player.r&&(type!=='nova'||d>86-s.player.r))hurt(s,e.damage*1.15,type==='nova'?'首领·震荡光环':'重装影兽·震地');
  s.effects.push({type:'hostile-ring',x:e.x,y:e.y,r:radius,inner:type==='nova'?86:0,life:.45,maxLife:.45});
 }else if(type==='volley')volley(s,e,e.kind==='boss'?e.enraged?7:5:isEncounterAI(s)&&s.endless.weather==='storm'?5:3,e.kind==='boss'?205:215,.19);
 else if(type==='beam'){
  const dx=e.castX-e.x,dy=e.castY-e.y,t=Math.max(0,Math.min(1,((s.player.x-e.x)*dx+(s.player.y-e.y)*dy)/(dx*dx+dy*dy||1)));
  const radius=e.kind==='sniper'?18:34;
  if(Math.hypot(s.player.x-e.x-dx*t,s.player.y-e.y-dy*t)<radius+s.player.r&&(!isEncounterAI(s)||clearLine(s,e,s.player,2)))hurt(s,e.damage*1.4,e.kind==='sniper'?'远望影兽·锁线狙击':'首领·锁线光束');
  s.effects.push({type:'beam',x:e.x,y:e.y,toX:e.castX,toY:e.castY,r:radius,life:.3,maxLife:.3});
 }else if(type==='rain'){
  const count=e.enraged?18:14;
  for(let i=0;i<count;i++){const a=e.angle+i*Math.PI*2/count;s.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,r:7,enemy:true,life:3.7,damage:e.damage*.6,source:'首领·环形弹幕'});}e.angle+=.31;
 }
 emit(s,'enemy-attack',{x:e.x,y:e.y,kind:e.kind,attack:type});
}
export function tickEnemy(s,e,dt,hurt,move){
 if(!isTactical(s))return false;
 if(e.kind==='boss'&&!e.enraged&&e.hp<=e.maxHp*.5){e.enraged=true;s.endless.tactics.phaseChanges++;emit(s,'boss-enrage',{x:e.x,y:e.y});}
 if(e.charging>0){e.charging=Math.max(0,e.charging-dt);move(s,e,e.chargeVX,e.chargeVY,dt);if(distance(e,s.player)<e.r+s.player.r+6)hurt(s,e.damage*1.2,e.kind==='boss'?'首领·冲锋':'迅袭影兽·扑击');return true;}
 if(e.cast>0){e.cast=Math.max(0,e.cast-dt);if(e.cast===0){resolve(s,e,hurt);e.aiCd=(e.kind==='boss'?(e.enraged?2.6:3.7):e.patrolElite?4:isEncounterAI(s)?(['caster','sniper','warder'].includes(e.kind)?3.1:3.8):5.2);}return true;}
 e.aiCd=(e.aiCd??1.6)-dt;if(e.aiCd>0)return false;
 const d=distance(e,s.player);let type='';
 if(e.kind==='boss'){
  const patterns=[['beam','nova','volley'],['charge','volley','nova'],['rain','beam','nova'],['nova','rain','charge'],['volley','beam','nova']][e.bossType||0];
  type=patterns[(e.aiSeq||0)%patterns.length];e.aiSeq=(e.aiSeq||0)+1;
 }else if(e.patrolElite){type=({0:'lunge',1:'slam',2:'volley',3:'nova',4:'beam'})[e.affix]||'volley';if(['slam','nova'].includes(type)&&d>360)return false;}
 else if(e.kind==='charger'&&d<470)type='lunge';
 else if(e.kind==='sniper'&&d<930)type=isEncounterAI(s)?'beam':'volley';
 else if(e.kind==='bulwark'&&d<350)type='nova';
 else if(e.kind==='runner'&&d<330)type='lunge';
 else if(e.kind==='brute'&&d<285)type='slam';
 else if(e.kind==='caster'&&d<600)type='volley';
 else if(e.kind==='warder'&&d<480)type='volley';
 if(!type)return false;
 begin(s,e,type,e.kind==='boss'?1.05:type==='beam'?1.15:type==='lunge'?.72:.95);return true;
}
export function rewardKill(s,e){
 if(!isTactical(s))return;
 const t=s.endless.tactics,combo=s.journal.combo;
 if(e.patrolElite){t.eliteKills++;emit(s,'elite-defeated',{x:e.x,y:e.y,affix:e.affix,coins:e.rewardCoins||0});}
 if([6,12,25,50,100].includes(combo)){
  t.milestones++;s.player.dashCd=Math.max(0,s.player.dashCd-.5);
  const coins=combo>=25?3:combo>=12?2:0;if(coins){s.journal.coins+=coins;s.metrics.coinsEarned+=coins;}
  emit(s,'combo-milestone',{combo,coins,text:combo>=50?'势不可挡':combo>=25?'夜路横扫':combo>=12?'连斩如风':'破阵连斩'});
 }
}
export function validateTactics(s){
 const t=s.endless?.tactics;if(t===undefined)return true;
 if(!t||t.version!==1||['eliteKills','milestones','phaseChanges'].some(k=>!Number.isSafeInteger(t[k])||t[k]<0))return false;
 for(const e of s.enemies){
  for(const k of ['aiCd','aiSeq','shieldBrokenUntil'])if(e[k]!==undefined&&!Number.isFinite(e[k]))return false;
  if(e.aiSeq!==undefined&&(!Number.isSafeInteger(e.aiSeq)||e.aiSeq<0))return false;
  if(e.cast>0&&!['charge','lunge','slam','nova','volley','rain','beam'].includes(e.castType))return false;
  if(e.affix!==undefined&&![0,1,2,3,4].includes(e.affix)||e.enraged!==undefined&&typeof e.enraged!=='boolean')return false;
 }
 return true;
}
