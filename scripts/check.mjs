import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('dist');
const files=fs.readdirSync(root);
for(const name of files.filter(n=>/\.(mjs|js)$/.test(n))){const p=spawnSync(process.execPath,['--check',path.join(root,name)],{encoding:'utf8'});if(p.status!==0)throw new Error(p.stderr);}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML IDs');
for(const match of html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g))if(!fs.existsSync(path.join(root,match[1])))throw new Error('Missing asset: '+match[1]);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
for(const icon of manifest.icons)if(!fs.existsSync(path.join(root,icon.src)))throw new Error('Missing icon: '+icon.src);
const code=fs.readFileSync(path.join(root,'app.mjs'),'utf8');
for(const m of code.matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(m[1]))throw new Error('Missing UI element '+m[1]);
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
for(const file of files)if(/\.(mjs|css|html|png|svg|webmanifest)$/.test(file)&&!sw.includes(`'./${file}'`))throw new Error('Asset not in offline cache: '+file);
const total=files.reduce((n,f)=>n+fs.statSync(path.join(root,f)).size,0);
console.log(`Validated ${files.length} static files, ${ids.length} unique UI IDs; ${(total/1024).toFixed(1)} KiB total. No build or runtime dependencies.`);
