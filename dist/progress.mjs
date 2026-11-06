/** Device-local metaprogression. Pure functions; storage is owned by the application. */
import {ACHIEVEMENTS,GEAR_BY_ID,GEAR,TALENTS,TALENT_COST,NPCS,ENDINGS,BESTIARY,CONTRACTS} from './content.mjs';
import {equippedSets} from './systems.mjs';
const numeric=['kills','collected','beacons','deliveries','chests','purchases','forges','events','coinsEarned','runs','wins','contracts'];
const finite=n=>Number.isFinite(n)&&n>=0?n:0;
const known=(values,allowed)=>[...new Set(Array.isArray(values)?values.filter(v=>allowed.includes(v)):[])];
const newFlags=['courier-route','warden-block','dawn-echo','mixed-route','side-route','fair-route','small-route','express-route'];
export function challengeKey(s){return `1.2.0:${s.daily||s.seed}:${[...(s.v12?.conditions||[])].sort().join('+')||'plain'}`;}
export function createProfile(legacy={}){
  const totals=Object.fromEntries(numeric.map(k=>[k,0]));for(const k of ['beacons','runs','wins'])totals[k]=finite(legacy[k]);
  return {version:1,stamps:0,earned:0,spent:0,talents:Object.fromEntries(TALENTS.map(t=>[t.id,0])),achievements:[],collection:['paper-lamp','worn-cape','canvas-bag'],letters:[],endings:[],bestiary:[],choices:[],heirloom:'',totals,flags:{fullSet:false,night:false,flawless:false,swift:false,...Object.fromEntries(newFlags.map(id=>[id,false]))},bestCombo:0,bestLevel:1,ledger:{},dailies:[],challengeClaims:[],challengeBests:{},lastRewards:null};
}
export function readProfile(raw,legacy={}){
  try{
    const data=typeof raw==='string'?JSON.parse(raw):raw;if(!data||data.version!==1)return createProfile(legacy);
    const p=createProfile();for(const k of ['stamps','earned','spent','bestCombo','bestLevel'])p[k]=finite(data[k]);
    p.stamps=Math.floor(p.stamps);p.earned=Math.floor(p.earned);p.spent=Math.floor(p.spent);
    for(const t of TALENTS)p.talents[t.id]=Math.min(t.max,Math.floor(finite(data.talents?.[t.id])));
    for(const k of numeric)p.totals[k]=finite(data.totals?.[k]);
    p.achievements=known(data.achievements,ACHIEVEMENTS.map(a=>a.id));p.collection=known(data.collection,GEAR.map(g=>g.id));
    for(const id of ['paper-lamp','worn-cape','canvas-bag'])if(!p.collection.includes(id))p.collection.push(id);
    p.letters=known(data.letters,NPCS.map(n=>n.letter));p.endings=known(data.endings,Object.keys(ENDINGS));p.bestiary=known(data.bestiary,BESTIARY.map(b=>b.id));
    p.choices=known(data.choices,NPCS.flatMap(n=>n.choices.map(c=>n.id+':'+c.id)));
    if(p.collection.includes(data.heirloom)&&GEAR_BY_ID[data.heirloom]?.tier>0)p.heirloom=data.heirloom;
    for(const k of Object.keys(p.flags))p.flags[k]=data.flags?.[k]===true;
    p.dailies=Array.isArray(data.dailies)?data.dailies.filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-100):[];
    p.challengeClaims=Array.isArray(data.challengeClaims)?[...new Set(data.challengeClaims.filter(x=>typeof x==='string'&&/^1\.2\.0:[\d-]+:[a-z+-]+$/.test(x)&&x.length<120))]:[];
    if(data.challengeBests&&typeof data.challengeBests==='object')for(const [key,value]of Object.entries(data.challengeBests))if(p.challengeClaims.includes(key)&&Number.isFinite(value)&&value>0)p.challengeBests[key]=value;
    if(data.ledger&&typeof data.ledger==='object'&&!Array.isArray(data.ledger))for(const [id,record]of Object.entries(data.ledger).slice(-80)){
      if(id.length>120||!record||typeof record!=='object'||['__proto__','constructor','prototype'].includes(id))continue;
      const entry={final:record.final===true};for(const k of numeric)entry[k]=finite(record[k]);p.ledger[id]=entry;
    }
    return p;
  }catch{return createProfile(legacy);}
}
function reward(p,amount){p.stamps+=amount;p.earned+=amount;}
const hasAchievement={
 'first-light':p=>p.totals.beacons>=1,'district':(p,s)=>s?.litTotal>=3||p.totals.wins>0,
 'slayer':p=>p.totals.kills>=20,'collector':p=>p.totals.collected>=100,'treasure':p=>p.totals.chests>=3,
 'shopper':p=>p.totals.purchases>=1,'smith':p=>p.totals.forges>=1,'wardrobe':p=>p.collection.length>=9,
 'set':p=>p.flags.fullSet,'combo':p=>p.bestCombo>=5,'letters':p=>p.letters.length===3,'courier':p=>p.totals.deliveries>=3,
 'dawn':p=>p.totals.wins>=1,'swift':p=>p.flags.swift,'night':p=>p.flags.night,'hearth':p=>p.endings.includes('hearth'),
 'veteran':p=>p.totals.wins>=5,'flawless':p=>p.flags.flawless,'level':p=>p.bestLevel>=6,'contract':p=>p.totals.contracts>=3,
 ...Object.fromEntries(newFlags.map(id=>[id,p=>p.flags[id]]))
};
export function recordProgress(p,s,{final=false}={}){
  const unlocked=[];if(!s?.systemsVersion)return unlocked;
  // Each running journey contributes only the positive difference since its last observation.
  const id=s.journeyId;if(['__proto__','constructor','prototype'].includes(id))return unlocked;
  const previous=p.ledger[id]||{final:false};
  const values={kills:s.kills,collected:s.collected,beacons:s.litTotal,deliveries:s.metrics.deliveries,chests:s.metrics.chests,purchases:s.metrics.purchases,forges:s.metrics.forges,events:s.metrics.events,coinsEarned:s.metrics.coinsEarned};
  for(const [key,value]of Object.entries(values)){const n=finite(value);p.totals[key]+=Math.max(0,n-(previous[key]||0));previous[key]=Math.max(n,previous[key]||0);}
  for(const item of s.foundGear)if(!p.collection.includes(item))p.collection.push(item);
  for(const letter of s.story.delivered)if(!p.letters.includes(letter))p.letters.push(letter);
  for(const enemy of s.encountered)if(!p.bestiary.includes(enemy))p.bestiary.push(enemy);
  for(const c of s.story.choices){const key=c.npc+':'+c.choice;if(!p.choices.includes(key))p.choices.push(key);}
  p.bestCombo=Math.max(p.bestCombo,s.journal.bestCombo);p.bestLevel=Math.max(p.bestLevel,s.journal.level);
  if(Object.values(equippedSets(s)).some(n=>n>=3))p.flags.fullSet=true;
  if(s.rulesVersion===120){const v=s.v12;
    if(v.courierDeliveries>0)p.flags['courier-route']=true;if(v.wardenBlocks>0)p.flags['warden-block']=true;if(v.echoes>0)p.flags['dawn-echo']=true;if(v.riskCleared>0)p.flags['side-route']=true;
    if(s.phase==='won'){if(Object.keys(equippedSets(s)).length>=2)p.flags['mixed-route']=true;if(v.mode==='challenge')p.flags['fair-route']=true;if(v.conditions.includes('small-bag'))p.flags['small-route']=true;if(v.conditions.includes('express')&&s.totalTime<=180)p.flags['express-route']=true;}
  }
  if(final&&['won','lost'].includes(s.phase)&&!previous.final){
    previous.final=true;p.totals.runs++;
    const won=s.phase==='won',fair=s.v12?.mode==='challenge',key=fair?challengeKey(s):'';let base=(won?2:0)+Math.floor(s.litTotal/3),contract=0,daily=0,conditionBonus=0;
    if(won){p.totals.wins++;if(!p.endings.includes(s.story.ending))p.endings.push(s.story.ending);if(s.difficulty==='night')p.flags.night=true;if(s.damageTaken===0)p.flags.flawless=true;if(s.totalTime<=180)p.flags.swift=true;}
    if(s.contract.complete){contract=CONTRACTS.find(c=>c.id===s.contract.id).reward;p.totals.contracts++;}
    if(won&&s.daily&&!p.dailies.includes(s.daily)){daily=3;p.dailies.push(s.daily);if(p.dailies.length>100)p.dailies.shift();}
    if(s.v12?.conditions.includes('express')&&won&&s.totalTime<=180)conditionBonus=1;
    if(fair){
      if(won)p.challengeBests[key]=Math.min(p.challengeBests[key]||Infinity,s.totalTime);
      if(!won||p.challengeClaims.includes(key)){base=0;contract=0;daily=0;conditionBonus=0;}
      else {p.challengeClaims.push(key);daily=3;}
    }
    reward(p,base+contract+daily+conditionBonus);p.lastRewards={journey:id,base,contract,daily,conditionBonus,challenge:key,total:base+contract+daily+conditionBonus};
  }
  p.ledger[id]=previous;
  if(Object.keys(p.ledger).length>80){const oldest=Object.keys(p.ledger).find(k=>k!==id);delete p.ledger[oldest];}
  for(const a of ACHIEVEMENTS)if(!p.achievements.includes(a.id)&&hasAchievement[a.id](p,s)){p.achievements.push(a.id);reward(p,a.reward);unlocked.push(a);}
  return unlocked;
}
export function buyTalent(p,id){const t=TALENTS.find(t=>t.id===id);if(!t)return false;const level=p.talents[id],cost=TALENT_COST(level);if(level>=t.max||p.stamps<cost)return false;p.stamps-=cost;p.spent+=cost;p.talents[id]++;return true;}
export function chooseHeirloom(p,id){if(id===''){p.heirloom='';return true;}if(!p.collection.includes(id)||!GEAR_BY_ID[id]||GEAR_BY_ID[id].tier===0)return false;p.heirloom=id;return true;}
export function rank(p){const n=p.totals.wins;return n>=10?'黎明邮政官':n>=5?'暮色领航员':n>=2?'正式信使':n>=1?'点灯信使':'见习信使';}
export function dailySeed(day){let h=2166136261;for(const char of day)h=Math.imul(h^char.charCodeAt(0),16777619);return h>>>0;}
