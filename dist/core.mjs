/** Deterministic game simulation. No DOM, canvas, network, or storage dependencies. */
import {initSystems,setupDistrict,recalculate,onKill,onBeacon,updateSystems,endingFor,validateSystems} from './systems.mjs';
import {UPGRADES as UPGRADE_DATA} from './content.mjs';
import {applyLayout,pursuit,safePoint,seedMix} from './routes.mjs';
import {modern,has,condition,randomStream,initExpedition,beginDistrict,assignPatrolReward,heal,receiveHit,updateExpedition,sanctuaryRate,tickCast,validateExpedition} from './expedition.mjs';
export {equip,forge,salvage,usePotion,nearestPOI,poiLabel,openPOI,chooseStory,buy,chooseEvent,grantGear,contractProgress} from './systems.mjs';
import {isEndless,initEndless,configureEndlessRoom,endlessEnemy,updateEndlessCombat,onEndlessBolt,onEndlessPulse,onEndlessKill,gainEndlessXP,advanceEndlessChoices,pickEndless,checkEvolutions,reviveEndless,validateEndless,endlessBossCast} from './endless.mjs';
import {isCombat,overdriving,damageEnemy,beginCombatDash,strikeCombatDash} from './combat.mjs';
import {isTactical,prepareEnemy,tickEnemy,interruptEnemy} from './tactics.mjs';
import {validateDraft} from './draft.mjs';
export {rerollEndless,retireEndless} from './endless.mjs';
export const VERSION = '1.5.1';
export const SAVE_VERSION = 3;
export const WORLD = { width: 1880, height: 1380 };
export const DIFFICULTIES = {
  wander: { label: '漫游', damage: .65, drain: .36, spawn: 1.45, score: .8 },
  normal: { label: '标准', damage: 1, drain: .62, spawn: 1, score: 1 },
  night: { label: '长夜', damage: 1.28, drain: .82, spawn: .82, score: 1.3 }
};
export const CHAPTERS = [
  { name: '沉灯街', subtitle: '这里的每一扇窗，都在等待一个归来的人。', color: '#88bdb2', letter: '「灯灭之后，奶奶每天还是会把门打开。」', sender: '未寄出的信 · 小朔', number: 'I' },
  { name: '雨眠庭', subtitle: '雨还没有停，花却已经学会在黑暗里盛开。', color: '#9cabbf', letter: '「如果你经过花园，替我看看那棵树。春天会来的。」', sender: '未寄出的信 · 园丁', number: 'II' },
  { name: '无晓钟楼', subtitle: '在黎明到来之前，请再向前走一步。', color: '#d7ab79', letter: '「致下一位信使：这不是最后一封信。你也会收到回信。」', sender: '未寄出的信 · 前任信使', number: 'III' }
];
export const UPGRADES = UPGRADE_DATA;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function random(s) {
  s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  let t = s.rng; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function event(s, type, data = {}) { s.events.push({ type, ...data }); }
export function createGame({ seed = Date.now(), difficulty = 'normal',profile={},contract='lamps',daily='',id,mode='story',conditions=[],firstJourney=false,starter='cinder' } = {}) {
  const s = {
    version: SAVE_VERSION, seed: seed >>> 0, rng: seed >>> 0,
    difficulty: DIFFICULTIES[difficulty] ? difficulty : 'normal',
    phase: 'playing', chapter: 0, totalTime: 0, time: 0, chapterTime: 0,
    score: 0, kills: 0, collected: 0, litTotal: 0, damageTaken: 0,
    player: { x: 240, y: 690, r: 15, hp: 100, maxHp: 100, embers: 0,
      speed: 195, pickup: 66, heal: 4.5, facing: 1, aimX: 1, aimY: 0,
      dash: 0, dashCd: 0, dashMax: 2.8, pulseCd: 0, pulseMax: 6, pulseRadius: 185, pulseDamage: 40,
      attackCd: .4, attackRate: 1.2, attackTargets: 1, invincible: 2, trail: 0 },
    beacons: [], obstacles: [], embers: [], enemies: [], projectiles: [], effects: [],
    exit: { x: 1750, y: 690, r: 58, open: false },
    upgrades: [], offered: [], spawnCd: 6, nextId: 1, events: [], bossSpawned: false,
    bossDefeated: false, interacted: false
  };
  initExpedition(s,{mode:daily?'challenge':mode,conditions,firstJourney});
  if(s.v12.mode==='challenge'){profile={collection:['brass-lamp'],heirloom:'brass-lamp'};s.difficulty='normal';}
  initSystems(s,profile,{contract,daily,id});s.player.hp=s.player.maxHp;s.v12.minHp=s.player.hp;
  if(mode==='endless'&&!daily){initEndless(s,starter);recalculate(s);s.player.hp=s.player.maxHp;}
  loadChapter(s); return s;
}
function loadChapter(s) {
  s.chapterTime = 0; s.spawnCd = s.chapter===0?5:3; s.bossSpawned = false; s.bossDefeated = false;
  s.player.x = 220; s.player.y = 690; s.player.invincible = 2;
  s.player.dash = 0; s.player.dashCd = 0; s.player.pulseCd = 0;
  s.enemies = []; s.projectiles = []; s.effects = []; s.embers = [];
  s.exit = { x: 1750, y: 690, r: 58, open: false };
  if(isEndless(s)){configureEndlessRoom(s);recalculate(s);event(s,'chapter',{chapter:s.chapter});return;}
  const layouts = [
    [{x:570,y:420},{x:980,y:995},{x:1410,y:400}],
    [{x:500,y:995},{x:990,y:385},{x:1460,y:945}],
    [{x:520,y:420},{x:1010,y:1000},{x:1450,y:430}]
  ];
  s.beacons = layouts[s.chapter].map((p,i)=>({...p, id:i, lit:false, progress:0, cost:4, r:38}));
  // Authored cover never forms a sealed room; routes stay open in all chapters.
  s.obstacles = [
    {x:400,y:660,w:190,h:86},{x:780,y:530,w:110,h:160},
    {x:1110,y:680,w:180,h:85},{x:1200,y:220,w:130,h:85},
    {x:680,y:1120,w:145,h:80},{x:1530,y:700,w:90,h:155},
    {x:290,y:220,w:100,h:85},{x:1590,y:1110,w:125,h:78}
  ];
  if (s.chapter === 1) s.obstacles = s.obstacles.map(o=>({...o, y:WORLD.height-o.y-o.h}));
  if(modern(s)){applyLayout(s);beginDistrict(s);s.v12.mapRng=seedMix(s.seed,s.chapter+10);}
  // A visible trail teaches collection; extra embers guarantee surplus for all nine lamps.
  const trail = [{x:320,y:670},{x:350,y:600},{x:410,y:520},{x:470,y:450},{x:650,y:380}];
  for (const p of trail) addEmber(s,p.x,p.y);
  for(let i=0;i<38;i++) {
    let p;
    for(let n=0;n<120;n++) {
      p={x:180+mapRandom(s)*1530,y:170+mapRandom(s)*1040};
      if(!collides(s,p.x,p.y,35) && !s.beacons.some(b=>distance(p,b)<75)) break;
    }
    if (!collides(s,p.x,p.y,20)) addEmber(s,p.x,p.y);
  }
  // Later districts already have patrols; the opening district gives room to learn.
  for(let i=0;i<s.chapter+1;i++) spawnEnemy(s,i===2?'brute':'shade');
  setupDistrict(s);
  event(s,'chapter',{chapter:s.chapter});
}
function mapRandom(s){return modern(s)?randomStream(s,'mapRng'):random(s);}
function addEmber(s,x,y) {const id=s.nextId++;s.embers.push({id,x,y,wobble:(modern(s)?seedMix(s.seed,id)/4294967296:random(s))*Math.PI*2});return s.embers.at(-1);}
export function collides(s,x,y,r=15) {
  if(x<65+r || y<65+r || x>WORLD.width-65-r || y>WORLD.height-65-r) return true;
  return s.obstacles.some(o=>x+r>o.x && x-r<o.x+o.w && y+r>o.y && y-r<o.y+o.h);
}
function moveEntity(s,e,dx,dy,dt) {
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*dt/10));
  for(let i=0;i<steps;i++) {
    const nx=e.x+dx*dt/steps, ny=e.y+dy*dt/steps;
    if(!collides(s,nx,e.y,e.r)) e.x=nx;
    if(!collides(s,e.x,ny,e.r)) e.y=ny;
  }
}
export function dash(s) {
  const p=s.player;
  if(s.phase!=='playing'||p.dashCd>0) return false;
  p.dash=.2; p.dashCd=p.dashMax; p.invincible=Math.max(p.invincible,.42);
  beginCombatDash(s);
  if(modern(s)&&has(s,'express'))s.v12.dashChargeUntil=s.totalTime+2;
  s.metrics.dashes++;event(s,'dash'); return true;
}
export function pulse(s) {
  const p=s.player;
  if(s.phase!=='playing'||p.pulseCd>0) return false;
  p.pulseCd=p.pulseMax;
  s.effects.push({type:'ring',x:p.x,y:p.y,r:p.pulseRadius,life:.65,maxLife:.65});
  let hits=0;
  for(const e of s.enemies) if(e.hp>0&&distance(p,e)<p.pulseRadius+e.r) {
    if(isCombat(s)&&e.warning>0)continue;
    hits++;const damage=p.pulseDamage*(modern(s)&&s.v12.pulseBoost>0?1.2:1);
    if(isCombat(s))damageEnemy(s,e,damage,{source:'pulse',stun:1});else{e.hp-=damage;e.stun=1;}
    if(modern(s)){
      if(isTactical(s)){if(interruptEnemy(s,e)){s.v12.interrupts++;event(s,'interrupt');}}
      else if(e.cast>0&&(e.castType==='beam'||isEndless(s))){e.cast=0;e.beamReady=s.totalTime+6;if(isEndless(s))e.patternCd=5;s.v12.interrupts++;event(s,'interrupt');}
      if(Object.values(s.gear.slots).filter(id=>['prism-lamp','dawn-cape','echo-bag'].includes(id)).length===3)e.markUntil=s.totalTime+4;
    }
    const d=Math.max(1,distance(p,e));
    moveEntity(s,e,(e.x-p.x)/d*260,(e.y-p.y)/d*260,.18);
  }
  if(modern(s)){
    if(s.v12.pulseBoost>0)s.v12.pulseBoost--;
    if(has(s,'return')&&hits>=2)p.pulseCd=Math.max(0,p.pulseCd-.6);
    if(['hearth-lamp','sentry-cape','herb-bag'].every(id=>Object.values(s.gear.slots).includes(id))){s.v12.barrier=1;s.v12.barrierSource='warden';s.v12.barrierUntil=s.totalTime+3;}
  }
  if(isCombat(s))s.projectiles=s.projectiles.filter(b=>!b.enemy||distance(p,b)>p.pulseRadius+b.r);
  if(isEndless(s))onEndlessPulse(s,hits);s.metrics.pulses++;event(s,'pulse'); return true;
}
function spawnEnemy(s,kind) {
  if(modern(s)&&!isEndless(s)&&kind!=='boss'&&s.v12.patrolLeft<=0)return false;
  let stats = kind==='boss' ? {hp:500,r:44,speed:70,damage:22} : kind==='caster'?{hp:48,r:18,speed:52,damage:12}:kind==='warder'?{hp:92,r:23,speed:44,damage:12}:kind==='runner' ? {hp:34,r:14,speed:116,damage:12} : kind==='brute' ? {hp:105,r:25,speed:52,damage:18} : {hp:45,r:18,speed:76,damage:13};
  if(isEndless(s))stats=endlessEnemy(s,kind,stats);
  const margin=65+stats.r+10;
  const p=s.player, a=random(s)*Math.PI*2, d=isCombat(s)?325+random(s)*125:450+random(s)*180;
  let x=clamp(p.x+Math.cos(a)*d,margin,WORLD.width-margin);
  let y=clamp(p.y+Math.sin(a)*d,margin,WORLD.height-margin);
  for(let n=0;n<30&&(collides(s,x,y,stats.r+4)||distance(p,{x,y})<240||s.beacons.some(b=>b.lit&&distance(b,{x,y})<170));n++) {
    x=margin+random(s)*(WORLD.width-margin*2);y=margin+random(s)*(WORLD.height-margin*2);
  }
  if(collides(s,x,y,stats.r+4)||distance(p,{x,y})<220) return false;
  const enemy={id:s.nextId++,x,y,kind,...stats,maxHp:stats.hp,stun:0,warning:isCombat(s)&&kind!=='boss'?.75:1,attack:0,shotCd:2.5,angle:random(s)*6.28};
  prepareEnemy(s,enemy);
  if(modern(s)&&!isEndless(s)&&kind!=='boss'){
    const spawned=12+s.chapter*2-s.v12.patrolLeft;
    if(condition(s,'elite-patrol')&&[2,8].includes(spawned)){enemy.hp*=1.5;enemy.maxHp=enemy.hp;enemy.damage*=1.2;enemy.patrolElite=true;enemy.warning=1.5;}
    assignPatrolReward(s,enemy);
  }
  s.enemies.push(enemy);
  event(s,'spawn',{kind});return true;
}
function hurt(s,amount,source='影兽接触') {
  const p=s.player;if(p.invincible>0) return;
  const dmg=amount*DIFFICULTIES[s.difficulty].damage*(1-p.armor);
  if(modern(s)){receiveHit(s,dmg,source);return;}
  p.hp-=dmg;s.damageTaken+=dmg;p.invincible=1.2;
  event(s,'hurt',{damage:dmg});
}
function offerUpgrades(s) {
  s.offered=UPGRADES.filter(u=>modern(s)?s.upgrades.filter(id=>id===u.id).length<u.max:['wing','lantern','ring','spark','magnet'].includes(u.id)).sort((a,b)=>a.id.localeCompare(b.id));
  // Fisher-Yates avoids engine-dependent random sort behavior.
  for(let i=s.offered.length-1;i>0;i--) { const j=Math.floor((modern(s)?randomStream(s,'lootRng'):random(s))*(i+1));[s.offered[i],s.offered[j]]=[s.offered[j],s.offered[i]]; }
  if(modern(s)){
    const picks=[];for(const category of ['move','survive','attack']){const u=s.offered.find(u=>u.category===category);if(u)picks.push(u);}
    s.offered=[...picks,...s.offered.filter(u=>!picks.includes(u))];
  }
  s.offered=s.offered.slice(0,3).map(x=>x.id);
}
export function chooseUpgrade(s,id) {
  if(isEndless(s)){const result=pickEndless(s,id);if(!result)return false;delete s.selection;recalculate(s);checkEvolutions(s);if(result.advance)loadChapter(s);else advanceEndlessChoices(s);return true;}
  if(s.phase!=='upgrade'||!s.offered.includes(id)) return false;
  delete s.selection;
  const p=s.player;
  s.upgrades.push(id);recalculate(s);heal(s,p.maxHp);s.offered=[];
  if(modern(s)&&s.v12.choiceKind==='field'){s.v12.choiceKind='';s.phase='playing';return true;}
  if(modern(s))s.v12.choiceKind='';s.chapter++;s.phase='playing';
  loadChapter(s);return true;
}
export function tick(s,input={},dt=1/60) {
  s.events=[];
  if(s.phase!=='playing') return s.events;
  dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
  s.time+=dt;s.totalTime+=dt;s.chapterTime+=dt;
  const p=s.player, cfg=DIFFICULTIES[s.difficulty];
  if(modern(s))s.v12.pathBudget=2;
  for(const k of ['dashCd','pulseCd','invincible','attackCd']) p[k]=Math.max(0,p[k]-dt);
  p.dash=Math.max(0,p.dash-dt);
  let mx=Number.isFinite(input.x)?input.x:0,my=Number.isFinite(input.y)?input.y:0;
  const mag=Math.hypot(mx,my);if(mag>1){mx/=mag;my/=mag;}
  if(mag>.12) { const n=Math.hypot(mx,my);p.aimX=mx/n;p.aimY=my/n;if(Math.abs(mx)>.05)p.facing=mx>0?1:-1; }
  const previous={x:p.x,y:p.y};
  if(p.dash>0) moveEntity(s,p,p.aimX*720,p.aimY*720,dt);
  else {const speed=p.speed*(modern(s)&&s.v12.tailwindUntil>s.totalTime?1.25:1)*(isEndless(s)&&s.endless.feverUntil>s.totalTime?1.3:1);moveEntity(s,p,mx*speed,my*speed,dt);}
  strikeCombatDash(s,previous);
  const sanctuary=!isEndless(s)&&s.beacons.find(b=>b.lit&&distance(p,b)<150),safe=!!sanctuary;
  if(modern(s))updateExpedition(s,dt,safe);
  if(safe)heal(s,sanctuaryRate(s,sanctuary)*dt);
  else if(!isEndless(s))p.hp=clamp(p.hp-cfg.drain*dt*(modern(s)&&has(s,'afterglow')&&s.totalTime<s.v12.graceUntil?.5:1),0,p.maxHp);
  // Magnet attraction and contact collection.
  for(const e of s.embers) {
    const d=distance(p,e);
    if(d<p.pickup && d>1) {const speed=220+(1-d/p.pickup)*240;e.x+=(p.x-e.x)/d*speed*dt;e.y+=(p.y-e.y)/d*speed*dt;}
    if(d<23&&(!condition(s,'small-bag')||p.embers<8)) {
      e.taken=true;p.embers++;heal(s,p.heal);s.collected++;s.score+=12;event(s,'collect',{x:e.x,y:e.y});
      if(isEndless(s))gainEndlessXP(s,e.xp||0);
      if(modern(s)&&p.dash>0&&s.totalTime>=s.v12.tailwindReady&&['brass-lamp','wind-cape','post-bag'].every(id=>Object.values(s.gear.slots).includes(id))){s.v12.tailwindUntil=s.totalTime+3;s.v12.tailwindReady=s.totalTime+5;s.v12.tailwinds++;event(s,'tailwind');}
    }
  }
  s.embers=s.embers.filter(e=>!e.taken);
  for(const b of s.beacons) {
    if(b.lit) continue;
    const near=distance(p,b)<78;
    if(near&&p.embers>=b.cost) {
      b.progress+=dt/(isEndless(s)?.65:1.25);
      if(b.progress>=1) {
        b.progress=1;b.lit=true;p.embers-=b.cost;heal(s,isEndless(s)?p.maxHp*.2:p.maxHp);s.litTotal++;s.score+=250;
        p.invincible=Math.max(p.invincible,1.5);
        for(const e of s.enemies) if(distance(e,b)<250) {e.hp-=150;e.stun=1;}
        s.effects.push({type:'beacon',x:b.x,y:b.y,r:300,life:1.2,maxLife:1.2});
        onBeacon(s);event(s,'beacon',{id:b.id,lit:s.beacons.filter(b=>b.lit).length});
        if(modern(s)&&has(s,'paper-shield')){s.v12.barrier=1;s.v12.barrierSource='paper';s.v12.barrierUntil=s.totalTime+6;}
      }
    } else b.progress=Math.max(0,b.progress-dt*.6);
  }
  const allLit=s.beacons.every(b=>b.lit);
  if(!isEndless(s)&&allLit && s.chapter===2 && !s.bossSpawned) {
    s.bossSpawned=true;spawnEnemy(s,'boss');
    if(!s.enemies.some(e=>e.kind==='boss')) {
      const point=safePoint(s,{x:1450,y:1030},48)||{x:1750,y:1000};
      const e={id:s.nextId++,...point,kind:'boss',hp:500,maxHp:500,r:44,speed:70,damage:22,stun:0,warning:2,attack:0,shotCd:3,angle:0};s.enemies.push(e);
    }
    event(s,'boss');
  }
  s.exit.open=!isEndless(s)&&allLit&&(s.chapter<2||s.bossDefeated);
  if(s.exit.open&&distance(p,s.exit)<65) {
    if(s.chapter<2) {s.phase='upgrade';if(modern(s))s.v12.choiceKind='chapter';s.score+=400;offerUpgrades(s);event(s,'upgrade');}
    else {s.phase='won';s.score+=1000+Math.round(Math.max(0,700-s.totalTime));event(s,'won');}
  }
  if(isEndless(s))updateEndlessCombat(s,dt,{spawn:spawnEnemy,hurt});
  // Auto-bolt gives the player room to focus on positioning.
  if(p.attackCd<=0) {
    const eligible=s.enemies.filter(e=>e.hp>0&&e.warning<=0&&distance(p,e)<380),targets=eligible.sort((a,b)=>distance(p,a)-distance(p,b)).slice(0,p.attackTargets);
    if(targets.length) {
      for(const e of targets) {
        const d=Math.max(1,distance(p,e));
        const critical=p.crit>0&&random(s)<p.crit;
        const bonus=modern(s)?(has(s,'focus')&&eligible.length===1?1.25:1)*(s.v12.dashChargeUntil>s.totalTime?1.25:1):1;
        s.projectiles.push({x:p.x,y:p.y,vx:(e.x-p.x)/d*540,vy:(e.y-p.y)/d*540,target:e.id,enemy:false,life:1.1,damage:p.damage*(critical?(isEndless(s)?2.1:1.75):1)*bonus*(isEndless(s)&&s.endless.feverUntil>s.totalTime?1.3:1),r:critical?7:5,critical});
      }
      if(modern(s))s.v12.dashChargeUntil=0;p.attackCd=p.attackRate/(overdriving(s)?1.65:1);event(s,'shoot',{x:p.x,y:p.y,weapon:s.endless?.starter});
    }
  }
  if(!isEndless(s)&&!s.exit.open && !(s.chapter===2&&allLit)) {
    s.spawnCd-=dt;
    const cap=14+s.chapter*4;
    if(s.spawnCd<=0&&s.enemies.length<cap) {
      const roll=random(s);spawnEnemy(s,modern(s)&&s.chapter>0&&roll<.16?'caster':modern(s)&&s.chapter>0&&roll<.30?'warder':s.chapter>0&&roll>.8?'brute':roll>.58?'runner':'shade');
      s.spawnCd=Math.max(1.2,(4.8-s.chapter*.8-s.chapterTime*.008)*cfg.spawn);
    }
  }
  for(const e of s.enemies) {
    e.warning=Math.max(0,e.warning-dt);e.stun=Math.max(0,e.stun-dt);e.attack=Math.max(0,e.attack-dt);
    if(e.warning>0||e.hp<=0) continue;
    if(isTactical(s)&&(e.stun<=0||e.kind==='boss'&&(e.cast>0||e.charging>0))&&tickEnemy(s,e,dt,hurt,moveEntity))continue;
    if(e.stun>0)continue;
    if(!isTactical(s)&&(isEndless(s)&&e.kind==='boss'?endlessBossCast(s,e,dt,hurt,moveEntity):modern(s)&&tickCast(s,e,dt,hurt)))continue;
    const d=Math.max(1,distance(p,e));
    const target=modern(s)?pursuit(s,e,p):p,td=Math.max(1,distance(e,target));
    let vx=(target.x-e.x)/td,vy=(target.y-e.y)/td;
    // Slide around rectangular cover rather than freezing against its near edge.
    if(!modern(s)&&collides(s,e.x+vx*35,e.y+vy*35,e.r)) {
      const cross=e.id%2?1:-1;
      if(!collides(s,e.x-vy*cross*40,e.y+vx*cross*40,e.r)) [vx,vy]=[-vy*cross,vx*cross];
      else [vx,vy]=[vy*cross,-vx*cross];
    }
    const repelling=isEndless(s)||e.kind==='boss'?null:s.beacons.find(b=>b.lit&&distance(e,b)<145);
    if(repelling) {
      const rd=Math.max(1,distance(e,repelling));vx=(e.x-repelling.x)/rd;vy=(e.y-repelling.y)/rd;e.hp-=16*dt;
    }
    const slow=isEndless(s)&&(e.slowUntil||0)>s.totalTime?.55:1;moveEntity(s,e,vx*e.speed*slow,vy*e.speed*slow,dt);
    if(d<e.r+p.r+4 && e.attack<=0) {hurt(s,e.damage,e.kind==='boss'?'守夜者·接触':e.kind==='warder'?'结界者·接触':'影兽接触');e.attack=1;}
    if(e.kind==='boss'&&!isEndless(s)) {
      e.shotCd-=dt;
      if(e.shotCd<=0) {
        e.shotCd=3.6;e.angle+=.45;
        for(let i=0;i<10;i++) {
          const a=e.angle+i*Math.PI/5;
          s.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*145,vy:Math.sin(a)*145,enemy:true,life:4,damage:14,r:9});
        }
        event(s,'boss-shot');
      }
    }
  }
  for(const b of s.projectiles) {
    b.life-=dt;
    if(!b.enemy) {
      const target=s.enemies.find(e=>e.id===b.target&&e.hp>0);
      if(target){const d=Math.max(1,distance(b,target));b.vx=(target.x-b.x)/d*540;b.vy=(target.y-b.y)/d*540;}
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.enemy) {
      if(!modern(s)&&distance(b,p)<p.r+b.r){hurt(s,b.damage);b.life=0;}
      if(!isEndless(s)&&s.beacons.some(l=>l.lit&&distance(b,l)<145)) b.life=0;
      else if(modern(s)&&distance(b,p)<p.r+b.r){hurt(s,b.damage,b.source||'守夜者·光球');b.life=0;}
    } else {
      const hit=s.enemies.find(e=>e.warning<=0&&e.hp>0&&distance(b,e)<e.r+b.r);
      if(hit){
        const protectedBy=modern(s)&&s.enemies.some(e=>e.kind==='warder'&&e.hp>0&&e.id!==hit.id&&distance(e,hit)<130&&(!isTactical(s)||(e.shieldBrokenUntil||0)<=s.totalTime));
        if(isCombat(s))damageEnemy(s,hit,b.damage*(protectedBy?.6:1),{critical:b.critical,stun:.1});
        else{hit.hp-=b.damage*(protectedBy?.6:1);hit.stun=Math.max(hit.stun,.1);}
        b.life=0;event(s,'hit',{x:hit.x,y:hit.y,critical:b.critical});
        if(isEndless(s))onEndlessBolt(s,hit,b);
        if(modern(s)&&hit.markUntil>s.totalTime&&s.totalTime>=s.v12.echoReady){hit.markUntil=0;s.v12.echoReady=s.totalTime+1;s.v12.echoes++;for(const e of s.enemies)if(e.hp>0&&distance(e,hit)<100)e.hp-=p.damage*.6;s.effects.push({type:'echo',x:hit.x,y:hit.y,r:100,life:.5,maxLife:.5});event(s,'echo');}
      }
    }
  }
  s.projectiles=s.projectiles.filter(b=>b.life>0);
  for(const e of s.enemies) if(e.hp<=0) {
    s.kills++;s.score+=e.kind==='boss'?1000:35;
    onKill(s,e);
    const drop=addEmber(s,e.x,e.y);if(isEndless(s)){drop.xp=e.rewardXP||6;onEndlessKill(s,e);}
    if(!isEndless(s)&&e.kind==='brute')addEmber(s,e.x+16,e.y-10);
    if(e.kind==='boss'){s.bossDefeated=true;for(let i=0;i<(isEndless(s)?0:10);i++)addEmber(s,e.x+(random(s)-.5)*90,e.y+(random(s)-.5)*90);event(s,'boss-defeated');}
    event(s,'death',{id:e.id,x:e.x,y:e.y,boss:e.kind==='boss',kind:e.kind,elite:!!e.patrolElite,combo:s.journal.combo,coins:e.rewardCoins||0});
  }
  s.enemies=s.enemies.filter(e=>e.hp>0);
  updateSystems(s,dt);
  if(s.phase==='won'&&!isEndless(s))s.story.ending=endingFor(s);
  if(!isEndless(s)&&modern(s)&&s.phase==='playing'&&s.chapter===0&&!s.v12.buildTaken&&s.beacons.filter(b=>b.lit).length>=2){s.v12.buildTaken=true;s.v12.choiceKind='field';s.phase='upgrade';offerUpgrades(s);event(s,'upgrade');}
  for(const fx of s.effects) fx.life-=dt;
  s.effects=s.effects.filter(fx=>fx.life>0);
  if(isEndless(s)){reviveEndless(s);if(s.phase==='playing')advanceEndlessChoices(s);s.effects=s.effects.slice(-120);s.projectiles=s.projectiles.slice(-250);}
  if(p.hp<=0&&s.phase==='playing'){p.hp=0;s.phase='lost';event(s,'lost');}
  return s.events;
}
export function finalScore(s) {return Math.round(s.score*DIFFICULTIES[s.difficulty].score);}
export function serialize(s) {
  if(!['playing','upgrade'].includes(s.phase)) return null;
  return JSON.stringify({...s,events:[],effects:[]});
}
export function restore(raw) {
  try {
    if(typeof raw!=='string'||raw.length>1000000) return null;
    const s=JSON.parse(raw);
    if(!s||![1,2,SAVE_VERSION].includes(s.version)||!DIFFICULTIES[s.difficulty]||!Number.isInteger(s.chapter)||s.chapter<0||s.chapter>2||!['playing','upgrade'].includes(s.phase)) return null;
    if(!validateDraft(s))return null;
    const p=s.player;
    const playerKeys=['x','y','r','hp','maxHp','embers','speed','pickup','heal','facing','aimX','aimY','dash','dashCd','dashMax','pulseCd','pulseMax','pulseRadius','pulseDamage','attackCd','attackRate','attackTargets','invincible','trail'];
    if(!p||playerKeys.some(k=>!Number.isFinite(p[k]))||Object.values(p).some(v=>typeof v!=='number'||!Number.isFinite(v))||p.hp<=0||p.hp>p.maxHp||p.maxHp>500||p.maxHp<1||p.x<0||p.y<0||p.x>WORLD.width||p.y>WORLD.height||p.embers<0||p.speed<=0||p.r<=0) return null;
    for(const k of ['beacons','obstacles','embers','enemies','projectiles','upgrades','offered']) if(!Array.isArray(s[k])||s[k].length>500) return null;
    if(s.beacons.length!==3||s.beacons.some(b=>!Number.isFinite(b.x)||!Number.isFinite(b.y)||typeof b.lit!=='boolean'||!Number.isFinite(b.progress)||b.progress<0||b.progress>1)) return null;
    for(const k of ['obstacles','embers','enemies','projectiles']) for(const obj of s[k]) {
      if(!obj||typeof obj!=='object'||Object.values(obj).some(v=>typeof v==='number'&&!Number.isFinite(v))||!Number.isFinite(obj.x)||!Number.isFinite(obj.y)) return null;
    }
    const numericKeys=['seed','rng','totalTime','time','chapterTime','score','kills','collected','litTotal','damageTaken','spawnCd','nextId'];
    if(numericKeys.some(k=>!Number.isFinite(s[k]))||s.totalTime<0||s.litTotal<0||(!isEndless(s)&&s.litTotal>9)||!Number.isInteger(s.rng)) return null;
    if(!s.exit||!Number.isFinite(s.exit.x)||!Number.isFinite(s.exit.y)||!Number.isFinite(s.exit.r)||typeof s.exit.open!=='boolean') return null;
    if(s.obstacles.some(o=>!Number.isFinite(o.w)||!Number.isFinite(o.h)||o.w<=0||o.h<=0)) return null;
    if(s.embers.some(e=>!Number.isFinite(e.id)||!Number.isFinite(e.wobble))) return null;
    if(s.enemies.some(e=>!['shade','runner','brute','boss','caster','warder'].includes(e.kind)||['id','r','hp','maxHp','speed','damage','warning','stun','attack','shotCd','angle'].some(k=>!Number.isFinite(e[k]))||e.r<=0||e.maxHp<=0||e.path&&(!Array.isArray(e.path)||e.path.length>600||e.path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))) return null;
    if(s.projectiles.some(b=>['vx','vy','r','life','damage'].some(k=>!Number.isFinite(b[k]))||typeof b.enemy!=='boolean')) return null;
    if(!isEndless(s)&&(s.upgrades.some(id=>!UPGRADES.some(u=>u.id===id))||s.offered.some(id=>!UPGRADES.some(u=>u.id===id)))) return null;
    if(s.endless&&!validateEndless(s))return null;
    if(s.version<3){s.rulesVersion=111;delete s.v12;}
    if(s.version===1){s.events=[];initSystems(s);}
    else if(!validateSystems(s))return null;
    s.version=SAVE_VERSION;
    if(![111,120].includes(s.rulesVersion)||modern(s)&&!validateExpedition(s))return null;
    if(['damage','armor','crit','potionHeal'].some(k=>!Number.isFinite(p[k])))return null;
    s.events=[];s.effects=[];s.player.invincible=Math.max(2,s.player.invincible);return s;
  } catch {return null;}
}
