import {createGame,tick,dash,pulse,chooseUpgrade,serialize,restore,finalScore,CHAPTERS,UPGRADES,DIFFICULTIES,usePotion,nearestPOI,poiLabel} from './core.mjs';
import {supplyCost,buyEndlessSupply,WEATHERS,weatherFor,isEndless,SKILLS,SKILL_BY_ID,RELICS,rankOf,evolved,choiceInfo,xpThreshold,rerollEndless,retireEndless} from './endless.mjs';
import {Renderer,drawTitle} from './render.mjs';
import {AudioEngine} from './audio.mjs';
import {GEAR_BY_ID,CONTRACTS,ACHIEVEMENTS,ENDINGS,CONDITIONS,SETS} from './content.mjs';
import {XP_THRESHOLDS} from './systems.mjs';
import {readProfile,recordProgress,rank,dailySeed,challengeKey} from './progress.mjs';
import {Hub} from './hub.mjs';
const $=id=>document.getElementById(id);
const audio=new AudioEngine();
const STORE={settings:'ember-courier.settings.v1',stats:'ember-courier.stats.v1',save:'ember-courier.save.v1',profile:'ember-courier.profile.v1'};
let storageWarned=false;
const storage={
  get(k){try{return localStorage.getItem(k);}catch{return null;}},
  set(k,v){try{localStorage.setItem(k,v);return true;}catch{warnStorage();return false;}},
  remove(k){try{localStorage.removeItem(k);}catch{warnStorage();}}
};
function warnStorage(){if(storageWarned)return;storageWarned=true;$('storage-warning').hidden=false;setTimeout(()=>$('storage-warning').hidden=true,6500);}
function readJSON(key,fallback){try{return JSON.parse(storage.get(key))??fallback;}catch{return fallback;}}
const defaults={mode:'endless',starter:'cinder',difficulty:'normal',sound:true,lowMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,touch:window.matchMedia('(pointer: coarse)').matches,contract:'lamps',daily:false,conditions:[]};
const storedSettings=readJSON(STORE.settings,{});
const settings={...defaults};
if(storedSettings&&typeof storedSettings==='object'){
  if(['endless','story'].includes(storedSettings.mode))settings.mode=storedSettings.mode;
  if(SKILLS.some(u=>u.kind==='weapon'&&u.id===storedSettings.starter))settings.starter=storedSettings.starter;
  if(DIFFICULTIES[storedSettings.difficulty])settings.difficulty=storedSettings.difficulty;
  for(const k of ['sound','lowMotion','touch','daily'])if(typeof storedSettings[k]==='boolean')settings[k]=storedSettings[k];
  if(Array.isArray(storedSettings.conditions))settings.conditions=storedSettings.conditions.filter(id=>CONDITIONS.some(c=>c.id===id));
  if(CONTRACTS.some(c=>c.id===storedSettings.contract))settings.contract=storedSettings.contract;
}
const statsDefaults={best:0,wins:0,beacons:0,runs:0,bestTime:0};
const storedStats=readJSON(STORE.stats,{}),stats={...statsDefaults};
if(storedStats&&typeof storedStats==='object')for(const k of Object.keys(statsDefaults))if(Number.isFinite(storedStats[k])&&storedStats[k]>=0)stats[k]=storedStats[k];
const profile=readProfile(storage.get(STORE.profile),stats);
const renderer=new Renderer($('world'),$('minimap'));
let run=null,screen='menu',paused=false,last=performance.now(),saveTimer=0,hudTimer=0,ended=false;
let bannerUntil=0,letterUntil=0,toastUntil=0,achievementUntil=0;
const keys=new Set();let joystickId=null,joy={x:0,y:0},joyCenter={x:0,y:0},destination=null,stuckFor=0;
const difficultyCopy={wander:'慢一点也没关系。影兽更温和，灯火更长明。',normal:'有一点危险，也有足够的光。',night:'影兽更凶，长夜更漫长。得分 ×1.3。'};
for(const c of CONTRACTS){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;$('contract-select').append(option);}
for(const c of CONDITIONS){const label=document.createElement('label');label.className='route-condition';const input=document.createElement('input');input.type='checkbox';input.value=c.id;input.checked=settings.conditions.includes(c.id);input.addEventListener('change',()=>{settings.conditions=[...document.querySelectorAll('#route-conditions input:checked')].map(i=>i.value);saveSettings();updateSettings();});const text=document.createElement('span');text.textContent=c.name;const small=document.createElement('small');small.textContent=c.desc;label.append(input,text,small);$('route-conditions').append(label);}
for(const u of SKILLS.filter(u=>u.kind==='weapon')){const b=document.createElement('button');b.dataset.starter=u.id;b.innerHTML=`<svg aria-hidden="true"><use href="#i-${u.symbol}"/></svg><strong>${u.name}</strong><small>${u.id==='cinder'?'命中爆炸':u.id==='frost'?'范围减速':u.id==='orbit'?'环绕羽刃':'连锁闪电'}</small>`;b.addEventListener('click',()=>{settings.starter=u.id;saveSettings();updateSettings();audio.play('click');});$('starter-options').append(b);}
const hub=new Hub({getRun:()=>screen==='game'&&!ended?run:null,getProfile:()=>profile,commit:events=>{processEvents(events);syncProgress();checkpoint();updateHUD();},persist:()=>{persistProfile();refreshOfficeLabels();},onOpen:()=>{clearInput();audio.unlock();audio.play('click');checkpoint();},toast});
function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=t=>parts.find(p=>p.type===t).value;return `${part('year')}-${part('month')}-${part('day')}`;}
function refreshOfficeLabels(){$('menu-stamps').textContent=profile.stamps;$('office-rank').textContent=rank(profile);$('achievement-summary').textContent=`${profile.achievements.length} / ${ACHIEVEMENTS.length} 成就`;}
function persistProfile(){storage.set(STORE.profile,JSON.stringify(profile));}
function syncProgress(final=false){
  if(!run)return;const unlocked=recordProgress(profile,run,{final});
  if(unlocked.length&&screen==='game'){$('achievement-toast-name').textContent=unlocked[0].name+(unlocked.length>1?` 等 ${unlocked.length} 项`:'');$('achievement-toast-reward').textContent=unlocked.some(a=>a.reward)?`+${unlocked.reduce((n,a)=>n+a.reward,0)} 邮票`:'纪念回信已收录';$('achievement-toast').hidden=false;achievementUntil=performance.now()+6000;audio.play('beacon');}
  if(unlocked.length||final)persistProfile();refreshOfficeLabels();
}
function saveSettings(){storage.set(STORE.settings,JSON.stringify(settings));}
function updateSettings(){
  if(settings.mode==='endless')settings.daily=false;
  $('story-prep').hidden=settings.mode!=='story';$('endless-prep').hidden=settings.mode!=='endless';
  for(const b of document.querySelectorAll('[data-mode]')){b.classList.toggle('selected',b.dataset.mode===settings.mode);b.setAttribute('aria-pressed',String(b.dataset.mode===settings.mode));}
  for(const b of document.querySelectorAll('[data-starter]')){b.classList.toggle('selected',b.dataset.starter===settings.starter);b.setAttribute('aria-pressed',String(b.dataset.starter===settings.starter));}
  $('start').querySelector('span').innerHTML=settings.mode==='endless'?'开启无尽夜航<small>ONE MORE FLOOR</small>':'启程送信<small>BEGIN YOUR JOURNEY</small>';
  $('endless-record').textContent=profile.endless?.bestFloor?`最深 ${profile.endless.bestFloor} 层 · ${profile.endless.bosses} 次首领击破 · 试试另一种起手`:'每 5 层迎战首领 · 3 武器 / 4 被动 · 组合进化';
  document.documentElement.classList.toggle('reduced-motion',settings.lowMotion);
  document.documentElement.classList.toggle('touch-mode',settings.touch);
  document.documentElement.classList.toggle('no-touch',!settings.touch);
  renderer.lowMotion=settings.lowMotion;audio.setEnabled(settings.sound);
  $('sound-setting').checked=settings.sound;$('motion-setting').checked=settings.lowMotion;$('touch-setting').checked=settings.touch;
  for(const button of document.querySelectorAll('.sound-toggle')){
    button.setAttribute('aria-label',settings.sound?'关闭声音':'开启声音');button.querySelector('use').setAttribute('href',settings.sound?'#i-sound':'#i-muted');
  }
  for(const button of document.querySelectorAll('[data-difficulty]')){
    const selected=button.dataset.difficulty===(settings.daily?'normal':settings.difficulty);button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));button.disabled=settings.daily;
  }
  $('difficulty-desc').textContent=settings.daily?'公平每日航线：标准难度、统一课程、黄铜行灯与 1 瓶补给。':difficultyCopy[settings.difficulty];
  $('contract-select').value=settings.daily?'swift':settings.contract;$('contract-select').disabled=settings.daily;$('daily-setting').checked=settings.daily;
  const routeKey=challengeKey({daily:today(),v12:{conditions:settings.conditions}});
  $('prep-note').textContent=settings.daily?`${today()} · ${profile.challengeClaims.includes(routeKey)?'本航线奖励已领取，可重试纪录':'本条件组合首次通关额外获得 3 邮票'}${profile.challengeBests[routeKey]?' · 最快 '+formatTime(profile.challengeBests[routeKey]):''}`:CONTRACTS.find(c=>c.id===settings.contract).desc+' · 奖励 '+CONTRACTS.find(c=>c.id===settings.contract).reward+' 邮票';
}
function updateMenu(){
  updateSettings();
  refreshOfficeLabels();
  const saved=restore(storage.get(STORE.save));
  $('continue').hidden=!saved;
  if(saved)$('continue-chapter').textContent=`${isEndless(saved)?'无尽第 '+saved.endless.floor+' 层':'第 '+(saved.chapter+1)+' 章'} · ${CHAPTERS[saved.chapter].name}`;
  $('record-summary').textContent=settings.mode==='endless'&&profile.endless.bestFloor?`无尽最深 ${profile.endless.bestFloor} 层`:profile.totals.beacons?`${profile.totals.wins} 次黎明 · ${profile.totals.beacons} 盏灯`:'等待第一束光';
  $('record-best').textContent=stats.best.toLocaleString('zh-CN');$('record-wins').textContent=stats.wins;$('record-beacons').textContent=profile.totals.beacons;$('record-runs').textContent=stats.runs;
  $('record-note').textContent=settings.mode==='endless'&&profile.endless.runs?`无尽夜航最深 ${profile.endless.bestFloor} 层 · 首领击破 ${profile.endless.bosses} 次 · 完成 ${profile.endless.runs} 局。`:stats.bestTime?`最快送达：${formatTime(stats.bestTime)}。城市记得你的每一次启程。`:'你的故事，从第一束光开始。';
}
function formatTime(time){const n=Math.floor(time);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function clearInput(){keys.clear();joystickId=null;joy={x:0,y:0};destination=null;renderer.destination=null;stuckFor=0;$('joystick-thumb').style.transform='translate(0,0)';}
function showDialog(id){const d=$(id);if(!d.open)d.showModal();clearInput();}
function closeDialogs(){for(const d of document.querySelectorAll('dialog[open]'))d.close();}
function checkpoint(){if(run&&!ended){syncProgress();const data=serialize(run);if(data)storage.set(STORE.save,data);}persistProfile();}
function setScreen(next){screen=next;document.body.dataset.screen=next;$('menu').hidden=next!=='menu';$('game').hidden=next!=='game';document.body.style.overflow=next==='game'?'hidden':'';clearInput();if(next==='game')renderer.resize();else{updateMenu();window.scrollTo(0,0);}}
function announceChapter(){
  const ch=CHAPTERS[run.chapter];$('banner-number').textContent=isEndless(run)?`FLOOR ${run.endless.floor} · ${run.endless.floor%5===0?'BOSS':'ENDLESS NIGHT'}`:`CHAPTER ${ch.number}`;$('banner-title').textContent=ch.name;$('banner-subtitle').textContent=isEndless(run)?'清开敌潮 · 拾取经验 · 打出你的构筑':ch.subtitle;
  $('chapter-banner').hidden=false;$('chapter-banner').style.animation='none';void $('chapter-banner').offsetWidth;$('chapter-banner').style.animation='';bannerUntil=run.totalTime+4.2;
  $('letter-toast').hidden=true;$('game-toast').hidden=true;letterUntil=0;toastUntil=0;
}
async function begin(resume=false){
  audio.unlock();closeDialogs();
  const day=settings.daily?today():'',options={mode:settings.mode,starter:settings.starter,difficulty:settings.daily?'normal':settings.difficulty,profile,contract:settings.daily?'swift':settings.contract,daily:day,conditions:settings.conditions,firstJourney:!settings.daily&&profile.totals.runs===0,id:window.crypto?.randomUUID?.()||`${Date.now()}-${Math.floor(Math.random()*1e8)}`};if(day)options.seed=dailySeed(day);
  run=resume?restore(storage.get(STORE.save)):createGame(options);
  if(!run)run=createGame(options);
  ended=false;paused=false;saveTimer=0;renderer.chapter=-1;renderer.particles=[];
  setScreen('game');announceChapter();updateHUD();checkpoint();$('world').focus({preventScroll:true});
  if(run.phase==='upgrade')showUpgrade();else toast(isEndless(run)?'光弹自动攻击。拾取微光升级，E 光环解围，空格冲刺！':'拾起火种点灯，也别忘了街角等待来信的居民。',5);
}
function pauseGame(){if(screen!=='game'||!run||ended||run.phase!=='playing'||paused)return;if(document.querySelector('dialog[open]')){checkpoint();clearInput();return;}paused=true;checkpoint();clearInput();showDialog('pause-dialog');}
function resumeGame(){if(!run||ended)return;audio.unlock();$('pause-dialog').close();paused=false;clearInput();last=performance.now();$('world').focus({preventScroll:true});}
function returnToMenu(){checkpoint();closeDialogs();paused=false;setScreen('menu');}
function toast(text,seconds=3){$('game-toast').textContent=text;$('game-toast').hidden=false;toastUntil=(run?.totalTime||0)+seconds;}
function doDash(){if(screen==='game'&&!paused&&!document.querySelector('dialog[open]')&&dash(run))audio.play('dash');}
function doPulse(){if(screen!=='game'||paused||document.querySelector('dialog[open]'))return;run.events=[];if(pulse(run)){processEvents(run.events);checkpoint();updateHUD();}}
function doPotion(){if(screen!=='game'||paused||document.querySelector('dialog[open]'))return;run.events=[];if(usePotion(run)){processEvents(run.events);checkpoint();updateHUD();}}
function showUpgrade(){
  if(isEndless(run)){showEndlessDraft();return;}
  $('endless-market').hidden=true;$('upgrade-title').textContent='带一束新的光';$('draft-reroll').hidden=true;$('endless-retire').hidden=true;
  checkpoint();clearInput();$('upgrade-copy').textContent=run.v12?.choiceKind==='field'?'第二盏灯已经亮起。选一束新的光，留在街区继续送信。':`${CHAPTERS[run.chapter].name}重新亮了起来。挑一件礼物，继续向前。`;
  $('upgrade-note').textContent=run.v12?.choiceKind==='field'?'选择一项强化，生命回满，继续本章。':'选择一项强化，生命回满，前往下一片街区。';
  const container=$('upgrade-options');container.replaceChildren();
  for(const id of run.offered){const u=UPGRADES.find(u=>u.id===id);const b=document.createElement('button');b.className='upgrade-card';
    b.innerHTML=`<svg aria-hidden="true"><use href="#i-${u.symbol}"/></svg><strong>${u.name}</strong><span>${u.desc}</span><small>带上这束光 →</small>`;
    b.addEventListener('click',()=>{audio.unlock();audio.play('beacon');const previousChapter=run.chapter;if(chooseUpgrade(run,u.id)){$('upgrade-dialog').close();paused=false;if(run.chapter!==previousChapter)announceChapter();updateHUD();checkpoint();$('world').focus({preventScroll:true});}});container.append(b);
  }
  showDialog('upgrade-dialog');
}
function showEndlessDraft(){
  checkpoint();clearInput();const r=run.endless,route=r.choice==='route',relic=r.choice==='relic';
  $('upgrade-title').textContent=route?'下一层，走哪条路？':relic?'一件奇物，改变规则':'再添一份力量';
  $('upgrade-copy').textContent=route?`第 ${r.floor} 层已清场${(r.floor+1)%5===0?'。下一层必战首领，做好准备！':'。这次选择，决定下一层的风险与奖励。'}`:relic?'本局永久生效。代价、联动与机会，由你取舍。':`Lv.${run.journal.level} · 三选一。已有技能可强化至 Lv.5，搭配对应被动即可进化。`;
  $('upgrade-note').textContent=route?`下一层天气 · ${WEATHERS[weatherFor(run,r.floor+1)].name}：${WEATHERS[weatherFor(run,r.floor+1)].desc} 可保存续玩或封存结算。`:'最多 3 种武器、4 种被动。强化选择与重抽次数均会保存。';
  $('draft-reroll').hidden=route;$('draft-reroll').disabled=r.rerolls<=0;$('draft-reroll').textContent=`重抽 · 剩 ${r.rerolls} 次`;$('endless-retire').hidden=!route;
  const market=$('endless-market');market.hidden=!route;market.replaceChildren();if(route){const label=document.createElement('span');label.textContent=`驿站补给 · ${run.journal.coins} 星砂 · 每项本层限购一次`;market.append(label);for(const id of ['tea','potion','reroll']){const b=document.createElement('button');const cost=supplyCost(run,id);b.textContent=({tea:'热茶 +25% 生命',potion:'补给 +1',reroll:'重抽 +1'})[id]+' · '+cost+' 砂';b.disabled=r.market.includes(id)||run.journal.coins<cost||(id==='tea'?run.player.hp>=run.player.maxHp:id==='potion'?run.journal.potions>=5:r.rerolls>=3);b.addEventListener('click',()=>{run.events=[];if(buyEndlessSupply(run,id)){processEvents(run.events);showEndlessDraft();updateHUD();}});market.append(b);}}
  const container=$('upgrade-options');container.replaceChildren();
  for(const id of run.offered){const u=choiceInfo(run,id),b=document.createElement('button');b.className='upgrade-card'+(relic?' relic-card':'');b.disabled=!!u.disabled;
    b.innerHTML=`<small class="draft-tag">${u.tag}</small><svg aria-hidden="true"><use href="#i-${u.symbol}"/></svg><strong>${u.name}</strong><span>${u.desc}</span>${u.detail?`<span class="card-detail">${u.detail}</span>`:''}<small>${u.disabled?'星砂不足':route?'走这条路 →':'收入构筑 →'}</small>`;
    b.addEventListener('click',()=>{run.events=[];const floor=r.floor;if(chooseUpgrade(run,id)){$('upgrade-dialog').close();paused=false;audio.play('beacon');if(r.floor!==floor)announceChapter();processEvents(run.events);updateHUD();checkpoint();if(run.phase==='playing')$('world').focus({preventScroll:true});}});container.append(b);
  }showDialog('upgrade-dialog');
}
function showBuild(){
 if(!isEndless(run))return;checkpoint();const r=run.endless,c=$('build-content');c.replaceChildren();
 for(const u of SKILLS){const level=rankOf(run,u.id);if(!level)continue;const card=document.createElement('article');card.className='build-entry';const evo=evolved(run,u.id);card.innerHTML=`<strong>${evo?'✦ '+u.evolution:u.name}<small>Lv.${level} / 5 · ${u.kind==='weapon'?'武器':'被动'}</small></strong><p>${evo?u.evo:u.desc}</p>${u.partner?`<small>进化：${u.name} 5 + ${SKILL_BY_ID[u.partner].name} 2（当前 ${rankOf(run,u.partner)}）</small>`:''}`;c.append(card);}
 const weather=document.createElement('p');weather.textContent=`本层天气 · ${WEATHERS[r.weather].name}：${WEATHERS[r.weather].desc}`;c.append(weather);
 const title=document.createElement('h3');title.textContent=`奇物 · ${r.relics.length} / 8`;c.append(title);
 for(const id of r.relics){const u=RELICS.find(u=>u.id===id),card=document.createElement('article');card.className='build-entry';card.innerHTML=`<strong>${u.name}${id==='dawn'&&r.revived?' · 已燃尽':''}</strong><p>${u.desc}</p>`;c.append(card);}
 if(!r.relics.length){const p=document.createElement('p');p.textContent='挑战首领或选择奇物回廊，清场后可以获得奇物。';c.append(p);}showDialog('build-dialog');
}
function finish(){
  if(ended)return;ended=true;clearInput();storage.remove(STORE.save);
  syncProgress(true);
  const won=run.phase==='won'&&!isEndless(run),score=finalScore(run),newBest=score>stats.best;
  stats.runs++;stats.beacons+=run.litTotal;if(won){stats.wins++;if(!stats.bestTime||run.totalTime<stats.bestTime)stats.bestTime=run.totalTime;}
  stats.best=Math.max(stats.best,score);storage.set(STORE.stats,JSON.stringify(stats));
  $('result-icon').setAttribute('href',won?'#i-sun':'#i-flame');$('result-eyebrow').textContent=won?'DELIVERED AT DAYBREAK':'THE LIGHT IS STILL OUT THERE';
  const ending=ENDINGS[run.story.ending]||ENDINGS.dawn;
  $('result-title').textContent=won?ending.name+'。':'微光暂歇，旅途未完。';
  if(won)$('result-eyebrow').textContent=ending.subtitle;
  $('result-story').textContent=won?ending.text:'你留下的灯火没有熄灭。整理好邮包，再一次出发。总有一封信，等你送到天亮。';
  $('result-review').replaceChildren();
  if(run.v12&&!isEndless(run)){const v=run.v12,sets=Object.entries(run.gear.slots).map(([,id])=>GEAR_BY_ID[id].set),build=Object.keys(SETS).filter(id=>id!=='plain'&&sets.filter(x=>x===id).length>=2).map(id=>SETS[id].name).join(' / ')||'自由混搭';const spent=12+(run.talentSnapshot.fund||0)*5+run.metrics.coinsEarned-run.journal.coins;const sources=Object.entries(v.damageSources).sort((a,b)=>b[1]-a[1]).map(([name,n])=>name+' '+Math.round(n)).join(' · ')||'未受攻击伤害';for(const text of [`${v.mode==='challenge'?'公平挑战':'故事旅途'} · ${build} · ${v.conditions.map(id=>CONDITIONS.find(c=>c.id===id).name).join(' / ')||'常规航线'}`,`星砂收入 ${run.metrics.coinsEarned} / 支出 ${spent} / 结余 ${run.journal.coins}`,`最低生命 ${Math.round(v.minHp)} · 危险时间 ${v.lowTime.toFixed(1)} 秒 · 实际恢复 ${Math.round(v.healed)}`,`受击来源：${sources}`,`抵挡 ${v.barriers} · 回响 ${v.echoes} · 打断 ${v.interrupts} · 支路 ${v.riskCleared}/3`,v.riskCleared?'下一局：换一套行装，或为航线加一个条件。':'下一局：寻找地图上的旗帜，试试风险支路的精英与行装。']){const line=document.createElement('p');line.textContent=text;$('result-review').append(line);}}
  const reward=profile.lastRewards;$('settlement-note').textContent=`本次结算 ${reward?.journey===run.journeyId?reward.total:0} 枚邮票${run.contract.complete?' · 委托已完成':''}${reward?.daily?' · 每日航线首次送达':''}。成就奖励另计。`;
  $('result-score').textContent=score.toLocaleString('zh-CN');$('result-beacons').textContent=`${run.litTotal}/9`;$('result-time').textContent=formatTime(run.totalTime);$('result-best').hidden=!newBest;
  if(isEndless(run)){const r=run.endless;$('result-eyebrow').textContent=r.retired?'NIGHT FLIGHT LOGGED':'ONE MORE RUN';$('result-title').textContent=r.retired?'这段夜航，值得记住。':'微光暂歇，再来一局。';$('result-story').textContent=`抵达第 ${r.floor} 层，完成 ${r.cleared} 层，击破 ${r.bosses} 位首领。${r.retired?'本次航线已经封存。':'换个起手，试试另一种进化。'}`;$('result-beacons').textContent=r.cleared;$('result-beacons').nextElementSibling.textContent='完成层数';for(const text of [`${Object.keys(r.ranks).map(id=>(evolved(run,id)?SKILL_BY_ID[id].evolution:SKILL_BY_ID[id].name)+' '+rankOf(run,id)).join(' · ')}`,`武器进化 ${r.evolutions.length} · 奇物 ${r.relics.length} · 击杀 ${run.kills}`,`最深纪录 ${profile.endless.bestFloor} 层 · 最低生命 ${Math.round(run.v12.minHp)} · 用药 ${run.metrics.potionsUsed}`,`本局邮票 ${reward?.journey===run.journeyId?reward.total:0} · 重抽 ${r.rerollsUsed} 次`]){const p=document.createElement('p');p.textContent=text;$('result-review').append(p);}}else $('result-beacons').nextElementSibling.textContent='点亮灯塔';
  showDialog('result-dialog');
}
function processEvents(events){
  for(const e of events){audio.play(e.type);
    if(e.type==='beacon'){
      const b=run.beacons[e.id];renderer.react([{type:'beacon',x:b.x,y:b.y}]);
      if(e.lit===1){const ch=CHAPTERS[run.chapter];$('letter-text').textContent=ch.letter;$('letter-sender').textContent=ch.sender;$('letter-toast').hidden=false;letterUntil=run.totalTime+8;}
      if(e.lit===3&&run.chapter<2)toast('三座灯塔已亮，前往街区右侧的金色拱门。',5);
      else toast(`灯塔已点亮 · ${e.lit}/3，附近可恢复生命。`,3);
    }
    if(e.type==='boss')toast(isEndless(run)?'夜航首领现身！看清预警，横向躲避；光环可打断蓄力。':'守夜者醒来了。灯塔可挡光球；看到定向预警请侧移。',6);
    if(e.type==='boss-warning')toast(e.text,5);
    if(e.type==='interrupt')toast('光环打断了定向回声。',2);
    if(e.type==='shield')toast('护灯屏障抵挡了一次攻击。',2);
    if(e.type==='tailwind')toast('顺风已起 · 3 秒加速。',2);
    if(e.type==='boss-defeated')toast(isEndless(run)?'首领击破！清掉余下敌人，领取奇物。':'长夜退去了。前往金色拱门，把黎明送达。',6);
    if(e.type==='level'&&!isEndless(run))toast(`信使等级 ${e.level} · 生命与光弹变得更强。`,3);
    if(e.type==='room-clear')toast(`第 ${e.floor} 层清场！整理构筑，挑选下一条路。`,4);
    if(e.type==='evolution')toast(`武器进化 · ${e.name}！`,6);
    if(e.type==='revive')toast('第二次黎明已燃尽 · 复起！',5);
    if(e.type==='storm-warning')toast('雷雨锁定了脚下，离开紫色圆圈！',2);
    if(e.type==='fever')toast('20 连击 · 狂热 5 秒！',3);
    if(e.type==='gear')toast(`发现装备：${GEAR_BY_ID[e.id].name}，可在背包穿戴。`,4);
    if(e.type==='duplicate')toast('相同的装备已转为 8 星砂。',3);
    if(e.type==='delivery')toast(`「${e.name}」已经送达 · +15 星砂。`,5);
    if(e.type==='contract')toast('邮局委托已达成，结算时领取邮票。',4);
    if(e.type==='elite')toast('钟声唤醒了一只精英影兽，击败它取回行装。',5);
    if(e.type==='potion')toast('喝下一口热补给，继续赶路。',2);
    if(e.type==='upgrade')showUpgrade();
    if(e.type==='won'||e.type==='lost')finish();
  }
  renderer.react(events);
  if(events.some(e=>['collect','death','beacon','delivery','gear','equip','forge','purchase','contract','level','story'].includes(e.type)))syncProgress();
}
function updateHUD(){
  if(!run)return;const p=run.player;
  $('hp-text').textContent=`${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`;$('hp-bar').style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;$('hp-bar').parentElement.classList.toggle('low',p.hp/p.maxHp<.3);
  $('ember-count').textContent=p.embers;$('chapter-name').textContent=(isEndless(run)?'第 '+run.endless.floor+' 层 · ':'')+CHAPTERS[run.chapter].name;$('run-time').textContent=formatTime(run.totalTime);$('score-label').textContent=String(finalScore(run)).padStart(4,'0');
  const dots=$('beacon-dots').children;for(let i=0;i<3;i++)dots[i].classList.toggle('lit',run.beacons[i].lit);
  const lit=run.beacons.filter(b=>b.lit).length;
  const j=run.journal;$('level-label').textContent=`Lv.${j.level}`;$('coin-count').textContent=j.coins;
  const base=isEndless(run)?xpThreshold(j.level):XP_THRESHOLDS[j.level-1],next=isEndless(run)?xpThreshold(j.level+1):XP_THRESHOLDS[j.level];$('xp-bar').style.width=`${next?Math.min(100,(j.xp-base)/(next-base)*100):100}%`;
  $('combo-label').hidden=j.combo<2;$('combo-label').textContent=`${j.combo} 连击`;
  $('potion-count').textContent=j.potions;$('potion').disabled=j.potions<1||p.hp>=p.maxHp||j.potionCd>0;
  const poi=nearestPOI(run);$('interact').hidden=!poi;if(poi)$('interact-label').textContent=poiLabel(poi);
  $('objective').textContent=run.exit.open?(run.chapter===2?'前往金色拱门，把黎明送达':'灯塔已全部点亮 · 前往右侧金色拱门'):lit===3?'击败守夜者 · 看清预警，及时换位':p.embers>=4?'携带足够火种 · 靠近未点亮的灯塔':`收集火种点亮灯塔 · 每座需要 4 枚（${p.embers}/4）`;
  $('run-status').textContent=run.v12?`${run.v12.mode==='challenge'?'公平航线':'故事旅途'} · ${['灯下大街','雨棚回廊','钟楼侧巷'][run.v12.layout]}${run.v12.barrier?' · 抵挡 ×1':''}${run.v12.shield?' · 护盾 '+Math.ceil(run.v12.shield):''}${run.v12.tailwindUntil>run.totalTime?' · 顺风':''}${run.v12.combatUntil>run.totalTime?' · 战斗休整':''}`:'上次旅途 · 沿用旧规则';
  const boss=run.enemies.find(e=>e.kind==='boss');$('boss-bar').hidden=!boss;if(boss){$('boss-name').textContent=isEndless(run)?['沉钟监守','夜邮猎手','暴雨领主'][boss.bossType]:'守夜者';$('boss-subtitle').textContent=isEndless(run)?['锁定光束 · 横移或光环打断','冲锋锁线 · 侧移避让','环形弹雨 · 拉开距离'][boss.bossType]:'长夜最后的回声';}if(boss)$('boss-hp').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;
  for(const [id,cd,max,label] of [['dash',p.dashCd,p.dashMax,'SPACE'],['pulse',p.pulseCd,p.pulseMax,'E']]){
    $(id).classList.toggle('cooldown',cd>0);$(id).setAttribute('aria-disabled',String(cd>0));$(id).style.setProperty('--cooldown',`${cd/max*100}%`);
    $(`${id}-cd`).textContent=cd>0?cd.toFixed(1):label;$(`${id}-cd`).classList.toggle('counting',cd>0);
  }
  if(isEndless(run)){const r=run.endless;$('objective').textContent=`清开本层敌潮 · ${r.roomKills} / ${r.total}${r.floor%5===0?' · 首领层':''}`;$('run-status').textContent=`无尽夜航 · ${WEATHERS[r.weather].name} · ${r.evolutions.length?'进化 '+r.evolutions.length+' · ':''}剩余敌人 ${r.remaining+run.enemies.length}${run.v12.barrier?' · 屏障 ×1':''}${r.feverUntil>run.totalTime?' · 狂热':''}`;$('build-count').textContent=Object.keys(r.ranks).length+' / 7';}
  $('build-open').hidden=!isEndless(run);document.body.dataset.phase=run.phase;
}
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{settings.mode=b.dataset.mode;saveSettings();updateSettings();});
for(const b of document.querySelectorAll('[data-difficulty]'))b.addEventListener('click',()=>{settings.difficulty=b.dataset.difficulty;audio.play('click');saveSettings();updateSettings();});
for(const b of document.querySelectorAll('[data-dialog]'))b.addEventListener('click',()=>showDialog(b.dataset.dialog));
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target!==d||['pause-dialog','upgrade-dialog','result-dialog'].includes(d.id))return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
$('build-open').addEventListener('click',showBuild);$('draft-reroll').addEventListener('click',()=>{if(rerollEndless(run)){audio.play('click');showEndlessDraft();checkpoint();}});$('endless-retire').addEventListener('click',()=>{run.events=[];if(retireEndless(run)){closeDialogs();processEvents(run.events);}});
$('difficulty-info').addEventListener('click',()=>showDialog('guide'));
$('contract-select').addEventListener('change',e=>{settings.contract=e.target.value;saveSettings();updateSettings();});$('daily-setting').addEventListener('change',e=>{settings.daily=e.target.checked;saveSettings();updateSettings();});
$('settings-open').addEventListener('click',()=>showDialog('settings'));
$('records-open').addEventListener('click',()=>{updateMenu();showDialog('records');});
$('start').addEventListener('click',()=>begin());$('continue').addEventListener('click',()=>begin(true));$('restart').addEventListener('click',()=>begin());
$('game-hub').addEventListener('click',()=>isEndless(run)?showBuild():hub.show('inventory'));$('result-office').addEventListener('click',()=>hub.show('office'));$('interact').addEventListener('click',()=>hub.interact());$('potion').addEventListener('click',doPotion);
$('pause').addEventListener('click',pauseGame);$('resume').addEventListener('click',resumeGame);$('save-exit').addEventListener('click',returnToMenu);$('upgrade-exit').addEventListener('click',returnToMenu);$('result-menu').addEventListener('click',returnToMenu);$('game-settings').addEventListener('click',()=>showDialog('settings'));
$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resumeGame();});$('upgrade-dialog').addEventListener('cancel',e=>e.preventDefault());$('result-dialog').addEventListener('cancel',e=>{e.preventDefault();returnToMenu();});
for(const b of document.querySelectorAll('.sound-toggle'))b.addEventListener('click',()=>{settings.sound=!settings.sound;saveSettings();updateSettings();});
$('sound-setting').addEventListener('change',e=>{settings.sound=e.target.checked;saveSettings();updateSettings();});$('motion-setting').addEventListener('change',e=>{settings.lowMotion=e.target.checked;saveSettings();updateSettings();});
$('touch-setting').addEventListener('change',e=>{settings.touch=e.target.checked;saveSettings();updateSettings();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else $('fullscreen').textContent='当前浏览器暂不支持全屏';}catch{$('fullscreen').textContent='请通过浏览器菜单开启全屏';}});
for(const id of ['dash','pulse'])$(id).addEventListener('pointerdown',e=>{e.preventDefault();audio.unlock();id==='dash'?doDash():doPulse();});
for(const id of ['dash','pulse'])$(id).addEventListener('click',e=>{if(e.detail===0){audio.unlock();id==='dash'?doDash():doPulse();}});
window.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  const modal=document.querySelector('dialog[open]');
  if(screen==='game'&&!modal&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(!e.repeat&&(e.code==='KeyP'||e.code==='Escape')&&screen==='game'){
    if(modal&&modal.id!=='pause-dialog')return;
    e.preventDefault();paused?resumeGame():pauseGame();return;
  }
  if(modal){if(modal.id==='upgrade-dialog'&&!e.repeat&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();$('upgrade-options').children[Number(e.code.at(-1))-1]?.click();}return;}
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='Space')doDash();if(e.code==='KeyE')doPulse();
  if(screen==='game'&&!paused){if(e.code==='KeyF')hub.interact();if(e.code==='KeyH')doPotion();if(e.code==='KeyJ')isEndless(run)?showBuild():hub.show('inventory');}
  if(e.code==='KeyM'){settings.sound=!settings.sound;saveSettings();updateSettings();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
$('world').addEventListener('pointerdown',e=>{if(screen!=='game'||paused||run.phase!=='playing'||document.querySelector('dialog[open]')||e.button>0)return;const rect=$('world').getBoundingClientRect();destination={x:(e.clientX-rect.left)/renderer.zoom+renderer.camera.x,y:(e.clientY-rect.top)/renderer.zoom+renderer.camera.y};renderer.destination=destination;stuckFor=0;$('world').focus({preventScroll:true});});
const stick=$('joystick');
function updateJoy(e){const dx=e.clientX-joyCenter.x,dy=e.clientY-joyCenter.y,len=Math.hypot(dx,dy),max=38,f=Math.min(1,max/Math.max(1,len));joy={x:dx*f/max,y:dy*f/max};$('joystick-thumb').style.transform=`translate(${dx*f}px,${dy*f}px)`;}
stick.addEventListener('pointerdown',e=>{if(joystickId!==null)return;e.preventDefault();joystickId=e.pointerId;const r=stick.getBoundingClientRect();joyCenter={x:r.left+r.width/2,y:r.top+r.height/2};stick.setPointerCapture(e.pointerId);updateJoy(e);audio.unlock();});
stick.addEventListener('pointermove',e=>{if(e.pointerId===joystickId){e.preventDefault();updateJoy(e);}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===joystickId){joystickId=null;joy={x:0,y:0};$('joystick-thumb').style.transform='translate(0,0)';}});
window.addEventListener('resize',()=>{if(screen==='game')renderer.resize();});
window.addEventListener('blur',()=>{clearInput();if(screen==='game')pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){checkpoint();pauseGame();audio.suspend();}});
window.addEventListener('pagehide',checkpoint);
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(achievementUntil&&now>achievementUntil){$('achievement-toast').hidden=true;achievementUntil=0;}
  if(screen==='menu'){
    if(!document.hidden)drawTitle($('title-art'),now/1000,settings.lowMotion);
  }else if(run){
    const active=!paused&&!document.querySelector('dialog[open]')&&run.phase==='playing'&&!document.hidden;
    if(active){
      let x=joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      let y=joy.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
      if(Math.hypot(x,y)>.08){destination=null;renderer.destination=null;}
      if(destination){const d=Math.hypot(destination.x-run.player.x,destination.y-run.player.y);if(d>10){x=(destination.x-run.player.x)/d;y=(destination.y-run.player.y)/d;}else{destination=null;renderer.destination=null;}}
      const previous={x:run.player.x,y:run.player.y};processEvents(tick(run,{x,y},dt));saveTimer+=dt;hudTimer+=dt;
      if(destination){stuckFor=Math.hypot(run.player.x-previous.x,run.player.y-previous.y)<.05?stuckFor+dt:0;if(stuckFor>.65){destination=null;renderer.destination=null;toast('换个落点，绕过前面的屋檐。',2);}}
      if(saveTimer>=8){checkpoint();saveTimer=0;}if(hudTimer>.08){updateHUD();hudTimer=0;}
      if(bannerUntil&&run.totalTime>bannerUntil){$('chapter-banner').hidden=true;bannerUntil=0;}
      if(letterUntil&&run.totalTime>letterUntil){$('letter-toast').hidden=true;letterUntil=0;}
      if(toastUntil&&run.totalTime>toastUntil){$('game-toast').hidden=true;toastUntil=0;}
    }
    if(!document.hidden)renderer.draw(run,active?dt:0);
    audio.update(active,run.chapter);
  }
  requestAnimationFrame(frame);
}
updateSettings();updateMenu();setScreen('menu');requestAnimationFrame(frame);
// The Android host calls these hooks without exposing a native JavaScript bridge.
window.emberCourierNative=Object.freeze({
  pause(){clearInput();checkpoint();pauseGame();audio.suspend();return true;},
  back(){
    const modal=[...document.querySelectorAll('dialog[open]')].at(-1);
    if(modal){const cancel=new Event('cancel',{cancelable:true});if(modal.dispatchEvent(cancel))modal.close();checkpoint();return true;}
    if(screen==='game'){pauseGame();return true;}
    return false;
  }
});
// APK assets are updated atomically with the package and do not need a web cache.
if('serviceWorker' in navigator&&location.protocol!=='file:'&&location.hostname!=='appassets.androidplatform.net')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
