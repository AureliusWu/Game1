/** v1.2 rules and telemetry; no browser or rendering dependencies. */
import {CONDITIONS} from './content.mjs';
import {seedMix} from './routes.mjs';
export const modern=s=>s.rulesVersion===120;
export const has=(s,id)=>s.upgrades.includes(id);
export const condition=(s,id)=>modern(s)&&!!s.v12?.conditions.includes(id);
export function randomStream(s,key){const v=s.v12;v[key]=(v[key]+0x6D2B79F5)>>>0;let t=v[key];t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
export function initExpedition(s,{mode='story',conditions=[],firstJourney=false}={}){
 s.rulesVersion=120;
 s.v12={mode:mode==='challenge'?'challenge':'story',conditions:[...new Set(conditions.filter(id=>CONDITIONS.some(c=>c.id===id)))],firstJourney:!!firstJourney,
  mapRng:seedMix(s.seed,1),lootRng:seedMix(s.seed,2),layout:0,patrolLeft:0,goldLeft:0,xpLeft:0,goldClaimed:0,xpClaimed:0,pathBudget:2,
  combatUntil:0,tailwindUntil:0,tailwindReady:0,dashChargeUntil:0,barrierUntil:0,barrier:0,barrierSource:'',wardenBlocks:0,shield:0,shieldUntil:0,graceUntil:0,wasSafe:false,pulseBoost:0,echoReady:0,
  buildTaken:false,choiceKind:'',damageSources:{},healed:0,minHp:100,lowTime:0,barriers:0,echoes:0,tailwinds:0,interrupts:0,riskVisits:0,riskCleared:0,courierDeliveries:0,bossCasts:0};
}
export function heal(s,amount){const p=s.player,delta=Math.max(0,Math.min(amount,p.maxHp-p.hp));p.hp+=delta;if(modern(s))s.v12.healed+=delta;return delta;}
export function beginDistrict(s){const v=s.v12;v.patrolLeft=12+s.chapter*2;v.goldLeft=[40,55,70][s.chapter];v.xpLeft=[80,110,140][s.chapter];}
export function assignPatrolReward(s,e){const v=s.v12;if(v.patrolLeft<=0)return false;v.patrolLeft--;e.rewardCoins=Math.min(v.goldLeft,e.kind==='brute'?7:4);e.rewardXP=Math.min(v.xpLeft,e.kind==='brute'?12:6);v.goldLeft-=e.rewardCoins;v.xpLeft-=e.rewardXP;return true;}
export function receiveHit(s,amount,source='影兽'){
 const p=s.player,v=s.v12;if(p.invincible>0)return 0;
 v.combatUntil=s.totalTime+3;
 if(v.barrier&&s.totalTime<v.barrierUntil){v.barrier=0;v.barriers++;if(v.barrierSource==='warden')v.wardenBlocks++;p.invincible=.45;s.events.push({type:'shield'});return 0;}
 if(s.totalTime>=v.shieldUntil)v.shield=0;
 const absorbed=Math.min(v.shield,amount);v.shield-=absorbed;const damage=Math.max(0,amount-absorbed);
 p.hp-=damage;s.damageTaken+=damage;p.invincible=1.2;
 v.minHp=Math.max(0,Math.min(v.minHp,p.hp));
 if(damage>0)v.damageSources[source]=(v.damageSources[source]||0)+damage;
 s.events.push({type:'hurt',damage,source});return damage;
}
export function updateExpedition(s,dt,safe){
 const v=s.v12,p=s.player;
 v.pathBudget=2;
 if(s.enemies.some(e=>e.hp>0&&e.warning<=0&&Math.hypot(e.x-p.x,e.y-p.y)<340))v.combatUntil=Math.max(v.combatUntil,s.totalTime+3);
 if(v.wasSafe&&!safe)v.graceUntil=s.totalTime+3;v.wasSafe=safe;
 if(s.totalTime>=v.barrierUntil)v.barrier=0;if(s.totalTime>=v.shieldUntil)v.shield=0;
 v.minHp=Math.max(0,Math.min(v.minHp,p.hp));if(p.hp<p.maxHp*.3)v.lowTime+=dt;
}
export function sanctuaryRate(s,beacon){if(!modern(s))return 12;if((beacon.suppressedUntil||0)>s.totalTime)return 0;if(s.difficulty==='wander'||s.totalTime>=s.v12.combatUntil)return 12;return s.difficulty==='night'?2:3;}
export function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
export function tickCast(s,e,dt,hurt){
 if(e.kind==='boss'){
  if(!e.cast&&!e.stage70&&e.hp<=e.maxHp*.7){e.stage70=true;e.castType='suppress';const b=s.beacons.filter(b=>b.lit).sort((a,b)=>Math.hypot(a.x-s.player.x,a.y-s.player.y)-Math.hypot(b.x-s.player.x,b.y-s.player.y))[0];if(b)e.castBeacon=b.id;e.cast=s.difficulty==='night'?.9:1.2;e.castMax=e.cast;s.v12.bossCasts++;s.events.push({type:'boss-warning',text:'灯下将被压制，换一盏灯继续战斗。'});}
  else if(!e.cast&&e.hp<=e.maxHp*.35&&s.totalTime>=(e.beamReady||0))startBeam(s,e,s.difficulty==='night'?.9:1.2);
 }else if(e.kind==='caster'&&!e.cast&&s.totalTime>=(e.beamReady||0)&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<560)startBeam(s,e,1.15);
 if(!(e.cast>0))return false;e.cast-=dt;
 if(e.cast<=0){
  if(e.castType==='suppress'){const b=s.beacons.find(b=>b.id===e.castBeacon);if(b)b.suppressedUntil=s.totalTime+7;s.events.push({type:'suppression'});}
  else {if(pointSegmentDistance(s.player,e,{x:e.castX,y:e.castY})<38+s.player.r)hurt(s,e.kind==='boss'?38:18,e.kind==='boss'?'守夜者·定向回声':'远程投影');s.effects.push({type:'beam',x:e.x,y:e.y,toX:e.castX,toY:e.castY,r:40,life:.3,maxLife:.3});}
  e.beamReady=s.totalTime+(e.kind==='boss'?6:4.5);e.cast=0;
 }
 return true;
}
function startBeam(s,e,duration){const p=s.player,d=Math.max(1,Math.hypot(p.x-e.x,p.y-e.y));e.castType='beam';e.cast=duration;e.castMax=duration;e.castX=e.x+(p.x-e.x)/d*1000;e.castY=e.y+(p.y-e.y)/d*1000;if(e.kind==='boss'){s.v12.bossCasts++;s.events.push({type:'boss-warning',text:'定向回声正在蓄力：侧移、冲刺，或用近身光环打断。'});}}
export function validateExpedition(s){
 const v=s.v12;if(!v||!['story','challenge'].includes(v.mode)||!Array.isArray(v.conditions)||v.conditions.length>4||new Set(v.conditions).size!==v.conditions.length||v.conditions.some(id=>!CONDITIONS.some(c=>c.id===id)))return false;
 for(const key of ['mapRng','lootRng','layout','patrolLeft','goldLeft','xpLeft','goldClaimed','xpClaimed','pathBudget','combatUntil','tailwindUntil','tailwindReady','dashChargeUntil','barrierUntil','barrier','wardenBlocks','shield','shieldUntil','graceUntil','pulseBoost','echoReady','healed','minHp','lowTime','barriers','echoes','tailwinds','interrupts','riskVisits','riskCleared','courierDeliveries','bossCasts'])if(!Number.isFinite(v[key])||v[key]<0)return false;
 if(!['','warden','paper'].includes(v.barrierSource))return false;
 if(!Number.isInteger(v.mapRng)||!Number.isInteger(v.lootRng)||v.layout>2||v.patrolLeft>16||v.barrier>1||v.shield>20||typeof v.buildTaken!=='boolean'||typeof v.firstJourney!=='boolean'||typeof v.wasSafe!=='boolean'||!['','field','chapter'].includes(v.choiceKind))return false;
 if(s.phase==='upgrade'&&!s.endless&&!['field','chapter'].includes(v.choiceKind))return false;
 if(!v.damageSources||Object.entries(v.damageSources).some(([key,n])=>key.length>40||!Number.isFinite(n)||n<0))return false;
 return true;
}
