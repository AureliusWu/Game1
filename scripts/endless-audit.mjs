/** Deterministic action-only balance probes; success rates are not human-player win rates. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {VERSION} from '../dist/core.mjs';
import {playEndless} from '../tests/endless-bot.mjs';
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files=[...fs.readdirSync('dist').map(n=>'dist/'+n),'tests/endless-bot.mjs','scripts/endless-audit.mjs'];
const hashes=Object.fromEntries(files.map(f=>[f,digest(f)]));
const cases=[];
for(const seed of [1310,1311,1312,1313,1314,1315])for(const starter of ['cinder','frost','orbit','thunder'])for(const difficulty of ['wander','normal','night'])cases.push({group:'active',seed,starter,difficulty,floors:15,maxTime:900,resume:true});
for(const seed of [1321,1322,1323])for(const starter of ['cinder','frost','orbit','thunder'])for(const route of ['elite','cache','curse','rest'])cases.push({group:'route',seed,starter,route,difficulty:'normal',floors:10,maxTime:900,resume:true});
for(const seed of [1331,1332])for(const starter of ['cinder','frost','orbit','thunder'])for(const difficulty of ['wander','normal','night'])cases.push({group:'idle',seed,starter,difficulty,floors:99,maxTime:600,idle:true});
const rows=[];let n=0;
for(const c of cases){const r=playEndless(c),s=r.s;rows.push({group:c.group,seed:c.seed,starter:c.starter,difficulty:c.difficulty,route:c.route||'hunt',phase:s.phase,floor:s.endless.floor,cleared:s.endless.cleared,bosses:s.endless.bosses,evolutions:s.endless.evolutions.length,time:+s.totalTime.toFixed(3),damage:+s.damageTaken.toFixed(3),hp:+s.player.hp.toFixed(3),level:s.journal.level,choices:r.choices,maxEnemies:r.maxEnemies,maxProjectiles:r.maxProjectiles,maxEffects:r.maxEffects,resumed:r.resumed});if(++n%24===0)console.log(`${n}/${cases.length} action-only runs complete`);}
for(const file of files)if(digest(file)!==hashes[file])throw new Error('Source changed during audit: '+file);
const quantile=(values,p)=>{const a=[...values].sort((a,b)=>a-b),at=(a.length-1)*p,lo=Math.floor(at);return a[lo]+(a[Math.ceil(at)]-a[lo])*(at-lo);};
const groups={};for(const key of ['active','route','idle']){const g=rows.filter(r=>r.group===key);groups[key]={count:g.length,settled:g.filter(r=>r.phase==='won').length,lost:g.filter(r=>r.phase==='lost').length,timeLimited:g.filter(r=>!['won','lost'].includes(r.phase)).length,floor:{min:Math.min(...g.map(r=>r.floor)),median:quantile(g.map(r=>r.floor),.5),max:Math.max(...g.map(r=>r.floor))},durationMedian:quantile(g.map(r=>r.time),.5),damageMedian:quantile(g.map(r=>r.damage),.5),evolutionRuns:g.filter(r=>r.evolutions>0).length};}
const keys=Object.keys(rows[0]);fs.writeFileSync(`docs/balance/v${VERSION}-endless-samples.csv`,keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');
const result={version:VERSION,generatedAt:new Date().toISOString(),cases:cases.length,method:'Actual movement, skills, pickups, enemy damage and seeded choices. No teleport, actor/HP edits or forced room completion. Active probes voluntarily stop after 15 floors; route probes after 10. Not human playtest evidence.',sourceHashes:hashes,groups,bounds:{enemies:Math.max(...rows.map(r=>r.maxEnemies)),projectiles:Math.max(...rows.map(r=>r.maxProjectiles)),effects:Math.max(...rows.map(r=>r.maxEffects))}};
fs.writeFileSync(`docs/balance/v${VERSION}-endless-summary.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cases:result.cases,groups,bounds:result.bounds}));
