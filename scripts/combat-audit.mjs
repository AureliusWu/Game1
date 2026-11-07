/** Reproducible action-only pacing probes. Same policy and seeds for before/after. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {VERSION} from '../dist/core.mjs';
import {playEndless} from '../tests/endless-bot.mjs';
const rows=[];
for(const seed of [1401,1402,1403])for(const starter of ['cinder','frost','orbit','thunder']){
 let firstKill=null,firstChoice=null,lastKill=0,kills=0,quiet=0,overdrives=0,dashHits=0;
 const r=playEndless({seed,starter,floors:10,resume:true,maxTime:900,observe:s=>{
  if(s.kills>kills){firstKill??=s.totalTime;lastKill=s.totalTime;kills=s.kills;}
  if(s.phase==='upgrade')firstChoice??=s.totalTime;
  if(s.totalTime-lastKill>3)quiet+=.05;
  overdrives+=s.events.filter(e=>e.type==='overdrive').length;
  dashHits+=s.events.filter(e=>e.type==='dash-hit').length;
 }});
 rows.push({seed,starter,phase:r.s.phase,cleared:r.s.endless.cleared,firstKill,firstChoice,time:r.s.totalTime,kills:r.s.kills,damage:r.s.damageTaken,quiet,choices:r.choices,overdrives,dashHits,maxEnemies:r.maxEnemies,maxEffects:r.maxEffects,maxProjectiles:r.maxProjectiles});
}
const median=arr=>{const a=[...arr].sort((a,b)=>a-b);return(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2;};
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const summary={version:VERSION,generatedAt:new Date().toISOString(),method:'12 deterministic runs: 3 seeds x 4 weapons, normal difficulty, 10 floors. Unchanged action policy, real skills, pickups, damage and save/resume. Quiet seconds count simulated time more than 3 seconds since last kill. Modal decision time is excluded. These are pacing probes, not human enjoyment or win-rate evidence.',policyHash:digest('tests/endless-bot.mjs'),runtimeHashes:Object.fromEntries(fs.readdirSync('dist').map(n=>['dist/'+n,digest('dist/'+n)])),summary:{runs:rows.length,settled:rows.filter(r=>r.phase==='won').length,firstKillMedian:median(rows.map(r=>r.firstKill)),firstChoiceMedian:median(rows.map(r=>r.firstChoice)),tenFloorTimeMedian:median(rows.map(r=>r.time)),killsPerMinuteMedian:median(rows.map(r=>r.kills/r.time*60)),quietPercentMedian:median(rows.map(r=>r.quiet/r.time*100)),damageMedian:median(rows.map(r=>r.damage)),overdrives:rows.reduce((n,r)=>n+r.overdrives,0),dashHits:rows.reduce((n,r)=>n+r.dashHits,0)},rows};
fs.writeFileSync(`docs/balance/v${VERSION}-combat-pacing.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({version:VERSION,...summary.summary}));
