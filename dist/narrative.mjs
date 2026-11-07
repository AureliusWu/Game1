/** Resident follow-ups. Every reward is owned by a unique, proximity-checked choice. */
import {NPCS} from './content.mjs';
export const CHAPTER_NOTES=[
 '烛羽在邮局门前领到第一只邮包。岑灯没有给他一张终点明确的地图，只在边角写下：先问问街角的人，为什么还留着灯。',
 '雨水把沉灯街的灰冲进花园。上一封信已经离开邮包，留下的重量却没有变轻。烛羽开始懂得，送达之后，还可以回头问一句：后来呢？',
 '钟楼一直停在离天亮一刻钟的地方。岑灯坐在台阶上，手里捏着一张没有地址的回执。烛羽第一次发现，前辈也会等一封信。'
];
export const ARCS=[
 {npc:'shuo',name:'门后的脚步',intro:'灯塔把信带走后，小朔跑回来，手里多了一小截蓝围巾。「奶奶说门已经打开了，可我还是有一点怕。你会怎么陪我走最后这段路？」',
  choices:[
   {id:'escort',name:'陪他认一遍回家的路',desc:'本局移速 +8',stats:{speed:8},text:'烛羽沿着灯影画出三个路标。小朔数着它们走到家门，最后一步没有再回头。奶奶把门开得更大了一点。'},
   {id:'hearth',name:'出 8 星砂修好门前的风灯',desc:'消耗 8 星砂 · 本局生命上限 +10',cost:8,stats:{maxHp:10},text:'风灯亮起的时候，小朔把围巾挂到门边。「以后有人晚回家，也能看见这里。」烛羽发现，留灯的人已经多了一位。'}
  ]},
 {npc:'moss',name:'春天的回邮',intro:'苔生收到回信：远方的人没有忘记花园，只是也被困在自己的长夜里。「我想把第一株芽送过去。可是花园也需要种子。」',
  choices:[
   {id:'seed',name:'留下种子，把春天画在信里',desc:'本局火种回复 +1.5',stats:{heal:1.5},text:'他们把花芽描在信纸上，连同泥土的颜色一起寄出。苔生给剩下的种子腾出一排位置，写上两个人的名字。'},
   {id:'share',name:'出 8 星砂订一只护苗盒',desc:'消耗 8 星砂 · 本局光弹伤害 +3',cost:8,stats:{damage:3},text:'小小的护苗盒被装进邮袋，叶子没有再淋雨。苔生第一次关上花园的门，决定天亮后亲自去走一趟那条路。'}
  ]},
 {npc:'sen',name:'没有地址的回执',intro:'岑灯终于展开回执。上面的收信人是守夜者，也是他失去联系的老搭档。「如果他连自己的名字都忘了，我该把这封信寄给谁？」',
  choices:[
   {id:'remember',name:'把他们共同点过的灯写在背面',desc:'本局光环冷却 -0.3 秒',stats:{pulseMax:-.3},text:'从第一盏到最后一盏，岑灯把名字写满整张纸。钟声落下时，守夜者认出了那些街名，也慢慢认出了写字的人。'},
   {id:'tomorrow',name:'出 8 星砂订下明早的双人邮路',desc:'消耗 8 星砂 · 本局暴击 +4%',cost:8,stats:{crit:.04},text:'烛羽在班表上留出两个空位。岑灯没有问另一位还会不会来，只把旧帽子放在第二把椅子上。未来第一次有了可以填写的地方。'}
  ]}
];
export function initNarrative(s){s.narrative={version:1,followups:[]};}
export const narrativeOn=s=>s?.narrative?.version===1&&!s.endless;
export function followupAvailable(s,p){return narrativeOn(s)&&p?.kind==='npc'&&p.used&&s.story.delivered.includes(NPCS[p.npc].letter)&&s.beacons.every(b=>b.lit)&&!s.narrative.followups.some(a=>a.npc===NPCS[p.npc].id);}
export function residentPages(s,index){
 const n=NPCS[index],pages=[...n.pages];if(!narrativeOn(s))return pages;
 if(index===0)pages.splice(1,0,'烛羽蹲下来，看到信封上写了两遍地址。小朔说，第一遍是怕奶奶认不出，第二遍是怕自己忘了回去。');
 if(index===1)pages.unshift(s.story.delivered.includes('home')?'「沉灯街的风灯亮了，我从这里都看得见。」苔生把伞偏向烛羽，让信袋先避开雨。':'「我以前每天都能收到街那头的消息。」苔生看看空邮袋，还是替烛羽抖掉了雨水。');
 if(index===2)pages.unshift(s.story.choices.some(c=>c.choice==='share')?'「你把自己的火种也留下了。」岑灯听完前两条街的事，往长椅里面挪了挪。':'岑灯摸摸邮包的扣子。「把信送到已经很不容易。至于别的事，你可以慢慢学。」');
 return pages;
}
export function chooseFollowup(s,poiId,id){
 const p=s.pois.find(p=>p.id===poiId);if(s.phase!=='playing'||!followupAvailable(s,p)||Math.hypot(s.player.x-p.x,s.player.y-p.y)>112)return false;
 const arc=ARCS[p.npc],c=arc.choices.find(c=>c.id===id);if(!c||s.journal.coins<(c.cost||0))return false;
 s.journal.coins-=c.cost||0;s.narrative.followups.push({npc:arc.npc,choice:id});s.events.push({type:'followup',npc:arc.npc,choice:id});return true;
}
export function applyNarrativeStats(s,st){if(!narrativeOn(s))return;for(const a of s.narrative.followups){const c=ARCS.find(n=>n.npc===a.npc)?.choices.find(c=>c.id===a.choice);for(const [k,v]of Object.entries(c?.stats||{}))st[k]+=v;}}
export function epilogue(s){if(!narrativeOn(s))return '';return s.narrative.followups.map(a=>ARCS.find(n=>n.npc===a.npc)?.choices.find(c=>c.id===a.choice)?.text||'').join('\n\n');}
export function deliveryReply(s,id){
 if(!narrativeOn(s))return '';const n=NPCS.find(n=>n.letter===id),shared=s.story.choices.some(c=>c.npc===n?.id&&c.choice==='share');
 return ({home:shared?'奶奶回信：火种已经收到，今晚也给路过的人留一盏灯。':'奶奶回信：门没有锁。告诉那孩子，字写得很好。',garden:shared?'远方回信：那一点暖意，我隔着信纸也收到了。':'远方回信：花园的事，请继续讲给我听。',legacy:shared?'旧回执上多出一行字：这次，别让点灯的人独自等。':'旧回执上的地址渐渐显现：无晓钟楼，守夜的人收。'})[id]||'';
}
export function validateNarrative(s){
 if(s.narrative===undefined)return true;const n=s.narrative;
 return !!n&&n.version===1&&!s.endless&&s.v12?.mode!=='challenge'&&Array.isArray(n.followups)&&n.followups.length<=3&&new Set(n.followups.map(a=>a.npc)).size===n.followups.length&&n.followups.every(a=>ARCS.some((arc,i)=>arc.npc===a.npc&&arc.choices.some(c=>c.id===a.choice)&&s.story.delivered.includes(NPCS[i].letter)));
}
