import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(path.resolve('windows/package.json'));
const asar=await import(pathToFileURL(require.resolve('@electron/asar')).href);
const info=JSON.parse(fs.readFileSync('windows/build-info.json'));
const name=`Ember-Courier-v${info.version}-Windows-x64.exe`,file=path.join('windows/out',name);
if(!fs.existsSync(file))throw Error('Missing portable EXE');
for(const [asset,hash]of Object.entries(info.web_asset_sha256)){
 const embedded=asar.extractFile('windows/out/win-unpacked/resources/app.asar','game/'+asset);
 if(crypto.createHash('sha256').update(embedded).digest('hex')!==hash)throw Error('ASAR asset differs from the canonical web release: '+asset);
}
const smoke=JSON.parse(fs.readFileSync(process.argv[2]));
if(smoke.status!=='passed'||smoke.portraitGate!==true||smoke.version!==info.version||smoke.commit!==info.commit||JSON.stringify(smoke.web_asset_sha256)!==JSON.stringify(info.web_asset_sha256))throw Error('Packaged EXE smoke test did not verify the source assets');
const out='artifacts/windows';fs.mkdirSync(out,{recursive:true});fs.copyFileSync(file,path.join(out,name));
fs.writeFileSync(path.join(out,`Ember-Courier-Windows-v${info.version}-provenance.json`),JSON.stringify({...info,smoke_test:{landscape:smoke.landscape,portraitGate:smoke.portraitGate,saveResume:smoke.saveResume,sandboxed:smoke.sandboxed},code_signed:false,exe_sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},null,2)+'\n');
console.log(`Verified portable EXE, desktop save/resume and ${Object.keys(info.web_asset_sha256).length} bundled assets`);
