/** Finite action-only probes for v1.6 growth: no edits to runtime HP, positions, XP or actors. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {VERSION} from '../dist/core.mjs';
import {playEndless} from '../tests/endless-bot.mjs';
import {createProfile} from '../dist/progress.mjs';
import {buyNode,TREE} from '../dist/growth.mjs';
const sourceFiles=[...fs.readdirSync('dist').map(n=>'dist/'+n),'tests/endless-bot.mjs','scripts/growth-audit.mjs'];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sourceHashes=Object.fromEntries(sourceFiles.map(f=>[f,hash(f)]));
const rows=[];
for(const seed of [1601,1602])for(const starter of ['cinder','frost','orbit','thunder'])for(const difficulty of ['wander','normal','night'])for(const setup of ['new','trained']){
 const profile=createProfile();
 if(setup==='trained'){profile.stamps=100;profile.earned=100;for(const n of TREE.filter(n=>n.path==='warden'))buyNode(profile,n.id);}
 const r=playEndless({seed,starter,difficulty,profile,discipline:setup==='trained'?'warden':'dawn',floors:10,maxTime:600,resume:true}),s=r.s;
 rows.push({seed,starter,difficulty,setup,phase:s.phase,floor:s.endless.floor,cleared:s.endless.cleared,bosses:s.endless.bosses,evolutions:s.endless.evolutions.length,level:s.journal.level,time:+s.totalTime.toFixed(3),hp:+s.player.hp.toFixed(3),damage:+s.damageTaken.toFixed(3),specializations:{...s.growth.disciplines},resumed:r.resumed,maxEnemies:r.maxEnemies,maxProjectiles:r.maxProjectiles,maxEffects:r.maxEffects});
 if(rows.length%12===0)console.log(`${rows.length}/48 growth probes complete`);
}
for(const starter of ['cinder','frost','orbit','thunder']){const r=playEndless({seed:1603,starter,floors:99,maxTime:300,idle:true});rows.push({setup:'idle',starter,phase:r.s.phase,floor:r.s.endless.floor,cleared:r.s.endless.cleared,time:+r.s.totalTime.toFixed(3),damage:+r.s.damageTaken.toFixed(3)});}
for(const f of sourceFiles)if(hash(f)!==sourceHashes[f])throw new Error('Source changed during growth audit: '+f);
const groups=Object.fromEntries(['new','trained','idle'].map(id=>{const rs=rows.filter(r=>r.setup===id);return[id,{runs:rs.length,settled:rs.filter(r=>r.phase==='won').length,lost:rs.filter(r=>r.phase==='lost').length,timeLimited:rs.filter(r=>!['won','lost'].includes(r.phase)).length,minCleared:Math.min(...rs.map(r=>r.cleared)),maxCleared:Math.max(...rs.map(r=>r.cleared))}];}));
fs.writeFileSync(`docs/balance/v${VERSION}-growth-audit.json`,JSON.stringify({version:VERSION,generatedAt:new Date().toISOString(),method:'48 action-only probes to 10 floors with real movement/combat/collection and save/resume; 4 stationary controls. Trained is an explicit profile fixture with purchased warden nodes; new has no tree. In-run points earned by gameplay. These are bot samples, not human win-rate or fun claims.',sourceHashes,groups,rows},null,2)+'\n');
console.log(JSON.stringify({groups}));
