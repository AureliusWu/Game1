import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const version=JSON.parse(fs.readFileSync('package.json')).version;
const desktop=JSON.parse(fs.readFileSync('windows/package.json'));
if(desktop.version!==version)throw Error('Windows and game versions differ');
const canonical=JSON.parse(fs.readFileSync(`artifacts/web/Ember-Courier-Web-v${version}-provenance.json`));
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(canonical.commit!==commit||canonical.version!==version)throw Error('Web artifact provenance differs from the source commit');
fs.rmSync('windows/game',{recursive:true,force:true});
fs.mkdirSync('windows/game',{recursive:true});
for(const [name,hash]of Object.entries(canonical.web_asset_sha256)){
 const data=fs.readFileSync(path.join('dist',name));if(crypto.createHash('sha256').update(data).digest('hex')!==hash)throw Error('Windows source differs from canonical web artifact: '+name);
 fs.writeFileSync(path.join('windows/game',name),data);
}
fs.copyFileSync('LICENSE','windows/LICENSE');
fs.writeFileSync('windows/build-info.json',JSON.stringify({...canonical,platform:'windows-x64',electron:desktop.devDependencies.electron},null,2)+'\n');
console.log(`Prepared ${Object.keys(canonical.web_asset_sha256).length} verified assets for Windows ${version}`);
