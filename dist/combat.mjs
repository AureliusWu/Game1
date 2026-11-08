/** v1.4 combat rules. Opt-in per run so v1.3 saves retain their original balance. */
import {clearLine} from './routes.mjs';
export const isCombat=s=>s?.endless?.combat?.version===1;
export const overdriving=s=>isCombat(s)&&s.endless.combat.overdriveUntil>s.totalTime;
/** New-run active-play reward; saves created before v1.9 keep their original combat. */
export const flowOn=s=>s?.endless?.flow?.version===1;
export const flowing=s=>flowOn(s)&&s.endless.flow.boostUntil>s.totalTime;
export const flowMultiplier=s=>flowing(s)?1.25:1;
export const flowCharge=s=>flowOn(s)&&s.endless.flow.chainUntil>s.totalTime?s.endless.flow.chain:0;
export function breakCombatFlow(s){
 if(!flowOn(s))return;
 const f=s.endless.flow,active=flowing(s);
 f.chain=0;f.chainUntil=s.totalTime;f.boostUntil=s.totalTime;
 if(active)s.events.push({type:'flow-break',x:s.player.x,y:s.player.y});
}
export function validateFlow(s){
 const f=s.endless?.flow;if(f===undefined)return true;
 if(!f||f.version!==1||!Number.isInteger(f.chain)||f.chain<0||f.chain>3||!Number.isSafeInteger(f.procs)||f.procs<0)return false;
 return ['chainUntil','boostUntil'].every(k=>Number.isFinite(f[k])&&f[k]>=0&&f[k]<=s.totalTime+5.001);
}
const emit=(s,type,data={})=>s.events.push({type,...data});
export function initCombat(s){s.endless.combat={version:1,heat:0,overdriveUntil:0,overdrives:0,dashSerial:0,dashHits:0,roomStart:0,lastClearTime:0,perfects:0,lastPerfect:false,burstPending:false};}
export function combatStats(s,st){
 if(!isCombat(s))return;
 st.attackRate*=.72;st.pickup+=24;st.dashMax-=.35;st.pulseMax-=.7;
}
export function damageEnemy(s,e,amount,{slow=0,critical=false,source='weapon',stun=.07}={}){
 if(e.hp<=0||e.warning>0||!(amount>0))return 0;
 const damage=Math.min(e.hp,amount);e.hp-=amount;e.stun=Math.max(e.stun||0,stun);
 if(slow)e.slowUntil=Math.max(e.slowUntil||0,s.totalTime+slow);
 emit(s,'damage-number',{enemyId:e.id,x:e.x,y:e.y,damage:Math.max(1,Math.round(damage)),critical,source});
 emit(s,'impact',{enemyId:e.id,x:e.x,y:e.y,critical,heavy:source==='dash'||source==='pulse'});
 return damage;
}
export function beginCombatDash(s){
 if(!isCombat(s))return;s.endless.combat.dashSerial++;
 // A dash can immediately follow an auto shot; it never cancels a weapon cycle.
 s.player.attackCd=Math.min(s.player.attackCd,.12);
}
export function strikeCombatDash(s,from){
 if(!isCombat(s)||s.player.dash<=0)return;
 const p=s.player,c=s.endless.combat,dx=p.x-from.x,dy=p.y-from.y,l2=dx*dx+dy*dy;
 if(l2<.01)return;
 let hits=0;
 for(const e of s.enemies){
  if(e.hp<=0||e.warning>0||e.lastDashSerial===c.dashSerial)continue;
  const t=Math.max(0,Math.min(1,((e.x-from.x)*dx+(e.y-from.y)*dy)/l2));
  if(Math.hypot(e.x-from.x-t*dx,e.y-from.y-t*dy)>e.r+33||!clearLine(s,p,e,2))continue;
  e.lastDashSerial=c.dashSerial;damageEnemy(s,e,(p.damage*1.25+p.pulseDamage*.18)*(overdriving(s)?1.25:1)*flowMultiplier(s),{source:'dash',stun:.28});hits++;
 }
 if(hits){
  c.dashHits+=hits;emit(s,'dash-hit',{x:p.x,y:p.y,hits});
  if(flowOn(s)){
   const f=s.endless.flow;
   if(f.chainUntil<=s.totalTime)f.chain=0;
   f.chain+=Math.min(3,hits);f.chainUntil=s.totalTime+5;
   if(f.chain>=4){
    f.chain=0;f.boostUntil=s.totalTime+4;f.procs++;
    p.pulseCd=Math.max(0,p.pulseCd-1.8);p.dashCd=Math.max(.35,p.dashCd-.6);
    s.effects.push({type:'flow-burst',x:p.x,y:p.y,r:135,life:.38,maxLife:.38});
    emit(s,'flow-surge',{x:p.x,y:p.y,hits});
   }else emit(s,'flow-charge',{x:p.x,y:p.y,chain:f.chain});
  }
 }
 s.effects.push({type:'dash-cut',x:from.x,y:from.y,toX:p.x,toY:p.y,r:33,life:.22,maxLife:.22});
}
export function chargeCombat(s,e){
 if(!isCombat(s)||overdriving(s))return;
 const c=s.endless.combat;c.heat=Math.min(100,c.heat+(e.kind==='boss'?45:e.patrolElite?22:10));
 if(c.heat<100)return;
 c.heat=0;c.overdriveUntil=s.totalTime+6;c.overdrives++;
 s.player.dashCd=0;s.player.pulseCd=0;s.player.attackCd=0;
 // The payoff opens space, but doesn't refill health or grant invulnerability.
 c.burstPending=true;
 s.projectiles=s.projectiles.filter(b=>!b.enemy||Math.hypot(b.x-s.player.x,b.y-s.player.y)>245);
 s.effects.push({type:'overdrive',x:s.player.x,y:s.player.y,r:245,life:.65,maxLife:.65});
 emit(s,'overdrive',{x:s.player.x,y:s.player.y});
}
export function updateCombatBurst(s){
 if(!isCombat(s)||!s.endless.combat.burstPending)return;s.endless.combat.burstPending=false;
 for(const e of s.enemies)if(Math.hypot(e.x-s.player.x,e.y-s.player.y)<245+e.r)damageEnemy(s,e,s.player.pulseDamage*.85,{source:'burst',stun:.35});
}
export function finishCombatRoom(s){
 if(!isCombat(s))return;const c=s.endless.combat;
 c.lastClearTime=s.totalTime-c.roomStart;c.lastPerfect=s.damageTaken===s.endless.roomDamage;
 if(c.lastPerfect){c.perfects++;s.score+=200;s.journal.coins+=6;s.metrics.coinsEarned+=6;emit(s,'perfect-clear');}
}
export function validateCombat(s){
 const c=s.endless.combat;if(c===undefined)return true;
 if(!c||c.version!==1)return false;
 for(const key of ['heat','overdriveUntil','roomStart','lastClearTime'])if(!Number.isFinite(c[key])||c[key]<0)return false;
 for(const key of ['overdrives','dashSerial','dashHits','perfects'])if(!Number.isSafeInteger(c[key])||c[key]<0)return false;
 return c.heat<100&&c.overdriveUntil<=s.totalTime+6.001&&c.roomStart<=s.totalTime&&typeof c.lastPerfect==='boolean'&&typeof c.burstPending==='boolean';
}
