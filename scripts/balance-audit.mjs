/** Reproducible development-policy balance probes; not a human playtest or runtime dependency. */
import fs from 'node:fs';
import path from 'node:path';
import {playJourney} from '../tests/journey-bot.mjs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createGame} from '../dist/core.mjs';
import {createProfile,recordProgress} from '../dist/progress.mjs';
import {GEAR,TALENTS} from '../dist/content.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const out=path.join(root,'docs/balance');fs.mkdirSync(out,{recursive:true});
const maximal=createProfile();maximal.talents=Object.fromEntries(TALENTS.map(t=>[t.id,3]));maximal.collection=GEAR.map(g=>g.id);maximal.heirloom='prism-lamp';maximal.earned=45;maximal.spent=45;
const rows=[],stalls=[];
function runJourney(seed,difficulty,options,extra){
 const history=[];let nextSample=20;
 const result=playJourney(seed,difficulty,{...options,observe:s=>{
  options.observe?.(s);
  if(s.totalTime+1e-6>=nextSample){
   history.push({t:+s.totalTime.toFixed(2),player:{x:s.player.x,y:s.player.y},enemies:s.enemies.map(e=>({kind:e.kind,x:e.x,y:e.y,hp:e.hp}))});
   if(history.length>3)history.shift();nextSample+=20;
  }
 }});
 const s=result.state;
 if(extra.kind!=='camp_120s'&&!['won','lost'].includes(s.phase))stalls.push({seed,...extra,difficulty,phase:s.phase,bossSpawned:s.bossSpawned,bossDefeated:s.bossDefeated,player:{x:s.player.x,y:s.player.y,hp:s.player.hp},enemies:s.enemies.map(e=>({kind:e.kind,x:e.x,y:e.y,hp:e.hp})),lastHistory:history});
 return result;
}
function row(result,extra){const s=result.state,p=createProfile();if(['won','lost'].includes(s.phase))recordProgress(p,s,{final:true});return { ...extra,seed:result.seed,difficulty:s.difficulty,phase:s.phase,time:+s.totalTime.toFixed(2),hp:+s.player.hp.toFixed(2),hpPercent:+(s.player.hp/s.player.maxHp*100).toFixed(2),damageTaken:+s.damageTaken.toFixed(2),kills:s.kills,score:result.score,level:s.journal.level,xp:s.journal.xp,coins:s.journal.coins,coinsEarned:s.metrics.coinsEarned,purchases:s.metrics.purchases,potionsUsed:s.metrics.potionsUsed,dashes:s.metrics.dashes,pulses:s.metrics.pulses,forges:s.metrics.forges,deliveries:s.metrics.deliveries,ending:s.story.ending,firstRunStamps:extra.profile==='fresh'&&['won','lost'].includes(s.phase)?p.stamps:null};}
const scenarios=[['direct',{}],['letters',{systems:true,share:false,challenge:true,resume:true}],['hearth',{systems:true,share:true,challenge:true,resume:true}]];
for(const [profileName,profile]of [['fresh',createProfile()],['maximal',maximal]])for(const difficulty of ['wander','normal','night'])for(const [scenario,options]of scenarios)for(let seed=1001;seed<=1020;seed++){
 const extra={kind:'journey',profile:profileName,scenario};
 rows.push(row(runJourney(seed,difficulty,{...options,profile},extra),extra));
}
for(const difficulty of ['wander','normal','night'])for(let seed=1001;seed<=1010;seed++){
 let entered=null;
 const extra={kind:'camp_120s',profile:'fresh',scenario:'auto_attack_only'};
 const r=runJourney(seed,difficulty,{camp:true,noPulse:true,observe:s=>{if(s.litTotal>0&&!entered)entered={time:s.totalTime,coins:s.journal.coins,xp:s.journal.xp,kills:s.kills,hp:s.player.hp,damage:s.damageTaken};},stopWhen:s=>entered&&s.totalTime-entered.time>=120},extra);
 const x=row(r,extra);
 Object.assign(x,{campEstablished:!!entered,campElapsed:entered?+(r.state.totalTime-entered.time).toFixed(2):null,campGoldGain:entered?r.state.journal.coins-entered.coins:null,campXpGain:entered?r.state.journal.xp-entered.xp:null,campKills:entered?r.state.kills-entered.kills:null,campDamage:entered?+(r.state.damageTaken-entered.damage).toFixed(2):null});rows.push(x);
}
for(const difficulty of ['wander','normal','night'])for(let seed=1001;seed<=1010;seed++){
 let bossStart=null,bossEnd=null;
 const extra={kind:'boss_camp',profile:'fresh',scenario:'auto_attack_only'};
 const r=runJourney(seed,difficulty,{campBoss:true,noPulse:true,observe:s=>{if(s.bossSpawned&&!bossStart)bossStart={time:s.totalTime,damage:s.damageTaken};if(s.bossDefeated&&!bossEnd)bossEnd={time:s.totalTime,damage:s.damageTaken};}},extra);
 const x=row(r,extra);
 Object.assign(x,{bossTime:bossStart?+((bossEnd?.time??r.state.totalTime)-bossStart.time).toFixed(2):null,bossDamage:bossStart?+((bossEnd?.damage??r.state.damageTaken)-bossStart.damage).toFixed(2):null});rows.push(x);
}
const percentile=(a,q)=>{const b=[...a].sort((x,y)=>x-y),position=(b.length-1)*q,lower=Math.floor(position);return +(b[lower]+(b[Math.ceil(position)]-b[lower])*(position-lower)).toFixed(2);};
const groups=[];
for(const key of [...new Set(rows.map(x=>[x.kind,x.profile,x.difficulty,x.scenario].join('|')))]){
 const list=rows.filter(x=>[x.kind,x.profile,x.difficulty,x.scenario].join('|')===key);
 const g={key,n:list.length,wins:list.filter(x=>x.phase==='won').length,lost:list.filter(x=>x.phase==='lost').length,unfinished:list.filter(x=>!['won','lost'].includes(x.phase)).length};
 for(const metric of ['time','hpPercent','damageTaken','kills','score','level','coins','coinsEarned','purchases','potionsUsed','dashes','pulses','forges','firstRunStamps','campElapsed','campGoldGain','campXpGain','campDamage','bossTime','bossDamage']){
  const values=list.map(x=>x[metric]).filter(x=>typeof x==='number'&&Number.isFinite(x));if(values.length)g[metric]={min:Math.min(...values),median:percentile(values,.5),p90:percentile(values,.9),max:Math.max(...values)};
 }
 const wins=list.filter(x=>x.phase==='won').map(x=>x.time);if(wins.length)g.winTime={min:Math.min(...wins),median:percentile(wins,.5),p90:percentile(wins,.9),max:Math.max(...wins)};
 groups.push(g);
}
const startStats={};for(const [name,profile]of [['fresh',createProfile()],['maximal',maximal]]){const s=createGame({seed:1001,profile});const p=s.player;startStats[name]={hp:p.maxHp,speed:p.speed,boltDamage:p.damage,boltInterval:p.attackRate,crit:p.crit,expectedBoltDPS:+(p.damage/p.attackRate*(1+p.crit*.75)).toFixed(2),potions:s.journal.potions,coins:s.journal.coins};}
const hash=file=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const report={version,sourceCommit,sourceCommitNote:'Repository HEAD at start; file hashes identify the runtime and working-tree analysis actually executed.',runtimeHashes:Object.fromEntries(fs.readdirSync(path.join(root,'dist')).sort().map(name=>[name,hash('dist/'+name)])),analysisHashes:Object.fromEntries(['tests/journey-bot.mjs','scripts/balance-audit.mjs'].map(name=>[name,hash(name)])),command:'node scripts/balance-audit.mjs',seeds:{journeys:[1001,1020],probes:[1001,1010]},date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date()),timezone:'Asia/Shanghai',quantiles:'Linear interpolation at (n-1)*q; the median averages the two central values for even sample sizes.',method:'Deterministic navigation bot from tests/journey-bot.mjs with optional profile input, no-pulse, actual beacon-directed stationary policies and read-only observers. Uses real movement, collections, lamp costs, enemies and exits; no teleporting, health edits or boss bypasses.',limits:['Bots know world positions and use pathfinding; they are not human players.','Simulation times exclude UI reading, shopping decisions and render costs.','Bot success rates do not estimate human win rates.','time includes right-censored 1200-second policy timeouts; winTime includes successful journeys only.','Final HP includes recovery effects and is not a stand-alone measure of combat pressure.','firstRunStamps is estimated only for fresh-profile terminal runs; maximal-profile and incomplete probes leave it blank.','camp_120s is an incomplete one-beacon farming probe; it is not counted as a completed journey.','Maximal is a configured all-talents-level-3 profile with a discovered prism-lamp heirloom; no live player data is used.'],journeys:rows.filter(x=>x.kind==='journey').length,campProbes:30,bossCampJourneys:30,startStats,groups};
fs.writeFileSync(path.join(out,`v${version}-baseline.json`),JSON.stringify(report,null,2)+'\n');
const columns=[...new Set(rows.flatMap(Object.keys))];
fs.writeFileSync(path.join(out,`v${version}-samples.csv`),columns.join(',')+'\n'+rows.map(x=>columns.map(c=>JSON.stringify(x[c]??'')).join(',')).join('\n')+'\n');
fs.writeFileSync(path.join(out,`v${version}-stalls.json`),JSON.stringify({notice:'Development-policy timeouts; these do not prove a player soft lock. A player may reposition. Investigate enemy routing and policy targets before labeling them gameplay bugs.',details:stalls},null,2)+'\n');
console.log(JSON.stringify({version,journeys:report.journeys,campProbes:30,bossCampJourneys:30,wins:rows.filter(x=>x.phase==='won').length,unfinishedJourneyPolicies:rows.filter(x=>x.kind!=='camp_120s'&&x.phase==='playing').length,report:path.relative(root,path.join(out,`v${version}-baseline.json`))}));
