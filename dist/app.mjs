import {createGame,tick,dash,pulse,chooseUpgrade,serialize,restore,finalScore,CHAPTERS,UPGRADES,DIFFICULTIES} from './core.mjs';
import {Renderer,drawTitle} from './render.mjs';
import {AudioEngine} from './audio.mjs';
const $=id=>document.getElementById(id);
const audio=new AudioEngine();
const STORE={settings:'ember-courier.settings.v1',stats:'ember-courier.stats.v1',save:'ember-courier.save.v1'};
let storageWarned=false;
const storage={
  get(k){try{return localStorage.getItem(k);}catch{return null;}},
  set(k,v){try{localStorage.setItem(k,v);return true;}catch{warnStorage();return false;}},
  remove(k){try{localStorage.removeItem(k);}catch{warnStorage();}}
};
function warnStorage(){if(storageWarned)return;storageWarned=true;$('storage-warning').hidden=false;setTimeout(()=>$('storage-warning').hidden=true,6500);}
function readJSON(key,fallback){try{return JSON.parse(storage.get(key))??fallback;}catch{return fallback;}}
const defaults={difficulty:'normal',sound:true,lowMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,touch:window.matchMedia('(pointer: coarse)').matches};
const storedSettings=readJSON(STORE.settings,{});
const settings={...defaults};
if(storedSettings&&typeof storedSettings==='object'){
  if(DIFFICULTIES[storedSettings.difficulty])settings.difficulty=storedSettings.difficulty;
  for(const k of ['sound','lowMotion','touch'])if(typeof storedSettings[k]==='boolean')settings[k]=storedSettings[k];
}
const statsDefaults={best:0,wins:0,beacons:0,runs:0,bestTime:0};
const storedStats=readJSON(STORE.stats,{}),stats={...statsDefaults};
if(storedStats&&typeof storedStats==='object')for(const k of Object.keys(statsDefaults))if(Number.isFinite(storedStats[k])&&storedStats[k]>=0)stats[k]=storedStats[k];
const renderer=new Renderer($('world'),$('minimap'));
let run=null,screen='menu',paused=false,last=performance.now(),saveTimer=0,hudTimer=0,ended=false;
let bannerUntil=0,letterUntil=0,toastUntil=0;
const keys=new Set();let joystickId=null,joy={x:0,y:0},joyCenter={x:0,y:0};
const difficultyCopy={wander:'慢一点也没关系。影兽更温和，灯火更长明。',normal:'有一点危险，也有足够的光。',night:'影兽更凶，长夜更漫长。得分 ×1.3。'};
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
    const selected=button.dataset.difficulty===settings.difficulty;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
  }
  $('difficulty-desc').textContent=difficultyCopy[settings.difficulty];
}
function updateMenu(){
  const saved=restore(storage.get(STORE.save));
  $('continue').hidden=!saved;
  if(saved)$('continue-chapter').textContent=`第 ${saved.chapter+1} 章 · ${CHAPTERS[saved.chapter].name}`;
  $('record-summary').textContent=stats.runs?`${stats.wins} 次黎明 · ${stats.beacons} 盏灯`:'等待第一束光';
  $('record-best').textContent=stats.best.toLocaleString('zh-CN');$('record-wins').textContent=stats.wins;$('record-beacons').textContent=stats.beacons;$('record-runs').textContent=stats.runs;
  $('record-note').textContent=stats.bestTime?`最快送达：${formatTime(stats.bestTime)}。城市记得你的每一次启程。`:'你的故事，从第一束光开始。';
}
function formatTime(time){const n=Math.floor(time);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function clearInput(){keys.clear();joystickId=null;joy={x:0,y:0};$('joystick-thumb').style.transform='translate(0,0)';}
function showDialog(id){const d=$(id);if(!d.open)d.showModal();clearInput();}
function closeDialogs(){for(const d of document.querySelectorAll('dialog[open]'))d.close();}
function checkpoint(){if(run&&!ended){const data=serialize(run);if(data)storage.set(STORE.save,data);}}
function setScreen(next){screen=next;document.body.dataset.screen=next;$('menu').hidden=next!=='menu';$('game').hidden=next!=='game';document.body.style.overflow=next==='game'?'hidden':'';clearInput();if(next==='game')renderer.resize();else{updateMenu();window.scrollTo(0,0);}}
function announceChapter(){
  const ch=CHAPTERS[run.chapter];$('banner-number').textContent=`CHAPTER ${ch.number}`;$('banner-title').textContent=ch.name;$('banner-subtitle').textContent=ch.subtitle;
  $('chapter-banner').hidden=false;$('chapter-banner').style.animation='none';void $('chapter-banner').offsetWidth;$('chapter-banner').style.animation='';bannerUntil=run.totalTime+4.2;
  $('letter-toast').hidden=true;$('game-toast').hidden=true;letterUntil=0;toastUntil=0;
}
async function begin(resume=false){
  audio.unlock();closeDialogs();run=resume?restore(storage.get(STORE.save)):createGame({difficulty:settings.difficulty});
  if(!run){run=createGame({difficulty:settings.difficulty});}
  ended=false;paused=false;saveTimer=0;renderer.chapter=-1;renderer.particles=[];
  setScreen('game');announceChapter();updateHUD();checkpoint();$('world').focus({preventScroll:true});
  if(run.phase==='upgrade')showUpgrade();else toast('拾起金色火种，靠近灯塔自动点亮。',5);
}
function pauseGame(){if(screen!=='game'||!run||ended||run.phase!=='playing'||paused)return;paused=true;checkpoint();clearInput();showDialog('pause-dialog');}
function resumeGame(){if(!run||ended)return;audio.unlock();$('pause-dialog').close();paused=false;clearInput();last=performance.now();$('world').focus({preventScroll:true});}
function returnToMenu(){checkpoint();closeDialogs();paused=false;setScreen('menu');}
function toast(text,seconds=3){$('game-toast').textContent=text;$('game-toast').hidden=false;toastUntil=(run?.totalTime||0)+seconds;}
function doDash(){if(screen==='game'&&!paused&&!document.querySelector('dialog[open]')&&dash(run))audio.play('dash');}
function doPulse(){if(screen==='game'&&!paused&&!document.querySelector('dialog[open]')&&pulse(run))audio.play('pulse');}
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
  const won=run.phase==='won',score=finalScore(run),newBest=score>stats.best;
  stats.runs++;stats.beacons+=run.litTotal;if(won){stats.wins++;if(!stats.bestTime||run.totalTime<stats.bestTime)stats.bestTime=run.totalTime;}
  stats.best=Math.max(stats.best,score);storage.set(STORE.stats,JSON.stringify(stats));
  $('result-icon').setAttribute('href',won?'#i-sun':'#i-flame');$('result-eyebrow').textContent=won?'DELIVERED AT DAYBREAK':'THE LIGHT IS STILL OUT THERE';
  $('result-title').textContent=won?'黎明，签收了。':'微光暂歇，旅途未完。';
  $('result-story').textContent=won?'第一扇窗亮起时，烛羽发现邮包里多了一封信。信上只有一句话：「谢谢你，我们一直在等你。」':'你留下的灯火没有熄灭。整理好邮包，再一次出发。总有一封信，等你送到天亮。';
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
    if(e.type==='upgrade')showUpgrade();
    if(e.type==='won'||e.type==='lost')finish();
  }
  renderer.react(events);
}
function updateHUD(){
  if(!run)return;const p=run.player;
  $('hp-text').textContent=`${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`;$('hp-bar').style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;$('hp-bar').parentElement.classList.toggle('low',p.hp/p.maxHp<.3);
  $('ember-count').textContent=p.embers;$('chapter-name').textContent=CHAPTERS[run.chapter].name;$('run-time').textContent=formatTime(run.totalTime);$('score-label').textContent=String(finalScore(run)).padStart(4,'0');
  const dots=$('beacon-dots').children;for(let i=0;i<3;i++)dots[i].classList.toggle('lit',run.beacons[i].lit);
  const lit=run.beacons.filter(b=>b.lit).length;
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
$('settings-open').addEventListener('click',()=>showDialog('settings'));
$('records-open').addEventListener('click',()=>{updateMenu();showDialog('records');});
$('start').addEventListener('click',()=>begin());$('continue').addEventListener('click',()=>begin(true));$('restart').addEventListener('click',()=>begin());
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
  if(e.code==='KeyM'){settings.sound=!settings.sound;saveSettings();updateSettings();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));
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
  if(screen==='menu'){
    if(!document.hidden)drawTitle($('title-art'),now/1000,settings.lowMotion);
  }else if(run){
    const active=!paused&&!document.querySelector('dialog[open]')&&run.phase==='playing'&&!document.hidden;
    if(active){
      let x=joy.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      let y=joy.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
      processEvents(tick(run,{x,y},dt));saveTimer+=dt;hudTimer+=dt;
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
