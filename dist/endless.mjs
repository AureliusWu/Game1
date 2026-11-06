/** Endless Night Flight. Pure rules: seeded drafts, bounded combat and atomic room rewards. */
import {seedMix,safePoint} from './routes.mjs';
const TAU=Math.PI*2;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const emit=(s,type,data={})=>s.events.push({type,...data});
export const isEndless=s=>s?.endless?.version===1;
export const SKILLS=[
 {id:'cinder',kind:'weapon',name:'爆焰行灯',symbol:'flame',color:'#ffb36b',desc:'光弹命中后爆炸，灼伤周围敌人。',detail:'每级增加爆炸范围与伤害。三级：冲刺留下火径。',partner:'haste',evolution:'不灭凤凰',evo:'爆炸连成火海，光弹额外锁定一个目标。'},
 {id:'frost',kind:'weapon',name:'霜降邮戳',symbol:'sun',color:'#9ddde1',desc:'每 3.4 秒释放冰环，伤害并减速附近敌人。',detail:'每级增加范围、伤害并缩短间隔。光环也会施加寒霜。',partner:'focus',evolution:'永冬回信',evo:'冰环冻结敌人，受寒霜的敌人承受更多光弹伤害。'},
 {id:'orbit',kind:'weapon',name:'回旋护羽',symbol:'wind',color:'#c7e2ad',desc:'两枚羽刃围绕烛羽旋转，切开近身的包围。',detail:'每级增加羽刃数量与伤害。冲刺期间羽刃加速。',partner:'wing',evolution:'千羽风暴',evo:'双层羽刃扩大守护范围，光环掀起羽刃风暴。'},
 {id:'thunder',kind:'weapon',name:'连锁雷笺',symbol:'star',color:'#d2b3ff',desc:'每 2.8 秒落下一道连锁雷，跳向其他敌人。',detail:'每级增加跳跃数量与伤害。光环使下一次雷击提前。',partner:'magnet',evolution:'万象雷网',evo:'雷电跳跃距离大增，并在终点引发雷爆。'},
 {id:'haste',kind:'passive',name:'急件封蜡',symbol:'letter',desc:'每级提高光弹与武器的出手速度 10%。',detail:'爆焰行灯 Lv.5 + 封蜡 Lv.2 → 不灭凤凰。'},
 {id:'might',kind:'passive',name:'余烬之心',symbol:'flame',desc:'每级提高所有伤害 18%。',detail:'影响光弹、光环、羽刃、冰环、雷电与火径。'},
 {id:'vitality',kind:'passive',name:'长明灯芯',symbol:'shield',desc:'每级增加 20 最大生命，并立即恢复 20。',detail:'多一点容错，才有机会看到构筑成型。'},
 {id:'magnet',kind:'passive',name:'引光罗盘',symbol:'star',desc:'每级扩大拾取距离 35，拾光回复增加 0.3。',detail:'连锁雷笺 Lv.5 + 罗盘 Lv.2 → 万象雷网。'},
 {id:'wing',kind:'passive',name:'顺风羽签',symbol:'wind',desc:'每级提高移速 7%，冲刺冷却减少 0.18 秒。',detail:'回旋护羽 Lv.5 + 羽签 Lv.2 → 千羽风暴。'},
 {id:'focus',kind:'passive',name:'静夜镜片',symbol:'sun',desc:'每级增加光弹暴击率 9%，暴击伤害更高。',detail:'霜降邮戳 Lv.5 + 镜片 Lv.2 → 永冬回信。'},
 {id:'sustain',kind:'passive',name:'暖炉信封',symbol:'tea',desc:'每击败 8 名敌人，按等级恢复 3 点生命。',detail:'回复需要主动击杀，站在灯下无法持续恢复。'},
 {id:'pulsecraft',kind:'passive',name:'震荡邮铃',symbol:'sun',desc:'每级提高光环伤害 22%，冷却减少 0.3 秒。',detail:'光环命中至少 3 名敌人时，获得一次短暂屏障。'}
];
export const SKILL_BY_ID=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
export const RELICS=[
 {id:'glass',name:'玻璃灯心',symbol:'flame',desc:'所有伤害提高 40%，最大生命减少 25%。'},
 {id:'hourglass',name:'倒流沙漏',symbol:'wind',desc:'冲刺冷却减少 30%，光环冷却增加 15%。'},
 {id:'ink',name:'雷雨墨水',symbol:'star',desc:'每次释放光环，立刻触发一轮连锁雷。'},
 {id:'lodestone',name:'失物磁石',symbol:'bag',desc:'拾取范围增加 160；每层清场时回复额外 8 点生命。'},
 {id:'coin',name:'烫金邮票',symbol:'coin',desc:'击杀获得的星砂增加 50%，向上取整。'},
 {id:'moon',name:'月白护符',symbol:'shield',desc:'每层进入时获得一次抵挡攻击的屏障。'},
 {id:'dawn',name:'第二次黎明',symbol:'sun',desc:'本局首次致命伤时复起至 50% 生命，获得 3 秒无敌。'},
 {id:'hunger',name:'饥火徽章',symbol:'flame',desc:'每 20 连击获得 5 秒狂热：伤害与移速提高 30%。'}
];
export const ROUTES=[
 {id:'hunt',name:'巡灯猎场',symbol:'flame',desc:'常规敌群与奖励。稳步补齐构筑。'},
 {id:'elite',name:'危险押运',symbol:'shield',desc:'敌群更强，出现精英。击杀星砂与经验提高 35%。'},
 {id:'cache',name:'奇物回廊',symbol:'chest',desc:'敌人数量减少 15%，远程敌人更多。清场额外挑选一件奇物。'},
 {id:'rest',name:'暖灯驿站',symbol:'tea',desc:'支付星砂，回复 35% 生命并补充一瓶药。下一层仍需战斗。'},
 {id:'curse',name:'烬潮险路',symbol:'star',desc:'本层敌人伤害提高 25%，清场额外获得一次强化与 25 星砂。'}
];
export const WEATHERS={calm:{name:'微光',desc:'常规夜路。'},storm:{name:'雷雨',desc:'雷圈锁定脚下，1.25 秒后落雷。保持移动。'},gale:{name:'疾风',desc:'敌人移速提高 18%，拾取距离增加 40。'},ash:{name:'烬雪',desc:'敌人生命提高 15%，拾光回复增加 50%。'}};
export const weatherFor=(s,floor=s.endless.floor)=>floor<4?'calm':['storm','gale','ash'][seedMix(s.seed,floor+877)%3];
export const rankOf=(s,id)=>s.endless?.ranks[id]||0;
export const evolved=(s,id)=>rankOf(s,id)>=5&&rankOf(s,SKILL_BY_ID[id]?.partner)>=2;
export const hasRelic=(s,id)=>!!s.endless?.relics.includes(id);
export const xpThreshold=level=>{const n=level-1;return 18*n+4*n*n;};
export function endlessRandom(s){const r=s.endless;r.rng=(r.rng+0x6D2B79F5)>>>0;let t=r.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
export function initEndless(s,starter='cinder'){
 if(!SKILLS.some(x=>x.id===starter&&x.kind==='weapon'))starter='cinder';
 s.endless={version:1,floor:1,cleared:0,route:'hunt',rng:seedMix(s.seed,130),ranks:{[starter]:1},relics:[],starter,
  remaining:0,total:0,roomKills:0,spawnIn:0,pending:0,choice:'',clearedRoom:false,rewardPending:false,
  rerolls:2,rerollsUsed:0,evolutions:[],bosses:0,bossMade:false,revived:false,retired:false,
  frostCd:1.3,thunderCd:1.8,fireCd:0,feverUntil:0,feverMark:0,ash:0,pools:[],zones:[],zoneCd:5,weather:'calm',market:[],roomDamage:0};
 s.v12.conditions=[];s.v12.firstJourney=false;s.journal.level=1;s.journal.xp=0;
}
export function applyEndlessStats(s,st){
 if(!isEndless(s))return;const r=s.endless;
 const power=(1+rankOf(s,'might')*.18+r.ash*.04)*(hasRelic(s,'glass')?1.4:1);
 st.damage*=power*(1+rankOf(s,'cinder')*.08);st.pulseDamage*=power*(1+rankOf(s,'pulsecraft')*.22);
 st.maxHp+=rankOf(s,'vitality')*20;if(hasRelic(s,'glass'))st.maxHp*=.75;
 st.attackRate*=.75*Math.pow(.9,rankOf(s,'haste'));st.attackTargets+=evolved(s,'cinder')?1:0;
 st.speed*=1+rankOf(s,'wing')*.07;st.dashMax-=rankOf(s,'wing')*.18;
 st.pulseMax-=rankOf(s,'pulsecraft')*.3;st.pickup+=rankOf(s,'magnet')*35+(hasRelic(s,'lodestone')?160:0);
 st.heal=(1+rankOf(s,'magnet')*.3)*(r.weather==='ash'?1.5:1);if(r.weather==='gale')st.pickup+=40;st.crit+=rankOf(s,'focus')*.09;
 if(hasRelic(s,'hourglass')){st.dashMax*=.7;st.pulseMax*=1.15;}
}
export function gainEndlessXP(s,amount){
 if(!(amount>0))return;const j=s.journal,r=s.endless;j.xp+=amount;
 while(j.xp>=xpThreshold(j.level+1)&&j.level<100000){j.level++;r.pending++;emit(s,'level',{level:j.level});}
}
export function configureEndlessRoom(s){
 const r=s.endless,n=r.floor,boss=n%5===0;
 r.total=boss?9+Math.min(12,Math.floor(n/5)*2):11+Math.min(42,n*2);
 if(r.route==='cache')r.total=Math.ceil(r.total*.85);
 r.remaining=r.total;r.roomKills=0;r.spawnIn=.6;r.bossMade=false;r.clearedRoom=false;r.rewardPending=false;r.choice='';r.roomDamage=s.damageTaken;r.pools=[];r.zones=[];r.zoneCd=4;r.weather=weatherFor(s);r.market=[];
 s.player.x=940;s.player.y=690;s.player.embers=Math.min(15,s.player.embers);s.player.invincible=2;
 s.beacons=[{x:650,y:430},{x:1230,y:430},{x:940,y:1040}].map((p,id)=>({...p,id,lit:false,progress:0,cost:5,r:38}));
 const k=seedMix(s.seed,n+130)%3;s.v12.layout=k;
 const covers=[[[490,590,100,100],[1290,800,110,90]],[[750,430,105,75],[1040,910,110,80]],[[520,910,120,75],[1260,430,100,80]]];
 s.obstacles=covers[k].map(([x,y,w,h])=>({x,y,w,h}));s.pois=[];
 s.exit={x:1740,y:690,r:58,open:false};s.embers=[];
 s.v12.patrolLeft=0;s.v12.goldLeft=0;s.v12.xpLeft=0;
 if(hasRelic(s,'moon')){s.v12.barrier=1;s.v12.barrierSource='paper';s.v12.barrierUntil=s.totalTime+3600;}
 emit(s,'floor',{floor:n,boss,route:r.route});
}
export function endlessEnemy(s,kind,stats){
 const r=s.endless,n=r.floor-1,elite=kind!=='boss'&&r.route==='elite'&&r.remaining%7===0;
 const scale=(1+n*.12+n*n*.012)*Math.pow(1.115,Math.min(400,Math.max(0,n-7)))*(r.weather==='ash'?1.15:1)*(kind==='boss'?1.8:1);
 return {...stats,hp:stats.hp*scale*(elite?2:1),maxHp:stats.hp*scale*(elite?2:1),speed:Math.min(170,stats.speed*(1+Math.min(n,30)*.012)*(r.weather==='gale'?1.18:1)),damage:stats.damage*(1+n*.045)*(r.route==='curse'?1.25:1),
  patrolElite:elite,rewardCoins:Math.ceil((kind==='boss'?35:elite?5:2)*(r.route==='elite'?1.35:1)*(hasRelic(s,'coin')?1.5:1)),rewardXP:Math.ceil((kind==='boss'?30:elite?12:6)*(r.route==='elite'?1.35:1)),bossType:Math.floor(r.floor/5)%3};
}
function hit(s,e,amount,slow=0){
 if(e.hp<=0||e.warning>0)return;e.hp-=amount;
 if(slow)e.slowUntil=Math.max(e.slowUntil||0,s.totalTime+slow);
 e.stun=Math.max(e.stun,.07);emit(s,'damage-number',{x:e.x,y:e.y,damage:Math.round(amount)});
}
function power(s){return(1+rankOf(s,'might')*.18+s.endless.ash*.04)*(hasRelic(s,'glass')?1.4:1)*(s.totalTime<s.endless.feverUntil?1.3:1);}
function area(s,point,radius,damage,type='blast',slow=0){
 for(const e of s.enemies)if(e.hp>0&&dist(e,point)<radius+e.r)hit(s,e,damage,slow);
 s.effects.push({type,x:point.x,y:point.y,r:radius,life:.45,maxLife:.45});
}
function chain(s,extra=false){
 const level=rankOf(s,'thunder');if(!level&&!extra)return;
 let from=s.player;const used=new Set(),evo=evolved(s,'thunder'),count=extra&&!level?3:2+level;
 for(let i=0;i<count;i++){
  const e=s.enemies.filter(e=>e.hp>0&&e.warning<=0&&!used.has(e.id)&&dist(e,from)<(i?evo?520:310:520)).sort((a,b)=>dist(a,from)-dist(b,from))[0];
  if(!e)break;used.add(e.id);hit(s,e,(18+level*7)*power(s));s.effects.push({type:'lightning',x:from.x,y:from.y,toX:e.x,toY:e.y,r:1,life:.22,maxLife:.22});from=e;
 }
 if(evo&&used.size)area(s,from,120,28*power(s),'lightning-burst');
 if(used.size)emit(s,'thunder');
}
export function orbitPositions(s){
 const level=rankOf(s,'orbit');if(!level)return [];
 const evo=evolved(s,'orbit'),count=level+1,positions=[];
 for(let i=0;i<count;i++){const a=s.totalTime*(s.player.dash>0?6:2.4)+i*TAU/count,r=evo&&i%2?155:85+level*6;positions.push({x:s.player.x+Math.cos(a)*r,y:s.player.y+Math.sin(a)*r});}return positions;
}
export function onEndlessBolt(s,target,bolt){
 if(rankOf(s,'cinder'))area(s,target,55+rankOf(s,'cinder')*9,(7+rankOf(s,'cinder')*4)*power(s),'blast');
 if(evolved(s,'cinder')){s.endless.pools.push({x:target.x,y:target.y,until:s.totalTime+1.4});s.endless.pools=s.endless.pools.slice(-14);}
 if(evolved(s,'frost')&&(target.slowUntil||0)>s.totalTime)hit(s,target,bolt.damage*.35);
 emit(s,'damage-number',{x:target.x,y:target.y,damage:Math.round(bolt.damage),critical:bolt.critical});
}
export function onEndlessPulse(s,hits){
 if(rankOf(s,'frost'))for(const e of s.enemies)if(dist(s.player,e)<s.player.pulseRadius+e.r)e.slowUntil=s.totalTime+3;
 if(rankOf(s,'thunder'))s.endless.thunderCd=0;
 if(hasRelic(s,'ink'))chain(s,true);
 if(evolved(s,'orbit'))area(s,s.player,270,50*power(s),'feather');
 if(rankOf(s,'pulsecraft')&&hits>=3){s.v12.barrier=1;s.v12.barrierSource='paper';s.v12.barrierUntil=s.totalTime+2;}
}
export function updateEndlessCombat(s,dt,{spawn,hurt}){
 const r=s.endless,p=s.player;
 r.spawnIn-=dt;
 if(r.remaining>0&&r.spawnIn<=0&&s.enemies.length<30){
  let batch=Math.min(3+Math.floor(r.floor/4),6,r.remaining,30-s.enemies.length);
  while(batch-->0){
   let kind='shade';const roll=endlessRandom(s);
   if(r.floor%5===0&&!r.bossMade)kind='boss';
   else if(r.floor>=3&&roll<(r.route==='cache'?.3:.13))kind='caster';
   else if(r.floor>=4&&roll<.23)kind='warder';
   else if(r.floor>=2&&roll>.83)kind='brute';else if(roll>.52)kind='runner';
   if(!spawn(s,kind))break;r.remaining--;if(kind==='boss'){r.bossMade=true;s.bossSpawned=true;emit(s,'boss');}
  }
  r.spawnIn=Math.max(1.15,3.1-r.floor*.07)*(s.difficulty==='wander'?1.25:s.difficulty==='night'?.85:1);
 }
 r.zoneCd-=dt;
 if(r.weather==='storm'&&r.zoneCd<=0){r.zoneCd=5.2;r.zones.push({x:p.x,y:p.y,r:85,warning:1.25});emit(s,'storm-warning');}
 for(const z of r.zones){z.warning-=dt;if(z.warning<=0){if(dist(z,p)<z.r+p.r)hurt(s,(18+r.floor*.8),'雷雨·落雷');s.effects.push({type:'lightning-burst',x:z.x,y:z.y,r:z.r,life:.35,maxLife:.35});}}r.zones=r.zones.filter(z=>z.warning>0).slice(-4);
 const haste=Math.pow(.9,rankOf(s,'haste'));
 r.frostCd-=dt;r.thunderCd-=dt;r.fireCd-=dt;
 if(rankOf(s,'frost')&&r.frostCd<=0){const lv=rankOf(s,'frost');r.frostCd=(3.7-lv*.3)*haste;area(s,p,115+lv*24,(18+lv*10)*power(s),'frost',evolved(s,'frost')?3:1.8);if(evolved(s,'frost'))for(const e of s.enemies)if(dist(p,e)<235)e.stun=Math.max(e.stun,.7);emit(s,'frost');}
 if(rankOf(s,'thunder')&&r.thunderCd<=0){r.thunderCd=(3-lvThunder(s)*.18)*haste;chain(s);}
 const blades=orbitPositions(s);if(blades.length)for(const e of s.enemies)if(e.hp>0&&s.totalTime>=(e.featherAt||0)&&blades.some(b=>dist(b,e)<e.r+19)){hit(s,e,(9+rankOf(s,'orbit')*5)*power(s)*(evolved(s,'orbit')?1.5:1));e.featherAt=s.totalTime+.38;}
 if(rankOf(s,'cinder')>=3&&p.dash>0&&r.fireCd<=0){r.fireCd=.12;r.pools.push({x:p.x,y:p.y,until:s.totalTime+2.4});}
 r.pools=r.pools.filter(f=>f.until>s.totalTime).slice(-14);
 for(const e of s.enemies)if(s.totalTime>=(e.burnAt||0)&&r.pools.some(f=>dist(f,e)<80+e.r)){hit(s,e,18*power(s));e.burnAt=s.totalTime+.5;}
}
const lvThunder=s=>rankOf(s,'thunder');
export function onEndlessKill(s,e){
 const r=s.endless;r.roomKills++;
 if(e.kind==='boss'){r.bosses++;r.rerolls=Math.min(3,r.rerolls+1);}
 if(rankOf(s,'sustain')&&s.kills%8===0)s.player.hp=Math.min(s.player.maxHp,s.player.hp+3*rankOf(s,'sustain'));
 if(hasRelic(s,'hunger')&&s.journal.combo>0&&s.journal.combo%20===0){r.feverMark++;r.feverUntil=s.totalTime+5;emit(s,'fever');}
}
function shuffle(s,items){for(let i=items.length-1;i>0;i--){const j=Math.floor(endlessRandom(s)*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
function draftSkills(s){
 const r=s.endless,owned=Object.keys(r.ranks),weapons=owned.filter(id=>SKILL_BY_ID[id].kind==='weapon').length,passives=owned.length-weapons;
 const pool=SKILLS.filter(u=>rankOf(s,u.id)<5&&(rankOf(s,u.id)|| (u.kind==='weapon'?weapons<3:passives<4)));
 const shuffled=shuffle(s,[...pool]),picks=[];
 // One owned upgrade always appears; a nearly mature weapon can find its partner.
 const own=shuffled.find(u=>rankOf(s,u.id)>0);if(own)picks.push(own.id);
 const partner=shuffled.find(u=>SKILLS.some(w=>w.partner===u.id&&rankOf(s,w.id)>=3)&&!picks.includes(u.id));if(partner)picks.push(partner.id);
 for(const u of shuffled)if(picks.length<3&&!picks.includes(u.id))picks.push(u.id);
 if(picks.length===0)return ['ash','mend','supplies'];return picks;
}
function setChoice(s,kind,offered){s.endless.choice=kind;s.offered=offered;s.phase='upgrade';emit(s,'upgrade');}
export function advanceEndlessChoices(s){
 const r=s.endless;if(s.player.hp<=0)return;
 if(!r.clearedRoom&&r.remaining===0&&s.enemies.length===0){
  r.clearedRoom=true;r.cleared=r.floor;r.rewardPending=r.floor%5===0||r.route==='cache';
  s.score+=350+r.floor*50;const coins=10+(r.route==='curse'?25:0);s.journal.coins+=coins;s.metrics.coinsEarned+=coins;
  for(const e of s.embers){gainEndlessXP(s,e.xp||0);s.collected++;}s.embers=[];
  r.pending+=r.route==='curse'?2:1;s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.1+(hasRelic(s,'lodestone')?8:0));
  emit(s,'room-clear',{floor:r.floor});
 }
 if(r.pending>0){setChoice(s,'skill',draftSkills(s));return;}
 if(r.clearedRoom&&r.rewardPending){const pool=shuffle(s,RELICS.filter(x=>!r.relics.includes(x.id)));setChoice(s,'relic',pool.length?pool.slice(0,3).map(x=>x.id):['ash','mend','supplies']);return;}
 if(r.clearedRoom){const rest=shuffle(s,['elite','cache','rest','curse']).slice(0,2);setChoice(s,'route',['hunt',...rest]);}
}
export function choiceInfo(s,id){
 const r=s.endless;
 if(r.choice==='route'){const u=ROUTES.find(u=>u.id===id);return {...u,tag:`第 ${r.floor+1} 层${(r.floor+1)%5===0?' · 首领':''}`,desc:u.desc+(id==='rest'?` 费用 ${restCost(s)} 星砂。`:''),disabled:id==='rest'&&s.journal.coins<restCost(s)};}
 if(r.choice==='relic'&&RELICS.some(u=>u.id===id))return {...RELICS.find(u=>u.id===id),tag:'奇物 · 本局生效'};
 const u=SKILL_BY_ID[id];if(u){const level=rankOf(s,id);return {...u,tag:`${u.kind==='weapon'?'武器':'被动'} · Lv.${level} → ${level+1}`,desc:u.desc,detail:level===4&&u.partner?`${u.detail} 搭配 ${SKILL_BY_ID[u.partner].name} Lv.2 可进化。`:u.detail};}
 return {id,symbol:id==='ash'?'flame':id==='mend'?'tea':'bag',name:id==='ash'?'余烬淬炼':id==='mend'?'温热回信':'补给包',tag:'构筑已满 · 继续成长',desc:id==='ash'?'所有伤害再提高 4%。':id==='mend'?'恢复 25% 最大生命。':'增加一瓶补给，已满则获得 12 星砂。'};
}
export const restCost=s=>14+s.endless.floor*2;
export const supplyCost=(s,id)=>(id==='reroll'?20:id==='potion'?16:12)+s.endless.floor*(id==='potion'?2:3);
export function buyEndlessSupply(s,id){
 const r=s.endless;if(!r||s.phase!=='upgrade'||r.choice!=='route'||!['tea','potion','reroll'].includes(id)||r.market.includes(id))return false;
 if(id==='tea'&&s.player.hp>=s.player.maxHp||id==='potion'&&s.journal.potions>=5||id==='reroll'&&r.rerolls>=3)return false;
 const cost=supplyCost(s,id);if(s.journal.coins<cost)return false;
 s.journal.coins-=cost;r.market.push(id);s.metrics.purchases++;
 if(id==='tea')s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.25);
 else if(id==='potion')s.journal.potions++;else r.rerolls++;
 emit(s,'purchase',{id});return true;
}
export function pickEndless(s,id){
 const r=s.endless;if(s.phase!=='upgrade'||!s.offered.includes(id)||choiceInfo(s,id).disabled)return null;
 const kind=r.choice;s.offered=[];r.choice='';s.phase='playing';
 if(kind==='route'){
  if(id==='rest'){const cost=restCost(s);s.journal.coins-=cost;s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.35);s.journal.potions=Math.min(5,s.journal.potions+1);}
  r.route=id;r.floor++;s.chapter=(r.floor-1)%3;return {advance:true};
 }
 if(kind==='skill')r.pending--;else if(kind==='relic')r.rewardPending=false;
 if(SKILL_BY_ID[id]&&kind==='skill'){r.ranks[id]=(r.ranks[id]||0)+1;if(id==='vitality')s.player.hp+=20;}
 else if(kind==='relic'&&RELICS.some(u=>u.id===id))r.relics.push(id);
 else if(id==='ash')r.ash++;else if(id==='mend')s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.25);
 else if(id==='supplies'){if(s.journal.potions<5)s.journal.potions++;else{s.journal.coins+=12;s.metrics.coinsEarned+=12;}}
 return {advance:false};
}
export function checkEvolutions(s){for(const u of SKILLS.filter(u=>u.kind==='weapon'))if(evolved(s,u.id)&&!s.endless.evolutions.includes(u.id)){s.endless.evolutions.push(u.id);emit(s,'evolution',{id:u.id,name:u.evolution});}}
export function rerollEndless(s){const r=s.endless;if(!r||s.phase!=='upgrade'||r.choice==='route'||r.rerolls<=0)return false;r.rerolls--;r.rerollsUsed++;s.offered=r.choice==='skill'?draftSkills(s):shuffle(s,RELICS.filter(u=>!r.relics.includes(u.id))).slice(0,3).map(u=>u.id);if(!s.offered.length)s.offered=['ash','mend','supplies'];return true;}
export function retireEndless(s){if(!isEndless(s)||s.phase!=='upgrade'||s.endless.choice!=='route')return false;s.endless.retired=true;s.phase='won';emit(s,'won');return true;}
export function reviveEndless(s){const r=s.endless;if(s.player.hp>0||!hasRelic(s,'dawn')||r.revived)return false;r.revived=true;s.player.hp=s.player.maxHp*.5;s.player.invincible=3;s.projectiles=s.projectiles.filter(p=>!p.enemy);area(s,s.player,300,80*power(s),'blast');emit(s,'revive');return true;}
/** Three boss patterns: clock beam, charging courier, and radial rain. Telegraphs lock before damage. */
export function endlessBossCast(s,e,dt,hurt,move){
 e.patternCd=(e.patternCd??2.2)-dt;
 if(e.cast>0){
  e.cast-=dt;if(e.cast<=0){
   if(e.castType==='charge'){e.charging=.6;e.chargeVX=(e.castX-e.x)/.6;e.chargeVY=(e.castY-e.y)/.6;}
   else if(e.castType==='beam'){
    const dx=e.castX-e.x,dy=e.castY-e.y,t=Math.max(0,Math.min(1,((s.player.x-e.x)*dx+(s.player.y-e.y)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(s.player.x-e.x-dx*t,s.player.y-e.y-dy*t)<38+s.player.r)hurt(s,e.damage*1.6,'夜航首领·锁定光束');
    s.effects.push({type:'beam',x:e.x,y:e.y,toX:e.castX,toY:e.castY,r:40,life:.3,maxLife:.3});
   }else{
    for(let i=0;i<14;i++){const a=i*TAU/14+e.angle;s.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,enemy:true,life:3.8,damage:e.damage*.65,r:8});}e.angle+=.25;
   }
   e.patternCd=e.hp<e.maxHp*.5?3.5:5;e.cast=0;
  }return true;
 }
 if(e.charging>0){e.charging-=dt;move(s,e,e.chargeVX,e.chargeVY,dt);if(dist(e,s.player)<e.r+s.player.r+8)hurt(s,e.damage*1.4,'夜航首领·冲锋');return true;}
 if(e.patternCd<=0){const p=s.player,d=Math.max(1,dist(e,p));e.castType=e.bossType===1?'charge':e.bossType===2?'rain':'beam';e.cast=1.1;e.castMax=1.1;e.castX=e.x+(p.x-e.x)/d*(e.castType==='charge'?Math.min(500,d+100):1100);e.castY=e.y+(p.y-e.y)/d*(e.castType==='charge'?Math.min(500,d+100):1100);s.v12.bossCasts++;emit(s,'boss-warning',{text:e.castType==='charge'?'冲锋已锁定：横向躲开虚线！':e.castType==='rain'?'弹幕将至：留出距离，寻找弹隙。':'光束已锁定：侧移，或用光环近身打断！'});return true;}
 return false;
}
export function validateEndless(s){
 const r=s.endless;if(!r||r.version!==1||!Number.isInteger(r.floor)||r.floor<1||r.floor>1000000||s.chapter!==(r.floor-1)%3)return false;
 for(const k of ['cleared','rng','remaining','total','roomKills','pending','rerolls','rerollsUsed','bosses','ash','feverMark'])if(!Number.isInteger(r[k])||r[k]<0)return false;
 if(r.remaining>r.total||r.total>80||r.pending>500||r.rerolls>3||r.cleared>r.floor||r.roomKills>r.total)return false;
 for(const k of ['spawnIn','frostCd','thunderCd','fireCd','feverUntil','roomDamage','zoneCd'])if(!Number.isFinite(r[k]))return false;
 for(const k of ['clearedRoom','rewardPending','bossMade','revived','retired'])if(typeof r[k]!=='boolean')return false;
 if(!ROUTES.some(u=>u.id===r.route)||!SKILLS.some(u=>u.kind==='weapon'&&u.id===r.starter))return false;
 if(!r.ranks||Array.isArray(r.ranks)||Object.entries(r.ranks).some(([id,n])=>!Object.hasOwn(SKILL_BY_ID,id)||!Number.isInteger(n)||n<1||n>5))return false;
 const weapons=Object.keys(r.ranks).filter(id=>SKILL_BY_ID[id].kind==='weapon').length;if(weapons<1||weapons>3||Object.keys(r.ranks).length-weapons>4)return false;
 if(!Array.isArray(r.relics)||r.relics.length>8||new Set(r.relics).size!==r.relics.length||r.relics.some(id=>!RELICS.some(u=>u.id===id)))return false;
 if(!Array.isArray(r.evolutions)||r.evolutions.length>3||r.evolutions.some(id=>!SKILL_BY_ID[id]?.partner||!evolved(s,id)))return false;
 if(!Object.hasOwn(WEATHERS,r.weather)||!Array.isArray(r.zones)||r.zones.length>4||r.zones.some(z=>['x','y','r','warning'].some(k=>!Number.isFinite(z[k]))||z.r!==85||z.warning<=0||z.warning>1.25))return false;
 if(!Array.isArray(r.market)||r.market.length>3||new Set(r.market).size!==r.market.length||r.market.some(id=>!['tea','potion','reroll'].includes(id)))return false;
 if(!Array.isArray(r.pools)||r.pools.length>14||r.pools.some(p=>['x','y','until'].some(k=>!Number.isFinite(p[k]))))return false;
 if(!['','skill','relic','route'].includes(r.choice))return false;
 if(s.phase==='upgrade'){
  if(!r.choice||!s.offered.length||s.offered.length>3||new Set(s.offered).size!==s.offered.length)return false;
  const allowed=r.choice==='route'?ROUTES.map(u=>u.id):r.choice==='relic'?RELICS.map(u=>u.id):SKILLS.map(u=>u.id);
  if(s.offered.some(id=>!allowed.includes(id)&&!['ash','mend','supplies'].includes(id)))return false;
  if(r.choice==='skill'&&(r.pending<1||s.offered.some(id=>SKILL_BY_ID[id]&&rankOf(s,id)>=5)))return false;
 }else if(r.choice)return false;
 return true;
}
