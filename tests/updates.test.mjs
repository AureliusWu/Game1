import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {compareVersions as compareWeb,parseVersion,nativePlatform,safeWebRestart,UPDATE_MESSAGE} from '../dist/update.mjs';
const require=createRequire(import.meta.url);
const win=require('../windows/update.cjs');
test('native and web version comparisons accept only strict numeric releases',()=>{
 for(const [a,b,result] of [['1.8.1','1.8.0',1],['v1.8.1','1.8.1',0],['1.8.0','1.8.1',-1],['2.0.0','1.99.99',1],['1.8.1-rc.1','1.8.0',null],['oops','1.2.0',null]]){
  assert.equal(compareWeb(a,b),result);
  assert.equal(win.compareVersions(a,b),result);
 }
 assert.deepEqual(parseVersion('v1.8.1'),[1,8,1]);
});
test('web worker updates only while the last game client is at its safe menu',async()=>{
 assert.equal(nativePlatform('ember:','game'),'windows');
 assert.equal(nativePlatform('https:','appassets.androidplatform.net'),'android');
 assert.equal(nativePlatform('https:','aureliuswu.github.io'),'web');
 assert.ok(safeWebRestart({screen:'menu',hidden:false,openDialogs:false}));
 for(const changed of [{screen:'game'},{hidden:true},{openDialogs:true},{portrait:true}]){
  assert.equal(safeWebRestart({screen:'menu',hidden:false,openDialogs:false,...changed}),false);
 }
 const script=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
 assert.match(script,new RegExp(UPDATE_MESSAGE));
 assert.match(script,/clients\.matchAll/);
 assert.match(script,/windows\.length!==1/);
 assert.match(script,/skipWaiting/);
});
test('native updater is pinned to GitHub HTTPS and exact immutable release artifacts',()=>{
 assert.throws(()=>win.verifyHost('http://github.com/x'));
 assert.throws(()=>win.verifyHost('https://evil.github.com/release'));
 assert.throws(()=>win.verifyHost('https://github.com.evil.test/x'));
 assert.equal(win.verifyHost('https://api.github.com/repos/AureliusWu/Game1/releases/latest').hostname,'api.github.com');
 const version='1.8.2',name='Ember-Courier-v1.8.2-Windows-x64.exe',prefix='https://github.com/AureliusWu/Game1/releases/download/v1.8.2/';
 const data={tag_name:'v1.8.2',assets:[{name,size:150000000,browser_download_url:prefix+name},{name:'SHA256SUMS.txt',browser_download_url:prefix+'SHA256SUMS.txt'}]};
 assert.equal(win.pickRelease(data,'1.8.1').version,version);
 assert.equal(win.pickRelease(data,'1.8.2'),null);
 assert.equal(win.pickRelease({...data,assets:[{...data.assets[0],browser_download_url:'https://evil.test/fake'},data.assets[1]]},'1.8.1'),null);
 const hash='a'.repeat(64);
 assert.equal(win.checksumFor(hash+'  '+name+'\n',name),hash);
 assert.throws(()=>win.checksumFor(hash+'  wrong.exe\n',name));
});
test('Windows updater waits for original process, compares staged hash, rolls back on failure',async()=>{
 assert.match(win.REPLACE_SCRIPT,/Get-Process -Id \$ParentPid/);
 assert.match(win.REPLACE_SCRIPT,/Get-FileHash -LiteralPath \$Source -Algorithm SHA256/);
 assert.match(win.REPLACE_SCRIPT,/Move-Item -LiteralPath \$Backup -Destination \$Target/);
 assert.match(win.REPLACE_SCRIPT,/Start-Process -FilePath \$Target/);
 const host=await readFile(new URL('../windows/main.cjs',import.meta.url),'utf8');
 assert.match(host,/ember:\/\/game\/update-check/);
 assert.match(host,/updater\?\.check\(false\)/);
});
