/** Star chart: persistent choices and expedition specializations. No storage or DOM. */
export const PATHS=[
 {id:'swift',name:'远行之翼',icon:'wind',color:'#a7d7be',desc:'赶路、拾光与灵活出手'},
 {id:'warden',name:'守灯之心',icon:'shield',color:'#e4c18b',desc:'承伤、补给与主动护卫'},
 {id:'dawn',name:'破晓之光',icon:'star',color:'#c8b4e6',desc:'光弹、光环与爆发联动'}
];
export const TREE=[
 {id:'light-step',path:'swift',name:'轻羽',max:2,cost:2,desc:'每级移速 +4',stats:{speed:4}},
 {id:'wide-bag',path:'swift',name:'沿途拾光',max:2,cost:2,requires:'light-step',desc:'每级拾取范围 +12',stats:{pickup:12}},
 {id:'short-route',path:'swift',name:'近路记忆',max:2,cost:3,requires:'wide-bag',desc:'每级冲刺冷却 -0.12 秒',stats:{dashMax:-.12}},
 {id:'field-study',path:'swift',name:'阅历',max:2,cost:3,requires:'short-route',desc:'每级战斗与探索经验 +5%'},
 {id:'first-flight',path:'swift',name:'掠光急递',max:1,cost:5,requires:'field-study',desc:'冲刺后 2 秒，下一轮光弹伤害 +18%'},
 {id:'warm-heart',path:'warden',name:'灯芯余温',max:2,cost:2,desc:'每级生命上限 +6',stats:{maxHp:6}},
 {id:'thick-feather',path:'warden',name:'护信披羽',max:2,cost:2,requires:'warm-heart',desc:'每级伤害减免 +2%',stats:{armor:.02}},
 {id:'herbal-tea',path:'warden',name:'草木温方',max:2,cost:3,requires:'thick-feather',desc:'每级补给回复 +6',stats:{potionHeal:6}},
 {id:'spare-flask',path:'warden',name:'留一口暖',max:1,cost:4,requires:'herbal-tea',desc:'启程多带 1 瓶补给（总上限 5）'},
 {id:'safe-circle',path:'warden',name:'不熄的圆',max:1,cost:5,requires:'spare-flask',desc:'光环命中至少 2 名敌人，获得 2 秒一次抵挡'},
 {id:'bright-wick',path:'dawn',name:'明灯',max:2,cost:2,desc:'每级光弹伤害 +1.5',stats:{damage:1.5}},
 {id:'resonance',path:'dawn',name:'敲响邮铃',max:2,cost:2,requires:'bright-wick',desc:'每级光环伤害 +5',stats:{pulseDamage:5}},
 {id:'clear-sight',path:'dawn',name:'晨星瞄准',max:2,cost:3,requires:'resonance',desc:'每级暴击率 +3%',stats:{crit:.03}},
 {id:'ringcraft',path:'dawn',name:'回音练习',max:2,cost:3,requires:'clear-sight',desc:'每级光环冷却 -0.15 秒',stats:{pulseMax:-.15}},
 {id:'sealed-light',path:'dawn',name:'破晓封缄',max:1,cost:5,requires:'ringcraft',desc:'施放光环后 2 秒，下一轮光弹伤害 +20%'}
];
const byId=Object.fromEntries(TREE.map(n=>[n.id,n]));
const int=(n,max=1e12)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export const emptyGrowth=()=>({version:1,tree:{},claims:[],arcs:[]});
export const treeRank=(p,id)=>p?.growth?.tree?.[id]||0;
export const treeCost=(node,level)=>node.cost+level;
export function readGrowth(raw){
 const g=emptyGrowth();if(!raw||raw.version!==1)return g;
 for(const node of TREE){const n=raw.tree?.[node.id];if(int(n,node.max)&&n>0&&(!node.requires||g.tree[node.requires]>0))g.tree[node.id]=n;}
 g.claims=GOALS.filter(q=>Array.isArray(raw.claims)&&raw.claims.includes(q.id)).map(q=>q.id);
 g.arcs=ARC_IDS.filter(id=>Array.isArray(raw.arcs)&&raw.arcs.includes(id));return g;
}
export function treeStatus(p,id){
 const n=Object.hasOwn(byId,id)?byId[id]:null;if(!n)return {allowed:false,reason:'未知星点'};
 const level=treeRank(p,id),cost=treeCost(n,level);
 const reason=level>=n.max?'已点满':n.requires&&!treeRank(p,n.requires)?'先点亮「'+byId[n.requires].name+'」':p.stamps<cost?'邮票不足':'';
 return {allowed:!reason,reason,cost,level};
}
export function buyNode(p,id){const status=treeStatus(p,id);if(!status.allowed)return false;p.stamps-=status.cost;p.spent+=status.cost;p.growth.tree[id]=status.level+1;return true;}
export function treeInvestment(p){return TREE.reduce((sum,n)=>sum+Array.from({length:treeRank(p,n.id)},(_,i)=>treeCost(n,i)).reduce((a,b)=>a+b,0),0);}
export function resetTree(p){const amount=treeInvestment(p);if(!amount)return false;p.growth.tree={};p.stamps+=amount;p.spent=Math.max(0,p.spent-amount);return amount;}
export function mastery(p){
 const t=p.totals,xp=Math.floor(t.kills*2+t.beacons*8+t.deliveries*15+t.endlessBosses*35),level=Math.min(30,1+Math.floor(Math.sqrt(xp/80)));
 return {xp,level,start:80*(level-1)**2,next:level===30?null:80*level**2};
}
export const GOALS=[
 {id:'first-job',name:'第一次出勤',desc:'点亮 1 座灯塔，或击败 10 名影兽',reward:2,current:p=>Math.max(p.totals.beacons,p.totals.kills/10),goal:1},
 {id:'street-friend',name:'街角的朋友',desc:'累计送达 3 封信',reward:3,current:p=>p.totals.deliveries,goal:3},
 {id:'night-worker',name:'百影夜航',desc:'累计击败 100 名影兽',reward:3,current:p=>p.totals.kills,goal:100},
 {id:'first-boss',name:'首领来信',desc:'无尽击破 1 位首领，或剧情通关 1 次',reward:3,current:p=>Math.max(p.totals.endlessBosses,p.totals.wins),goal:1},
 {id:'light-route',name:'灯火航线',desc:'累计点亮 18 座灯塔',reward:4,current:p=>p.totals.beacons,goal:18},
 {id:'deep-flight',name:'第十层的风',desc:'无尽完成 10 层',reward:4,current:p=>p.endless.bestFloor,goal:10},
 {id:'resident-book',name:'后来的故事',desc:'完成三位居民的后续故事',reward:4,current:p=>new Set((p.growth?.arcs||[]).map(id=>id.split(':')[0])).size,goal:3},
 {id:'master-courier',name:'熟练的羽翼',desc:'信使熟练度达到 5 级',reward:5,current:p=>mastery(p).level,goal:5}
];
export const ARC_IDS=['shuo:escort','shuo:hearth','moss:seed','moss:share','sen:remember','sen:tomorrow'];
export function claimGoal(p,id){const q=GOALS.find(q=>q.id===id);if(!q||p.growth.claims.includes(id)||q.current(p)<q.goal)return false;p.growth.claims.push(id);p.stamps+=q.reward;p.earned+=q.reward;return true;}
export const DISCIPLINES=[
 {id:'swift',name:'疾行专精',symbol:'wind',desc:'每点移速 +10、冲刺冷却 -0.1 秒。三级：冲刺后下一轮光弹 +18%。'},
 {id:'warden',name:'守灯专精',symbol:'shield',desc:'每点生命上限 +10、减伤 +1.5%。三级：光环命中两敌获得一次抵挡。'},
 {id:'dawn',name:'破晓专精',symbol:'star',desc:'每点所有伤害 +7%、暴击 +2%。三级：光环后下一轮光弹 +20%。'}
];
export function initGrowth(s,profile){
 const tree=readGrowth(profile.growth).tree;
 s.growth={version:1,tree:{...tree},disciplines:{swift:0,warden:0,dawn:0},banished:[],banishes:2,dashUntil:0,pulseUntil:0};
 s.journal.potions=Math.min(5,s.journal.potions+(tree['spare-flask']||0));
}
export const growthOn=s=>s?.growth?.version===1;
export function specializationPoints(s){if(!growthOn(s))return 0;return [3,5,8].filter(n=>s.journal.level>=n).length-Object.values(s.growth.disciplines).reduce((a,b)=>a+b,0);}
export function specialize(s,id){if(!growthOn(s)||!['playing','upgrade'].includes(s.phase)||!DISCIPLINES.some(d=>d.id===id)||specializationPoints(s)<=0)return false;s.growth.disciplines[id]++;s.events.push({type:'specialize',id});return true;}
export function applyGrowthStats(s,st){
 if(!growthOn(s))return;const g=s.growth;
 for(const n of TREE)for(const [key,value]of Object.entries(n.stats||{}))st[key]+=value*(g.tree[n.id]||0);
 st.speed+=g.disciplines.swift*10;st.dashMax-=g.disciplines.swift*.1;st.maxHp+=g.disciplines.warden*10;st.armor+=g.disciplines.warden*.015;st.crit+=g.disciplines.dawn*.02;
 st.damage*=growthPower(s);st.pulseDamage*=growthPower(s);
}
export const growthPower=s=>growthOn(s)?1+s.growth.disciplines.dawn*.07:1;
export const growthXP=s=>growthOn(s)?1+(s.growth.tree['field-study']||0)*.05:1;
export function growthDash(s){if(growthOn(s)&&(s.growth.tree['first-flight']||s.growth.disciplines.swift===3))s.growth.dashUntil=s.totalTime+2;}
export function growthPulse(s,hits){
 if(!growthOn(s))return;const g=s.growth;
 if(g.tree['sealed-light']||g.disciplines.dawn===3)g.pulseUntil=s.totalTime+2;
 if(hits>=2&&(g.tree['safe-circle']||g.disciplines.warden===3)){s.v12.barrier=1;s.v12.barrierSource='paper';s.v12.barrierUntil=Math.max(s.v12.barrierUntil,s.totalTime+2);}
}
export const growthBoltBonus=s=>growthOn(s)?(s.growth.dashUntil>s.totalTime?1.18:1)*(s.growth.pulseUntil>s.totalTime?1.2:1):1;
export function consumeGrowthBolt(s){if(growthOn(s)){s.growth.dashUntil=0;s.growth.pulseUntil=0;}}
export function validateGrowth(s){
 if(s.growth===undefined)return true;const g=s.growth;if(!g||g.version!==1||s.v12?.mode==='challenge'||!g.tree||!g.disciplines)return false;
 if(Object.entries(g.tree).some(([id,n])=>!Object.hasOwn(byId,id)||!int(n,byId[id].max)||n===0||byId[id].requires&&!g.tree[byId[id].requires]))return false;
 if(Object.keys(g.disciplines).length!==3||DISCIPLINES.some(d=>!int(g.disciplines[d.id],3))||specializationPoints(s)<0)return false;
 const allowed=['cinder','frost','orbit','thunder','haste','might','wing','vitality','magnet','focus','sustain','pulsecraft'];
 if(!Array.isArray(g.banished)||new Set(g.banished).size!==g.banished.length||g.banished.some(id=>!allowed.includes(id)||s.endless?.ranks[id])||!int(g.banishes,2)||g.banishes+g.banished.length!==2)return false;
 if(!s.endless&&g.banished.length)return false;
 return ['dashUntil','pulseUntil'].every(k=>Number.isFinite(g[k])&&g[k]>=0&&g[k]<=s.totalTime+2);
}
