import {GEAR,GEAR_BY_ID,SLOTS,SETS,gearDescription,TALENTS,TALENT_COST,ACHIEVEMENTS,NPCS,ENDINGS,EVENTS,CONTRACTS,BESTIARY,LEGACY_SETS} from './content.mjs';
import {equip,forge,forgeCost,salvage,usePotion,nearestPOI,openPOI,chooseStory,buy,chooseEvent,contractProgress,equippedSets,compareGear} from './systems.mjs';
import {buyTalent,resetTalents,chooseHeirloom,rank} from './progress.mjs';
import {drawResidentPortrait} from './render.mjs';
import {buyNode,resetTree,claimGoal,ARC_IDS} from './growth.mjs';
import {starChart,specializationView} from './growth-view.mjs';
import {ARCS,CHAPTER_NOTES,followupAvailable,residentPages} from './narrative.mjs';
import {chooseSpecialization,chooseContinuation} from './core.mjs';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=id=>`<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
const header=(title,small='')=>`<h3 class="panel-heading">${title}<small>${small}</small></h3>`;
const button=(text,action,id='',disabled=false,subtle=false)=>`<button class="small-button${subtle?' subtle':''}" data-action="${action}" data-id="${id}"${disabled?' disabled':''}>${text}</button>`;
export class Hub {
  constructor({getRun,getProfile,commit,persist,onOpen,toast}){
    Object.assign(this,{getRun,getProfile,commit,persist,onOpen,toast});this.tab='inventory';this.encounter=null;this.page=0;this.notice='';
    for(const b of document.querySelectorAll('[data-hub]'))b.addEventListener('click',()=>{const launcher=$('menu-systems');if(launcher?.open)launcher.close();this.show(b.dataset.hub);});
    for(const b of document.querySelectorAll('[data-hub-tab]'))b.addEventListener('click',()=>{this.tab=b.dataset.hubTab;this.notice='';this.render();});
    $('hub-panel').addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(b&&!b.disabled)this.action(b.dataset.action,b.dataset.id);});
    $('encounter-body').addEventListener('click',event=>{const b=event.target.closest('[data-encounter]');if(b&&!b.disabled)this.encounterAction(b.dataset.encounter,b.dataset.id);});
    const tabs=[...document.querySelectorAll('[data-hub-tab]')];for(const [i,b]of tabs.entries())b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.click();next.focus();});
  }
  show(tab='inventory'){this.tab=tab;this.notice='';this.render();this.onOpen();if(!$('hub-dialog').open)$('hub-dialog').showModal();}
  render(){
    const s=this.getRun(),p=this.getProfile();
    $('hub-wallet').innerHTML=`${icon('letter')}<strong>${p.stamps}</strong>邮票${s?`<br>${icon('coin')}<strong>${s.journal.coins}</strong>星砂`:''}`;
    for(const b of document.querySelectorAll('[data-hub-tab]')){const active=b.dataset.hubTab===this.tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
    let content=this.tab==='tree'?starChart(p):this.tab==='inventory'?this.inventory(s,p):this.tab==='journal'?this.journal(s,p):this.tab==='office'?this.office(s,p):this.tab==='achievements'?this.achievements(p):this.codex(p);
    $('hub-panel').innerHTML=(this.notice?`<div class="hub-toast" role="status">${esc(this.notice)}</div>`:'')+content;
  }
  gearCard(item,s,p,{collection=false,shop=false}={}){
    const g=GEAR_BY_ID[item.id],equipped=s&&s.gear.slots[g.slot]===g.id;
    let actions='';
    if(shop){const stock=item;const owned=s.gear.inventory.some(i=>i.id===g.id);actions=button(owned?'已经拥有':stock.left<1?'售罄':`${stock.price} 星砂 · 购买`,'buy',g.id,owned||stock.left<1||s.journal.coins<stock.price);}
    else if(collection){actions=g.tier===0?'':button(p.heirloom===g.id?'已选为启程藏品':'设为启程藏品','heirloom',g.id,p.heirloom===g.id);}
    else{actions=button(equipped?'已穿戴':'穿戴','equip',g.id,equipped);if(g.tier>0){actions+=button(item.level>=3?'已满锻':`锻造 ${forgeCost(item,s)} 砂`,'forge',g.id,item.level>=3||s.journal.coins<forgeCost(item,s));if(!equipped)actions+=button('拆解','salvage',g.id,false,true);}}
    const preview=s&&!equipped?compareGear(s,g.id):null;const comparison=preview?Object.entries(preview.changes).map(([key,n])=>`${({maxHp:'生命',damage:'光弹',speed:'移速',armor:'减伤',crit:'暴击',pulseMax:'光环冷却',attackRate:'光弹间隔'})[key]} ${n>0?'+':''}${['armor','crit'].includes(key)?Math.round(n*100)+'%':n.toFixed(2)}`).join(' · '):'';
    return `<article class="gear-card tier-${g.tier}${equipped?' equipped':''}"><div class="card-top">${icon(g.icon)}<span class="rarity-label">${['旧物','精良','珍稀'][g.tier]} · ${SLOTS[g.slot]}${!collection&&!shop?' +'+(item.level-1):''}</span></div><h3>${g.name}</h3><div class="gear-stats">${gearDescription({id:g.id,level:item.level||1},s?.rulesVersion||120)}</div><p class="gear-lore">${g.desc}</p>${comparison?`<p class="gear-compare">换装变化：${comparison}</p>`:''}${preview?`<small class="gear-compare">穿戴后：${Object.entries(preview.sets).map(([id,n])=>SETS[id].name+' '+n+'/3').join(' · ')||'基础行装'}</small>`:''}<div class="set-label">${SETS[g.set].name}</div><div class="card-actions">${actions}</div></article>`;
  }
  inventory(s,p){
    if(!s){return `<p class="panel-lead">每次旅途的装备在本局内成长。你发现过的装备会永久收录；可选择一件「启程藏品」，以初始锻造等级带入下次旅途。${p.heirloom?`<br>当前藏品：<strong>${GEAR_BY_ID[p.heirloom].name}</strong> ${button('取消携带','heirloom','',false,true)}`:''}</p>${header('行装收藏',`${p.collection.length} / ${GEAR.length}`)}<div class="gear-grid">${p.collection.map(id=>this.gearCard({id,level:1},null,p,{collection:true})).join('')}</div>`;}
    const pl=s.player,sets=equippedSets(s);
    const slotCards=Object.entries(s.gear.slots).map(([slot,id])=>{const g=GEAR_BY_ID[id],item=s.gear.inventory.find(i=>i.id===id);return `<div class="equipped-slot">${icon(g.icon)}<div><strong>${g.name}</strong><small>${SLOTS[slot]} · 锻造 ${item.level-1}</small></div></div>`;}).join('');
    const badges=Object.entries(sets).map(([id,n])=>`<span>${SETS[id].name} ${n}/3<small>${n>=2?SETS[id].two:'再穿一件激活两件套'}${n===3?' · '+(s.rulesVersion===111?LEGACY_SETS[id]:SETS[id].three):''}</small></span>`).join('');
    return specializationView(s)+`<p class="panel-lead">打开背包时旅途暂停。换装会立刻改变属性；锻造不会凭空回复生命。星砂来自影兽、灯塔、投递与探索。</p><div class="equipment-slots">${slotCards}</div><div class="stat-strip"><span>生命<b>${Math.round(pl.maxHp)}</b></span><span>光弹<b>${pl.damage.toFixed(1)}</b></span><span>移速<b>${pl.speed.toFixed(0)}</b></span><span>减伤<b>${Math.round(pl.armor*100)}%</b></span><span>暴击<b>${Math.round(pl.crit*100)}%</b></span><span>光环冷却<b>${pl.pulseMax.toFixed(1)}s</b></span></div><div class="set-badges">${badges}</div>${header('随身背包',`${s.gear.inventory.length} / 12 件`)}<div class="gear-grid">${s.gear.inventory.map(item=>this.gearCard(item,s,p)).join('')}</div>`;
  }
  journal(s,p){
    let active='';if(s){const c=CONTRACTS.find(c=>c.id===s.contract.id),progress=contractProgress(s);active=`<div class="contract-card"><div><h3>${c.name}${s.contract.complete?' · 已达成':''}</h3><p>${c.desc}<br>完成结算后获得 ${c.reward} 枚邮票</p></div><span class="contract-number">${progress.current}/${progress.total}</span></div>${header('正在携带的信',`${s.story.delivered.length} / 3 已投递`)}<div class="task-list">${s.story.tasks.length?s.story.tasks.map(t=>`<div class="task-row">${icon(t.complete?'check':'letter')}<strong>${t.name}</strong><span>${t.complete?'已送达':'到已亮的灯塔旁停留'}</span></div>`).join(''):'<div class="empty-note">去地图上的居民身边，接下一封信。<br>靠近时按 F，或点击「交谈」。</div>'}</div><div class="stat-strip"><span>本局等级<b>${s.journal.level}</b></span><span>击败影兽<b>${s.kills}</b></span><span>连击纪录<b>${s.journal.bestCombo}</b></span><span>投递<b>${s.metrics.deliveries}</b></span><span>开箱<b>${s.metrics.chests}</b></span><span>已使用补给<b>${s.metrics.potionsUsed}</b></span></div>`;}
    const letters=NPCS.map(n=>`<article class="story-card${p.letters.includes(n.letter)?'':' locked'}"><span class="sender">${p.letters.includes(n.letter)?n.name+' · 已送达':'暮色邮局 · 等待投递'}</span><h3>${p.letters.includes(n.letter)?n.letterTitle:'一封尚未送达的信'}</h3><p>${p.letters.includes(n.letter)?n.letterText:'在街区里找到愿意托付给你的人，让灯塔把心意送往远方。'}</p></article>`).join('');
    const current=s?.narrative?`<article class="arc-card"><h4>${['沉灯街','雨眠庭','无晓钟楼'][s.chapter]} · 本章手记</h4><p>${CHAPTER_NOTES[s.chapter]}</p><p>${s.beacons.every(b=>b.lit)?'三灯已亮：送达本章信件后，回访居民可开启后续。':'后续线索：送出信件、点亮本章三灯，再回访居民。后续支线可自由选择。'}</p></article>`:'';
    const archive=header('后来发生的事',`${p.growth.arcs.length} / ${ARC_IDS.length} 条回音`)+ARCS.map(a=>{const seen=a.choices.filter(c=>p.growth.arcs.includes(a.npc+':'+c.id));return `<article class="arc-card"><h4>${a.name}</h4><p>${seen.length?seen.map(c=>c.text).join('\n\n'):'送达居民的信件并点亮本章三灯后，回到他们身边。也许还有一段故事，等你一起写完。'}</p></article>`;}).join('');
    return current+active+archive+header('回信档案',`${p.letters.length} / 3`)+`<div class="story-grid">${letters}</div>`+header('天亮之后',`${p.endings.length} / 3 种结局`)+Object.entries(ENDINGS).map(([id,e])=>`<article class="ending-card"><h3>${p.endings.includes(id)?e.name:'尚未抵达的清晨'}</h3><p>${p.endings.includes(id)?e.text:'与居民交谈、送达他们的信；有时，分给别人一点光，会照亮另一条归途。'}</p></article>`).join('');
  }
  office(s,p){
    return `<div class="office-overview">${icon('sun')}<div><h3>${rank(p)}</h3><p>累计送达 ${p.totals.deliveries} 封信 · 点亮 ${p.totals.beacons} 盏灯<br>完成 ${p.totals.contracts} 份委托 · 见证 ${p.totals.wins} 次黎明</p></div><strong>${p.stamps}<small style="font:9px var(--sans);display:block;text-align:center;margin-top:5px">邮票</small></strong></div><p class="panel-lead">邮票来自成就、旅途结算、委托与每日航线。邮局课程永久保留，<strong>下次启程生效</strong>。每次购买只提升一级，不会影响正在进行的旅途。</p>${button('打开夜航星图 · 15 星点','tab','tree')}<div class="talent-grid">${TALENTS.map(t=>{const level=p.talents[t.id],cost=TALENT_COST(level);return `<article class="talent-card"><div class="card-top">${icon(t.icon)}<span class="rarity-label">${level} / ${t.max}</span></div><h3>${t.name}</h3><p>${t.desc}</p><div class="talent-dots">${Array.from({length:t.max},(_,i)=>`<i class="${i<level?'on':''}"></i>`).join('')}</div>${button(level>=t.max?'课程已修满':`${cost} 邮票 · 进修`,'talent',t.id,level>=t.max||p.stamps<cost)}</article>`;}).join('')}</div>${button('重置基础课程 · 全额返还','reset-talents','',Object.values(p.talents).every(n=>n===0),true)}${header('启程藏品')}<p class="panel-lead">${p.heirloom?`下次携带「${GEAR_BY_ID[p.heirloom].name}」。`:'尚未选择。发现装备后，在装备收藏里挑选一件。'}${button('打开行装收藏','tab','inventory',false,true)}</p>${header('每日航线')}<p class="panel-lead">主菜单勾选「公平每日航线」，使用统一的零级课程、黄铜行灯、1 瓶补给与标准难度。日期按北京时间划分，每个条件组合首次通关额外获 3 枚邮票；同日同组合重试只刷新个人纪录。可选浓雾、小包裹、加急和精英巡夜，离线也能玩。</p>`;
  }
  achievements(p){return `<div class="achievement-summary"><strong>${p.achievements.length}</strong> / ${ACHIEVEMENTS.length} 个小小的里程碑</div><div class="achievement-grid">${ACHIEVEMENTS.map(a=>{const got=p.achievements.includes(a.id);return `<article class="achievement-card ${got?'unlocked':'locked'}">${icon(a.icon)}<div><h3>${a.name}</h3><p>${a.desc}</p><small>${a.reward?`${got?'已获得':'奖励'} · ${a.reward} 邮票`:(got?'纪念回信 · '+a.story:'完成后收藏一封纪念回信')}</small></div></article>`;}).join('')}</div>`;}
  codex(p){return header('街区来客',`${p.bestiary.length} / ${BESTIARY.length}`)+`<div class="codex-grid">${BESTIARY.map(b=>`<article class="codex-card${p.bestiary.includes(b.id)?'':' locked'}"><h3>${p.bestiary.includes(b.id)?b.name:'还未遇见的影兽'}</h3><p>${p.bestiary.includes(b.id)?b.desc:'带着提灯走进街区，记录长夜中的来客。'}</p></article>`).join('')}</div>`+header('行装图鉴',`${p.collection.length} / 12`)+`<div class="gear-grid">${GEAR.map(g=>p.collection.includes(g.id)?this.gearCard({id:g.id,level:1},null,p,{collection:true}):`<article class="gear-card locked"><div class="card-top">${icon(g.icon)}<span class="rarity-label">未发现</span></div><h3>一件失落的${SLOTS[g.slot]}</h3><p class="gear-lore">在失物箱、流动商店或旧街事件中寻找它的故事。</p></article>`).join('')}</div>`;}
  mutate(fn){const s=this.getRun();if(!s)return false;s.events=[];const ok=fn(s);if(ok)this.commit(s.events);return ok;}
  action(action,id){
    if(action==='tab'){this.tab=id;this.render();return;}
    if(['tree','reset-tree','goal','reset-talents'].includes(action)){const p=this.getProfile(),ok=action==='tree'?buyNode(p,id):action==='reset-tree'?resetTree(p):action==='goal'?claimGoal(p,id):resetTalents(p);this.notice=ok?(action.startsWith('reset')?`已返还 ${ok} 邮票，下次启程使用新的配置。`:action==='goal'?'成长奖励已领取。':'星点已点亮，下次启程生效。'):'当前条件不足。';if(ok)this.persist();this.render();return;}
    if(action==='specialize'){this.mutate(s=>chooseSpecialization(s,id));this.render();return;}
    if(action==='talent'){if(buyTalent(this.getProfile(),id)){this.notice='课程已进修，下次启程生效。';this.persist();}this.render();return;}
    if(action==='heirloom'){if(chooseHeirloom(this.getProfile(),id)){this.notice=id?'启程藏品已装好，下次出发时会自动穿戴。':'已取消启程藏品。';this.persist();}this.render();return;}
    const fn=action==='equip'?equip:action==='forge'?forge:action==='salvage'?salvage:null;if(fn){const ok=this.mutate(s=>fn(s,id));this.notice=ok?({equip:'行装已更换。',forge:'锻造完成，属性已经生效。',salvage:'已拆解为星砂，图鉴记录保留。'}[action]):'当前无法完成这项操作。';this.render();}
  }
  interact(){
    const s=this.getRun(),poi=nearestPOI(s);if(!poi)return;
    let result;this.mutate(s=>{result=openPOI(s,poi.id);return !!result;});if(!result)return;if(result.kind==='risk'){this.toast('侧巷守卫已现身。击败它取回行装与 24 星砂。',5);return;}
    this.encounter={...result,id:poi.id};this.page=0;this.onOpen();this.renderEncounter();if(!$('encounter-dialog').open)$('encounter-dialog').showModal();
  }
  renderEncounter(){
    const s=this.getRun(),e=this.encounter;if(!s||!e)return;const body=$('encounter-body');$('encounter-portrait').hidden=true;
    if(e.kind==='continuation'){
      const arc=ARCS[e.npc],n=NPCS[e.npc],done=s.narrative.followups.find(a=>a.npc===n.id);$('encounter-role').textContent='后续来信 · '+arc.name;$('encounter-name').textContent=n.name;$('encounter-portrait').hidden=false;drawResidentPortrait($('encounter-portrait'),e.npc);
      body.innerHTML=done?`<p class="dialogue-text">${arc.choices.find(c=>c.id===done.choice).text}</p><p class="encounter-confirm">本局效果已生效，这段回音已收藏进旅途手札。</p><button class="primary full-width" data-encounter="leave">带着回音继续走 ${icon('arrow')}</button>`:`<p class="dialogue-text">${arc.intro}</p><div class="dialogue-choices">${arc.choices.map(c=>`<button class="dialogue-choice" data-encounter="continuation" data-id="${c.id}"${s.journal.coins<(c.cost||0)?' disabled':''}>${c.name}<small>${c.desc}${s.journal.coins<(c.cost||0)?' · 星砂不足':''}</small></button>`).join('')}</div>`;
    }else if(e.kind==='npc'){
      const n=NPCS[e.npc],done=s.pois.find(p=>p.id===e.id).used;$('encounter-role').textContent=n.role;$('encounter-name').textContent=n.name;$('encounter-portrait').hidden=false;drawResidentPortrait($('encounter-portrait'),e.npc);
      if(done){body.innerHTML=`<p class="dialogue-text">${n.after}</p><p class="encounter-confirm">信件已收好。在任意已点亮的灯塔旁停留片刻，即可完成投递。</p><button class="primary full-width" data-encounter="leave">把信送出去 ${icon('arrow')}</button>`;}
      else{const pages=residentPages(s,e.npc),last=this.page>=pages.length-1;body.innerHTML=`<p class="dialogue-text">${pages[this.page]}</p><p class="dialogue-page">${this.page+1} / ${pages.length}</p>${last?`<div class="dialogue-choices">${n.choices.map(c=>`<button class="dialogue-choice" data-encounter="story" data-id="${c.id}"${s.player.embers<(c.embers||0)?' disabled':''}>${c.text}<small>${c.effect}${s.player.embers<(c.embers||0)?' · 火种不足':''}</small></button>`).join('')}</div>`:`<button class="primary full-width" data-encounter="next">听他说下去 ${icon('arrow')}</button>`}`;}
    }else if(e.kind==='shop'){
      $('encounter-role').textContent='流动商店 · 星砂交易';$('encounter-name').textContent='夜路杂货铺';const shop=s.pois.find(p=>p.id===e.id);
      body.innerHTML=`<p class="shop-balance">随身星砂 ${s.journal.coins} · 提灯下的交易不会消耗时间</p><div class="shop-grid">${shop.stock.map(item=>GEAR_BY_ID[item.id]?this.gearCard(item,s,this.getProfile(),{shop:true}):`<article class="gear-card"><div class="card-top">${icon('tea')}<span class="rarity-label">余 ${item.left}</span></div><h3>${item.id==='tea'?'一杯热茶':'便携补给'}</h3><p class="gear-stats">${item.id==='tea'?'立即回复 40 生命':'补给数量 +1，上限 5'}</p><div class="card-actions">${button(item.left<1?'售罄':`${item.price} 星砂 · 购买`,'buy',item.id,item.left<1||s.journal.coins<item.price||(item.id==='tea'?s.player.hp>=s.player.maxHp:s.journal.potions>=5))}</div></article>`).join('')}</div>`;
      for(const b of body.querySelectorAll('[data-action="buy"]')){b.dataset.encounter='buy';delete b.dataset.action;}
    }else if(e.kind==='event'){
      const poi=s.pois.find(p=>p.id===e.id),event=EVENTS[poi.event];$('encounter-role').textContent='街角奇遇 · 一次选择';$('encounter-name').textContent=event.name;
      body.innerHTML=`<p class="dialogue-text">${event.intro}</p><div class="dialogue-choices">${event.choices.map(c=>{const disabled=s.player.embers<(c.embers||0)||s.journal.coins<(c.cost||0)||s.player.hp<=(c.damage||0);return `<button class="dialogue-choice" data-encounter="event" data-id="${c.id}"${disabled?' disabled':''}>${c.text}<small>${c.desc}${disabled?' · 条件不足':''}</small></button>`;}).join('')}</div>`;
    }else if(e.kind==='chest'){
      const g=GEAR_BY_ID[e.gear];$('encounter-role').textContent='失物招领 · 找到一件行装';$('encounter-name').textContent='有人留下了光';body.innerHTML=`<div class="loot-display">${icon(g.icon)}<h3>${g.name}</h3><p>${gearDescription({id:g.id,level:1})}</p><p>${g.desc}</p></div><p class="encounter-confirm">装备已装入背包，另获得 10 星砂与探索经验。</p><button class="primary full-width" data-encounter="loot-equip">立即穿戴 ${icon('arrow')}</button><button class="secondary full-width" data-encounter="leave">先收好，继续赶路</button>`;
    }
  }
  encounterAction(action,id){
    if(action==='leave'){$('encounter-dialog').close();return;}
    if(action==='next'){this.page++;this.renderEncounter();return;}
    const e=this.encounter;if(action==='continuation'){if(this.mutate(s=>chooseContinuation(s,e.id,id)))this.renderEncounter();return;}if(action==='story'){if(this.mutate(s=>chooseStory(s,e.id,id)))this.renderEncounter();}
    if(action==='buy'){this.mutate(s=>buy(s,e.id,id));this.renderEncounter();}
    if(action==='event'){if(this.mutate(s=>chooseEvent(s,e.id,id))){$('encounter-dialog').close();this.toast('这条街记住了你的选择。',3);}}
    if(action==='loot-equip'){this.mutate(s=>equip(s,e.gear));$('encounter-dialog').close();}
  }
}
