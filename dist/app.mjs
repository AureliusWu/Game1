import {createGame,tick,dash,pulse,chooseUpgrade,serialize,restore,finalScore,CHAPTERS,UPGRADES,DIFFICULTIES,usePotion,nearestPOI,poiLabel} from './core.mjs';
import {Renderer,drawTitle} from './render.mjs';
import {AudioEngine} from './audio.mjs';
import {GEAR_BY_ID,CONTRACTS,ACHIEVEMENTS,ENDINGS} from './content.mjs';
import {XP_THRESHOLDS} from './systems.mjs';
import {readProfile,recordProgress,rank,dailySeed} from './progress.mjs';
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
const defaults={difficulty:'normal',sound:true,lowMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,touch:window.matchMedia('(pointer: coarse)').matches,contract:'lamps',daily:false};
const storedSettings=readJSON(STORE.settings,{});
const settings={...defaults};
if(storedSettings&&typeof storedSettings==='object'){
  if(DIFFICULTIES[storedSettings.difficulty])settings.difficulty=storedSettings.difficulty;
  for(const k of ['sound','lowMotion','touch','daily'])if(typeof storedSettings[k]==='boolean')settings[k]=storedSettings[k];
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
const hub=new Hub({getRun:()=>screen==='game'&&!ended?run:null,getProfile:()=>profile,commit:events=>{processEvents(events);syncProgress();checkpoint();updateHUD();},persist:()=>{persistProfile();refreshOfficeLabels();},onOpen:()=>{clearInput();audio.unlock();audio.play('click');checkpoint();},toast});
function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=t=>parts.find(p=>p.type===t).value;return `${part('year')}-${part('month')}-${part('day')}`;}
function refreshOfficeLabels(){$('menu-stamps').textContent=profile.stamps;$('office-rank').textContent=rank(profile);$('achievement-summary').textContent=`${profile.achievements.length} / ${ACHIEVEMENTS.length} 成就`;}
function persistProfile(){storage.set(STORE.profile,JSON.stringify(profile));}
function syncProgress(final=false){
  if(!run)return;const unlocked=recordProgress(profile,run,{final});
  if(unlocked.length&&screen==='game'){$('achievement-toast-name').textContent=unlocked[0].name+(unlocked.length>1?` 等 ${unlocked.length} 项`:'');$('achievement-toast-reward').textContent=`+${unlocked.reduce((n,a)=>n+a.reward,0)} 邮票`;$('achievement-toast').hidden=false;achievementUntil=performance.now()+6000;audio.play('beacon');}
  if(unlocked.length||final)persistProfile();refreshOfficeLabels();
}
function saveSettings(){storage.set(STORE.settings,JSON.stringify(settings));}
function updateSettings(){
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
  $('difficulty-desc').textContent=settings.daily?'每日航线固定标准难度，同一天使用相同种子。':difficultyCopy[settings.difficulty];
  $('contract-select').value=settings.daily?'swift':settings.contract;$('contract-select').disabled=settings.daily;$('daily-setting').checked=settings.daily;
  $('prep-note').textContent=settings.daily?`${today()} · ${profile.dailies.includes(today())?'今日奖励已领取':'首次通关额外获得 3 邮票'}`:CONTRACTS.find(c=>c.id===settings.contract).desc+' · 奖励 '+CONTRACTS.find(c=>c.id===settings.contract).reward+' 邮票';
}
function updateMenu(){
  refreshOfficeLabels();
  const saved=restore(storage.get(STORE.save));
  $('continue').hidden=!saved;
  if(saved)$('continue-chapter').textContent=`第 ${saved.chapter+1} 章 · ${CHAPTERS[saved.chapter].name}`;
  $('record-summary').textContent=profile.totals.beacons?`${profile.totals.wins} 次黎明 · ${profile.totals.beacons} 盏灯`:'等待第一束光';
  $('record-best').textContent=stats.best.toLocaleString('zh-CN');$('record-wins').textContent=stats.wins;$('record-beacons').textContent=profile.totals.beacons;$('record-runs').textContent=stats.runs;
  $('record-note').textContent=stats.bestTime?`最快送达：${formatTime(stats.bestTime)}。城市记得你的每一次启程。`:'你的故事，从第一束光开始。';
}
function formatTime(time){const n=Math.floor(time);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function clearInput(){keys.clear();joystickId=null;joy={x:0,y:0};destination=null;renderer.destination=null;stuckFor=0;$('joystick-thumb').style.transform='translate(0,0)';}
function showDialog(id){const d=$(id);if(!d.open)d.showModal();clearInput();}
function closeDialogs(){for(const d of document.querySelectorAll('dialog[open]'))d.close();}
function checkpoint(){if(run&&!ended){syncProgress();const data=serialize(run);if(data)storage.set(STORE.save,data);}persistProfile();}
function setScreen(next){screen=next;document.body.dataset.screen=next;$('menu').hidden=next!=='menu';$('game').hidden=next!=='game';document.body.style.overflow=next==='game'?'hidden':'';clearInput();if(next==='game')renderer.resize();else{updateMenu();window.scrollTo(0,0);}}
function announceChapter(){
  const ch=CHAPTERS[run.chapter];$('banner-number').textContent=`CHAPTER ${ch.number}`;$('banner-title').textContent=ch.name;$('banner-subtitle').textContent=ch.subtitle;
  $('chapter-banner').hidden=false;$('chapter-banner').style.animation='none';void $('chapter-banner').offsetWidth;$('chapter-banner').style.animation='';bannerUntil=run.totalTime+4.2;
  $('letter-toast').hidden=true;$('game-toast').hidden=true;letterUntil=0;toastUntil=0;
}
async function begin(resume=false){
  audio.unlock();closeDialogs();
  const day=settings.daily?today():'',options={difficulty:settings.daily?'normal':settings.difficulty,profile,contract:settings.daily?'swift':settings.contract,daily:day,id:window.crypto?.randomUUID?.()||`${Date.now()}-${Math.floor(Math.random()*1e8)}`};if(day)options.seed=dailySeed(day);
  run=resume?restore(storage.get(STORE.save)):createGame(options);
  if(!run)run=createGame(options);
  ended=false;paused=false;saveTimer=0;renderer.chapter=-1;renderer.particles=[];
  setScreen('game');announceChapter();updateHUD();checkpoint();$('world').focus({preventScroll:true});
  if(run.phase==='upgrade')showUpgrade();else toast('拾起火种点灯，也别忘了街角等待来信的居民。',5);
}
function pauseGame(){if(screen!=='game'||!run||ended||run.phase!=='playing'||paused)return;if(document.querySelector('dialog[open]')){checkpoint();clearInput();return;}paused=true;checkpoint();clearInput();showDialog('pause-dialog');}
function resumeGame(){if(!run||ended)return;audio.unlock();$('pause-dialog').close();paused=false;clearInput();last=performance.now();$('world').focus({preventScroll:true});}
function returnToMenu(){checkpoint();closeDialogs();paused=false;setScreen('menu');}
function toast(text,seconds=3){$('game-toast').textContent=text;$('game-toast').hidden=false;toastUntil=(run?.totalTime||0)+seconds;}
function doDash(){if(screen==='game'&&!paused&&!document.querySelector('dialog[open]')&&dash(run))audio.play('dash');}
function doPulse(){if(screen==='game'&&!paused&&!document.querySelector('dialog[open]')&&pulse(run))audio.play('pulse');}
function doPotion(){if(screen!=='game'||paused||document.querySelector('dialog[open]'))return;run.events=[];if(usePotion(run)){processEvents(run.events);checkpoint();updateHUD();}}
function showUpgrade(){
  checkpoint();clearInput();$('upgrade-copy').textContent=`${CHAPTERS[run.chapter].name}重新亮了起来。挑一件礼物，继续向前。`;
  const container=$('upgrade-options');container.replaceChildren();
  for(const id of run.offered){const u=UPGRADES.find(u=>u.id===id);const b=document.createElement('button');b.className='upgrade-card';
    b.innerHTML=`<svg aria-hidden="true"><use href="#i-${u.symbol}"/></svg><strong>${u.name}</strong><span>${u.desc}</span><small>带上这束光 →</small>`;
    b.addEventListener('click',()=>{audio.unlock();audio.play('beacon');if(chooseUpgrade(run,u.id)){$('upgrade-dialog').close();paused=false;announceChapter();updateHUD();checkpoint();$('world').focus({preventScroll:true});}});container.append(b);
  }
  showDialog('upgrade-dialog');
}
function finish(){
  if(ended)return;ended=true;clearInput();storage.remove(STORE.save);
  syncProgress(true);
  const won=run.phase==='won',score=finalScore(run),newBest=score>stats.best;
  stats.runs++;stats.beacons+=run.litTotal;if(won){stats.wins++;if(!stats.bestTime||run.totalTime<stats.bestTime)stats.bestTime=run.totalTime;}
  stats.best=Math.max(stats.best,score);storage.set(STORE.stats,JSON.stringify(stats));
  $('result-icon').setAttribute('href',won?'#i-sun':'#i-flame');$('result-eyebrow').textContent=won?'DELIVERED AT DAYBREAK':'THE LIGHT IS STILL OUT THERE';
  const ending=ENDINGS[run.story.ending]||ENDINGS.dawn;
  $('result-title').textContent=won?ending.name+'。':'微光暂歇，旅途未完。';
  if(won)$('result-eyebrow').textContent=ending.subtitle;
  $('result-story').textContent=won?ending.text:'你留下的灯火没有熄灭。整理好邮包，再一次出发。总有一封信，等你送到天亮。';
  const reward=profile.lastRewards;$('settlement-note').textContent=`本次结算 ${reward?.journey===run.journeyId?reward.total:0} 枚邮票${run.contract.complete?' · 委托已完成':''}${reward?.daily?' · 每日航线首次送达':''}。成就奖励另计。`;
  $('result-score').textContent=score.toLocaleString('zh-CN');$('result-beacons').textContent=`${run.litTotal}/9`;$('result-time').textContent=formatTime(run.totalTime);$('result-best').hidden=!newBest;
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
    if(e.type==='boss')toast('守夜者醒来了。躲开紫色光球，用灯塔庇护自己。',6);
    if(e.type==='boss-defeated')toast('长夜退去了。前往金色拱门，把黎明送达。',6);
    if(e.type==='level')toast(`信使等级 ${e.level} · 生命与光弹变得更强。`,3);
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
  $('ember-count').textContent=p.embers;$('chapter-name').textContent=CHAPTERS[run.chapter].name;$('run-time').textContent=formatTime(run.totalTime);$('score-label').textContent=String(finalScore(run)).padStart(4,'0');
  const dots=$('beacon-dots').children;for(let i=0;i<3;i++)dots[i].classList.toggle('lit',run.beacons[i].lit);
  const lit=run.beacons.filter(b=>b.lit).length;
  const j=run.journal;$('level-label').textContent=`Lv.${j.level}`;$('coin-count').textContent=j.coins;
  const base=XP_THRESHOLDS[j.level-1],next=XP_THRESHOLDS[j.level];$('xp-bar').style.width=`${next?Math.min(100,(j.xp-base)/(next-base)*100):100}%`;
  $('combo-label').hidden=j.combo<2;$('combo-label').textContent=`${j.combo} 连击`;
  $('potion-count').textContent=j.potions;$('potion').disabled=j.potions<1||p.hp>=p.maxHp||j.potionCd>0;
  const poi=nearestPOI(run);$('interact').hidden=!poi;if(poi)$('interact-label').textContent=poiLabel(poi);
  $('objective').textContent=run.exit.open?(run.chapter===2?'前往金色拱门，把黎明送达':'灯塔已全部点亮 · 前往右侧金色拱门'):lit===3?'击败守夜者 · 站在灯塔附近可以回血':p.embers>=4?'携带足够火种 · 靠近未点亮的灯塔':`收集火种点亮灯塔 · 每座需要 4 枚（${p.embers}/4）`;
  const boss=run.enemies.find(e=>e.kind==='boss');$('boss-bar').hidden=!boss;if(boss)$('boss-hp').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;
  for(const [id,cd,max,label] of [['dash',p.dashCd,p.dashMax,'SPACE'],['pulse',p.pulseCd,p.pulseMax,'E']]){
    $(id).classList.toggle('cooldown',cd>0);$(id).setAttribute('aria-disabled',String(cd>0));$(id).style.setProperty('--cooldown',`${cd/max*100}%`);
    $(`${id}-cd`).textContent=cd>0?cd.toFixed(1):label;$(`${id}-cd`).classList.toggle('counting',cd>0);
  }
  document.body.dataset.phase=run.phase;
}
for(const b of document.querySelectorAll('[data-difficulty]'))b.addEventListener('click',()=>{settings.difficulty=b.dataset.difficulty;audio.play('click');saveSettings();updateSettings();});
for(const b of document.querySelectorAll('[data-dialog]'))b.addEventListener('click',()=>showDialog(b.dataset.dialog));
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target!==d||['pause-dialog','upgrade-dialog','result-dialog'].includes(d.id))return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
$('difficulty-info').addEventListener('click',()=>showDialog('guide'));
$('contract-select').addEventListener('change',e=>{settings.contract=e.target.value;saveSettings();updateSettings();});$('daily-setting').addEventListener('change',e=>{settings.daily=e.target.checked;saveSettings();updateSettings();});
$('settings-open').addEventListener('click',()=>showDialog('settings'));
$('records-open').addEventListener('click',()=>{updateMenu();showDialog('records');});
$('start').addEventListener('click',()=>begin());$('continue').addEventListener('click',()=>begin(true));$('restart').addEventListener('click',()=>begin());
$('game-hub').addEventListener('click',()=>hub.show('inventory'));$('result-office').addEventListener('click',()=>hub.show('office'));$('interact').addEventListener('click',()=>hub.interact());$('potion').addEventListener('click',doPotion);
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
  if(modal)return;
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='Space')doDash();if(e.code==='KeyE')doPulse();
  if(screen==='game'&&!paused){if(e.code==='KeyF')hub.interact();if(e.code==='KeyH')doPotion();if(e.code==='KeyJ')hub.show('inventory');}
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
if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
