/** Expedition systems. Pure state transitions, with explicit costs and idempotent rewards. */
import {GEAR,GEAR_BY_ID,NPCS,EVENTS,CONTRACTS,TALENTS} from './content.mjs';
import {modern,has,condition,randomStream,heal} from './expedition.mjs';
import {safePoint} from './routes.mjs';
import {isEndless,liveDraft,applyEndlessStats,gainEndlessXP} from './endless.mjs';
import {applyGrowthStats,growthXP} from './growth.mjs';
import {applyNarrativeStats,followupAvailable} from './narrative.mjs';
const emit=(s,type,data={})=>s.events.push({type,...data});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
function roll(s){if(modern(s))return randomStream(s,'lootRng');s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
export const XP_THRESHOLDS=[0,30,75,140,220,320,450,600];
export function initSystems(s,profile={},options={}){
  s.systemsVersion=1;s.journeyId=typeof options.id==='string'?options.id:`journey-${s.seed}`;
  s.talentSnapshot=Object.fromEntries(TALENTS.map(t=>[t.id,cap(Math.floor(profile.talents?.[t.id]||0),0,t.max)]));
  s.daily=typeof options.daily==='string'?options.daily:'';
  s.journal={coins:12+s.talentSnapshot.fund*5,xp:0,level:1,potions:1+s.talentSnapshot.supply,potionCd:0,combo:0,comboTimer:0,bestCombo:0};
  s.metrics={coinsEarned:0,deliveries:0,chests:0,events:0,purchases:0,forges:0,potionsUsed:0,dashes:0,pulses:0,equips:0};
  s.gear={inventory:['paper-lamp','worn-cape','canvas-bag'].map(id=>({id,level:1})),slots:{lamp:'paper-lamp',cape:'worn-cape',bag:'canvas-bag'}};
  s.foundGear=['paper-lamp','worn-cape','canvas-bag'];s.encountered=[];s.blessings={hp:0};
  s.story={choices:[],delivered:[],trust:0,ending:'',tasks:[]};
  s.contract={id:CONTRACTS.some(c=>c.id===options.contract)?options.contract:'lamps',complete:false};
  if(profile.heirloom&&profile.collection?.includes(profile.heirloom)&&GEAR_BY_ID[profile.heirloom]?.tier>0){s.gear.inventory.push({id:profile.heirloom,level:1});s.gear.slots[GEAR_BY_ID[profile.heirloom].slot]=profile.heirloom;s.foundGear.push(profile.heirloom);}
  recalculate(s);setupDistrict(s);
}
export function equippedSets(s){
  const sets={};for(const id of Object.values(s.gear.slots)){const g=GEAR_BY_ID[id];if(g&&g.set!=='plain')sets[g.set]=(sets[g.set]||0)+1;}return sets;
}
export function compareGear(s,id){
 const g=GEAR_BY_ID[id];if(!g)return null;const copy=JSON.parse(JSON.stringify(s));
 if(!copy.gear.inventory.some(i=>i.id===id))copy.gear.inventory.push({id,level:1});copy.gear.slots[g.slot]=id;recalculate(copy);
 return {changes:Object.fromEntries(['maxHp','damage','speed','armor','crit','pulseMax','attackRate'].map(k=>[k,copy.player[k]-s.player[k]]).filter(([,n])=>Math.abs(n)>.001)),sets:equippedSets(copy)};
}
export function recalculate(s){
  const p=s.player,hp=p.hp;
  const st={maxHp:100,speed:195,pickup:66,heal:4.5,dashMax:2.8,pulseMax:6,pulseRadius:185,pulseDamage:40,attackRate:1.2,attackTargets:1,damage:24,crit:0,armor:0,potionHeal:45};
  for(const id of s.upgrades){
    if(id==='wing'){st.speed*=1.18;st.dashMax-=.45;}
    if(id==='lantern')st.maxHp+=25;
    if(id==='ring'){st.pulseRadius*=1.25;st.pulseDamage+=15;}
    if(id==='spark'){st.attackTargets++;if(!modern(s))st.attackRate-=.1;}
    if(id==='magnet'){st.pickup*=1.65;st.heal+=3;}
  }
  const talents=s.talentSnapshot||{};st.maxHp+=(talents.lamp||0)*6;st.speed+=(talents.wing||0)*5;st.damage+=(talents.focus||0)*2;
  const level=isEndless(s)?1:s.journal?.level||1;st.maxHp+=(level-1)*6;st.damage+=(level-1)*2;st.maxHp+=s.blessings?.hp||0;
  if(s.gear)for(const [slot,id]of Object.entries(s.gear.slots)){
    const item=s.gear.inventory.find(g=>g.id===id),def=GEAR_BY_ID[id];if(!item||!def||def.slot!==slot)continue;
    const mult=1+(item.level-1)*(modern(s)?.25:.4);for(const [key,value]of Object.entries(def.stats))st[key]+=value*mult;
  }
  if(s.gear){const sets=equippedSets(s);if(sets.courier>=2)st.speed+=12;if(sets.warden>=2)st.armor+=.08;if(sets.warden===3&&!modern(s)){st.maxHp+=20;st.heal+=3;}if(sets.dawn>=2)st.crit+=.12;if(sets.dawn===3&&!modern(s))st.pulseMax-=1.2;}
  applyNarrativeStats(s,st);applyGrowthStats(s,st);applyEndlessStats(s,st);
  st.dashMax=Math.max(1.05,st.dashMax);st.pulseMax=Math.max(2.2,st.pulseMax);st.attackRate=Math.max(s.endless?.combat?.version===1?.22:.5,st.attackRate);st.armor=cap(st.armor,0,.5);st.crit=cap(st.crit,0,.65);
  Object.assign(p,st);p.hp=Math.min(hp,st.maxHp);p.dashCd=Math.min(p.dashCd,p.dashMax);p.pulseCd=Math.min(p.pulseCd,p.pulseMax);
}
export function addCoins(s,amount){if(amount<=0)return;s.journal.coins+=amount;s.metrics.coinsEarned+=amount;}
export function addXP(s,amount){
  if(isEndless(s)){gainEndlessXP(s,amount);return;}
  s.journal.xp+=amount*growthXP(s);let level=1;while(level<XP_THRESHOLDS.length&&s.journal.xp>=XP_THRESHOLDS[level])level++;
  if(level>s.journal.level){const delta=level-s.journal.level;s.journal.level=level;recalculate(s);heal(s,12*delta);emit(s,'level',{level});}
}
function rollGear(s){const pool=GEAR.filter(g=>g.tier>0&&(s.chapter>0||g.tier===1));const fresh=pool.filter(g=>!s.gear.inventory.some(item=>item.id===g.id));const pick=fresh.length?fresh:pool;return pick[Math.floor(roll(s)*pick.length)].id;}
export function grantGear(s,id){
  const def=GEAR_BY_ID[id];if(!def)return false;
  if(!s.foundGear.includes(id))s.foundGear.push(id);
  if(s.gear.inventory.some(g=>g.id===id)){addCoins(s,8);emit(s,'duplicate',{id});return true;}
  s.gear.inventory.push({id,level:1});emit(s,'gear',{id});return true;
}
export function equip(s,id){
  const def=GEAR_BY_ID[id];if(!['playing','upgrade'].includes(s.phase)||!def||!s.gear.inventory.some(g=>g.id===id)||s.gear.slots[def.slot]===id)return false;
  s.gear.slots[def.slot]=id;s.metrics.equips++;recalculate(s);emit(s,'equip',{id});return true;
}
export const forgeCost=(item,s)=>item.level===1?12:item.level===2?(s?.rulesVersion===111?22:24):0;
export function forge(s,id){
  const item=s.gear.inventory.find(g=>g.id===id),def=GEAR_BY_ID[id];if(!['playing','upgrade'].includes(s.phase)||!item||def.tier===0||item.level>=3)return false;
  const price=forgeCost(item,s);if(s.journal.coins<price)return false;
  s.journal.coins-=price;item.level++;s.metrics.forges++;recalculate(s);emit(s,'forge',{id,level:item.level});return true;
}
export function salvage(s,id){
  const item=s.gear.inventory.find(g=>g.id===id),def=GEAR_BY_ID[id];
  if(!['playing','upgrade'].includes(s.phase)||!item||!def||def.tier===0||Object.values(s.gear.slots).includes(id))return false;
  s.gear.inventory=s.gear.inventory.filter(g=>g.id!==id);addCoins(s,6+def.tier*2+(item.level-1)*4);emit(s,'salvage',{id});return true;
}
export function usePotion(s){
  if((s.phase!=='playing'&&!liveDraft(s))||s.journal.potions<=0||s.journal.potionCd>0||s.player.hp>=s.player.maxHp)return false;
  s.journal.potions--;s.journal.potionCd=1;s.metrics.potionsUsed++;
  const excess=Math.max(0,s.player.hp+s.player.potionHeal-s.player.maxHp);heal(s,s.player.potionHeal);
  if(modern(s)&&has(s,'seal')&&excess>0){s.v12.shield=Math.min(20,excess);s.v12.shieldUntil=s.totalTime+8;}
  emit(s,'potion');return true;
}
export function setupDistrict(s){
  if(!s.journal)return;
  const candidates=GEAR.filter(g=>g.tier>0&&(s.chapter>0||g.tier===1));
  const first=candidates[Math.floor(roll(s)*candidates.length)],second=candidates.filter(g=>g.slot!==first.slot)[Math.floor(roll(s)*candidates.filter(g=>g.slot!==first.slot).length)];
  s.pois=[
    {id:`npc-${s.chapter}`,kind:'npc',x:330,y:795,used:false,npc:s.chapter},
    {id:`chest-${s.chapter}`,kind:'chest',x:650,y:850,used:false},
    {id:`shop-${s.chapter}`,kind:'shop',x:990,y:760,used:false,stock:[{id:first.id,left:1,price:first.price},{id:second.id,left:1,price:second.price},{id:'tea',left:2,price:8},{id:'potion',left:2,price:10}]},
    {id:`event-${s.chapter}`,kind:'event',x:1370,y:1020,used:false,event:(s.seed%3+s.chapter)%3}
  ];
  if(modern(s)){
    // The side lane is optional and has a single, proximity-checked guardian.
    const point=safePoint(s,{x:1490,y:1110},35);if(point)s.pois.push({id:`risk-${s.chapter}`,kind:'risk',...point,used:false});
    for(const poi of s.pois){const point=safePoint(s,poi,35);if(point){poi.x=point.x;poi.y=point.y;}}
  }
}
export function nearestPOI(s){
  if(!s?.pois||s.phase!=='playing')return null;
  return s.pois.filter(p=>(!p.used||p.kind==='shop'||followupAvailable(s,p))&&dist(s.player,p)<112).sort((a,b)=>dist(s.player,a)-dist(s.player,b))[0]||null;
}
export function poiLabel(p){if(!p)return '';return p.kind==='risk'?'进入风险支路':p.kind==='npc'?`与${NPCS[p.npc].name}交谈`:p.kind==='chest'?'打开失物箱':p.kind==='shop'?'流动商店':EVENTS[p.event].name;}
export function openPOI(s,id){
  const p=s.pois.find(p=>p.id===id);if(s.phase!=='playing'||!p||dist(s.player,p)>112||(p.used&&p.kind!=='shop'&&!followupAvailable(s,p)))return null;
  if(followupAvailable(s,p))return {kind:'continuation',id:p.id,npc:p.npc};
  if(p.kind==='chest'){p.used=true;s.metrics.chests++;addCoins(s,10);addXP(s,8);const gear=rollGear(s);grantGear(s,gear);emit(s,'chest',{id,gear});return {kind:'chest',gear};}
  if(p.kind==='risk'){
    const spawn=safePoint(s,{x:p.x,y:p.y+110},30);if(!spawn)return null;p.used=true;s.v12.riskVisits++;
    s.enemies.push({id:s.nextId++,kind:'brute',elite:true,route:true,...spawn,r:25,hp:150,maxHp:150,speed:65,damage:18,warning:2,stun:0,attack:0,shotCd:3,angle:0});
    emit(s,'elite');return {kind:'risk'};
  }
  return {kind:p.kind,id:p.id,npc:p.npc,event:p.event};
}
export function chooseStory(s,poiId,choiceId){
  const p=s.pois.find(p=>p.id===poiId);if(s.phase!=='playing'||!p||p.kind!=='npc'||p.used||dist(s.player,p)>112)return false;
  const npc=NPCS[p.npc],choice=npc.choices.find(c=>c.id===choiceId);if(!choice||s.player.embers<(choice.embers||0))return false;
  s.player.embers-=choice.embers||0;p.used=true;s.story.trust+=choice.trust;s.story.choices.push({npc:npc.id,choice:choice.id});
  s.story.tasks.push({id:npc.letter,name:npc.letterTitle,complete:false,progress:0});
  if(choice.coins)addCoins(s,choice.coins);if(choice.hp){s.blessings.hp+=choice.hp;recalculate(s);heal(s,choice.hp);}
  emit(s,'story',{npc:npc.id,choice:choice.id});return true;
}
export function buy(s,poiId,itemId){
  const shop=s.pois.find(p=>p.id===poiId&&p.kind==='shop'),stock=shop?.stock.find(i=>i.id===itemId);
  if(s.phase!=='playing'||!shop||dist(s.player,shop)>112||!stock||stock.left<1||s.journal.coins<stock.price)return false;
  if(GEAR_BY_ID[itemId]&&s.gear.inventory.some(g=>g.id===itemId))return false;
  if(itemId==='tea'&&s.player.hp>=s.player.maxHp)return false;
  if(itemId==='potion'&&s.journal.potions>=5)return false;
  s.journal.coins-=stock.price;stock.left--;s.metrics.purchases++;
  if(itemId==='tea')heal(s,40);
  else if(itemId==='potion')s.journal.potions++;
  else grantGear(s,itemId);
  emit(s,'purchase',{id:itemId});return true;
}
export function chooseEvent(s,poiId,choiceId){
  const p=s.pois.find(p=>p.id===poiId);if(s.phase!=='playing'||!p||p.kind!=='event'||p.used||dist(s.player,p)>112)return false;
  const choice=EVENTS[p.event].choices.find(c=>c.id===choiceId);if(!choice||s.player.embers<(choice.embers||0)||s.journal.coins<(choice.cost||0)||s.player.hp<=(choice.damage||0))return false;
  s.player.embers-=choice.embers||0;s.journal.coins-=choice.cost||0;s.player.hp-=choice.damage||0;
  if(choice.damage)s.damageTaken+=choice.damage;
  if(modern(s)&&choice.damage)s.v12.damageSources['街角奇遇']=(s.v12.damageSources['街角奇遇']||0)+choice.damage;
  p.used=true;s.metrics.events++;
  if(choice.coins)addCoins(s,choice.coins);if(choice.heal)heal(s,choice.heal);
  if(choice.hp){s.blessings.hp+=choice.hp;recalculate(s);heal(s,choice.hp);}
  if(choice.reset)s.player.pulseCd=0;if(choice.gear)grantGear(s,rollGear(s));
  if(choice.elite){const point=modern(s)?safePoint(s,{x:p.x,y:p.y+120},30):{x:1370,y:1140};if(point)s.enemies.push({id:s.nextId++,kind:'brute',elite:true,...point,r:25,hp:175,maxHp:175,speed:66,damage:20,warning:2,stun:0,attack:0,shotCd:3,angle:0});emit(s,'elite');}
  emit(s,'world-event',{id:EVENTS[p.event].id,choice:choice.id});return true;
}
export function onKill(s,e){
  const j=s.journal;if(j.comboTimer<=0)j.combo=0;j.combo++;j.comboTimer=5;j.bestCombo=Math.max(j.bestCombo,j.combo);
  s.score+=Math.min(5,j.combo)*3;
  const coins=isEndless(s)?e.rewardCoins||0:e.kind==='boss'?35:e.elite?24:modern(s)?(e.rewardCoins||0):e.kind==='brute'?7:4;
  const xp=e.kind==='boss'?60:e.elite?25:modern(s)?(e.rewardXP||0):e.kind==='brute'?12:6;
  addCoins(s,coins);if(!modern(s)&&equippedSets(s).courier===3)addCoins(s,2);if(!isEndless(s))addXP(s,xp);
  if(modern(s)&&!isEndless(s)&&!e.elite&&e.kind!=='boss'){s.v12.goldClaimed+=coins;s.v12.xpClaimed+=xp;}
  if(modern(s)&&e.route)s.v12.riskCleared++;
  if(e.elite)grantGear(s,rollGear(s));
}
export function onBeacon(s){addCoins(s,isEndless(s)?4:10);addXP(s,isEndless(s)?5:25);}
export function contractProgress(s){
  const c=CONTRACTS.find(c=>c.id===s.contract.id);if(!c)return {current:0,total:1};
  const current=c.metric==='swift'?(s.phase==='won'&&s.totalTime<=180?1:0):c.metric==='resolve'?(s.phase==='won'&&s.metrics.potionsUsed===0?1:0):s[c.metric]??s.metrics[c.metric]??0;
  return {current:Math.min(c.goal,current),total:c.goal};
}
export function updateSystems(s,dt){
  const j=s.journal;j.potionCd=Math.max(0,j.potionCd-dt);j.comboTimer=Math.max(0,j.comboTimer-dt);if(j.comboTimer===0)j.combo=0;
  for(const e of s.enemies)if(dist(s.player,e)<420&&!s.encountered.includes(e.kind))s.encountered.push(e.kind);
  for(const task of s.story.tasks)if(!task.complete){
    if(s.beacons.some(b=>b.lit&&dist(s.player,b)<145)){
      task.progress+=dt;if(task.progress>=.75){task.progress=.75;task.complete=true;s.story.delivered.push(task.id);s.metrics.deliveries++;addCoins(s,15);addXP(s,20);if(modern(s)){if(has(s,'waymark'))s.v12.pulseBoost=2;if(equippedSets(s).courier===3)s.v12.courierDeliveries++;}emit(s,'delivery',{id:task.id,name:task.name});}
    }else task.progress=0;
  }
  if(!s.contract.complete){const p=contractProgress(s);if(p.current>=p.total){s.contract.complete=true;addCoins(s,15);addXP(s,15);emit(s,'contract',{id:s.contract.id});}}
}
export function endingFor(s){return s.story.delivered.length>=3?(s.story.trust>=4?'hearth':'letters'):'dawn';}
export function validateSystems(s){
  try{
    if(s.systemsVersion!==1||typeof s.journeyId!=='string'||s.journeyId.length>120||typeof s.daily!=='string'||s.daily.length>12)return false;
    const j=s.journal,m=s.metrics;if(!j||!m)return false;
    for(const k of ['coins','xp','level','potions','potionCd','combo','comboTimer','bestCombo'])if(!Number.isFinite(j[k])||j[k]<0)return false;
    for(const k of ['coinsEarned','deliveries','chests','events','purchases','forges','potionsUsed','dashes','pulses','equips'])if(!Number.isFinite(m[k])||m[k]<0)return false;
    if(!Number.isInteger(j.level)||j.level<1||j.level>(isEndless(s)?100000:8)||!Number.isInteger(j.potions)||j.potions>5)return false;
    if(!s.gear||!Array.isArray(s.gear.inventory)||s.gear.inventory.length>GEAR.length||!s.gear.slots)return false;
    const ids=new Set();for(const g of s.gear.inventory){if(!GEAR_BY_ID[g.id]||ids.has(g.id)||!Number.isInteger(g.level)||g.level<1||g.level>3)return false;ids.add(g.id);}
    for(const slot of ['lamp','cape','bag'])if(!ids.has(s.gear.slots[slot])||GEAR_BY_ID[s.gear.slots[slot]].slot!==slot)return false;
    if(!Array.isArray(s.foundGear)||s.foundGear.length>12||s.foundGear.some(id=>!GEAR_BY_ID[id]))return false;
    if(!Array.isArray(s.encountered)||s.encountered.some(id=>!['shade','runner','brute','boss','caster','warder','charger','sniper','bulwark'].includes(id)))return false;
    if(!s.blessings||!Number.isFinite(s.blessings.hp)||s.blessings.hp<0||s.blessings.hp>150)return false;
    if(!s.talentSnapshot||TALENTS.some(t=>!Number.isInteger(s.talentSnapshot[t.id])||s.talentSnapshot[t.id]<0||s.talentSnapshot[t.id]>t.max))return false;
    const st=s.story;if(!st||!Array.isArray(st.choices)||!Array.isArray(st.tasks)||!Array.isArray(st.delivered)||st.choices.length>3||st.tasks.length>3||st.delivered.length>3||!Number.isInteger(st.trust)||st.trust<0||st.trust>6)return false;
    if(st.choices.some(c=>!NPCS.some(n=>n.id===c.npc&&n.choices.some(o=>o.id===c.choice)))||new Set(st.choices.map(c=>c.npc)).size!==st.choices.length)return false;
    if(st.tasks.some(t=>!NPCS.some(n=>n.letter===t.id)||typeof t.complete!=='boolean'||!Number.isFinite(t.progress)||t.progress<0||t.progress>.75)||st.delivered.some(id=>!st.tasks.some(t=>t.id===id&&t.complete)))return false;
    if(!s.contract||!CONTRACTS.some(c=>c.id===s.contract.id)||typeof s.contract.complete!=='boolean')return false;
    if(!Array.isArray(s.pois)||s.pois.length!==(isEndless(s)?0:modern(s)?5:4))return false;
    for(const p of s.pois){if(!['npc','chest','shop','event','risk'].includes(p.kind)||typeof p.id!=='string'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||typeof p.used!=='boolean')return false;
      if(p.kind==='npc'&&!NPCS[p.npc])return false;if(p.kind==='event'&&!EVENTS[p.event])return false;
      if(p.kind==='shop'&&(!Array.isArray(p.stock)||p.stock.length>8||p.stock.some(i=>(!GEAR_BY_ID[i.id]&&!['tea','potion'].includes(i.id))||!Number.isInteger(i.left)||i.left<0||i.left>2||!Number.isFinite(i.price)||i.price<1)))return false;
    }
    return true;
  }catch{return false;}
}
