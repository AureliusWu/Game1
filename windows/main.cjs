'use strict';
const {app,BrowserWindow,protocol,session,screen,dialog}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const smoke=process.argv.includes('--smoke-test');
const {createUpdater}=require('./update.cjs');
const argument=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const reportPath=smoke?argument('--smoke-result'):null;
app.setName('Ember Courier');
app.setPath('userData',smoke?fs.mkdtempSync(path.join(os.tmpdir(),'ember-courier-qa-')):path.join(app.getPath('appData'),'EmberCourier'));
protocol.registerSchemesAsPrivileged([{scheme:'ember',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let win,closing=false;
let updater;
const root=path.join(__dirname,'game');
const info=JSON.parse(fs.readFileSync(path.join(__dirname,'build-info.json'),'utf8'));
const ownURL=value=>{try{const u=new URL(value);return u.protocol==='ember:'&&u.host==='game';}catch{return false;}};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
function verifyBundle(){
 const hashes={};for(const [name,expected]of Object.entries(info.web_asset_sha256)){
  if(path.basename(name)!==name)throw new Error('Invalid bundled asset name');
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
  if(hash!==expected)throw new Error('Bundled asset checksum differs: '+name);hashes[name]=hash;
 }return hashes;
}
function writeReport(data){if(reportPath){fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(data,null,2)+'\n');}}
async function smokeTest(){
 const probe=await win.webContents.executeJavaScript(`(async()=>{
  const wait=async predicate=>{for(let i=0;i<150;i++){if(predicate())return;await new Promise(r=>setTimeout(r,100));}throw Error('Desktop UI timeout');};
  await wait(()=>!!window.emberCourierNative);
  if(document.querySelector('.menu-footer').textContent.indexOf('v${info.version}')<0)throw Error('Wrong desktop version');
  if(innerWidth<=innerHeight||document.getElementById('orientation-dialog').open)throw Error('Desktop must open in landscape');
  if(typeof require!=='undefined'||typeof process!=='undefined')throw Error('Node APIs leaked into the renderer');
  document.querySelector('[data-mode=endless]').click();document.getElementById('start').click();
  await wait(()=>!document.getElementById('game').hidden);
  window.emberCourierNative.pause();
  const before=JSON.parse(localStorage.getItem('ember-courier.save.v1'));
  if(!before||!before.journeyId||!document.getElementById('pause-dialog').open)throw Error('Desktop save/pause failed');
  document.getElementById('save-exit').click();
  if(document.getElementById('continue').hidden)throw Error('Desktop continue is missing');
  document.getElementById('continue').click();window.emberCourierNative.pause();
  const after=JSON.parse(localStorage.getItem('ember-courier.save.v1'));
  if(before.journeyId!==after.journeyId)throw Error('Desktop save identity changed');
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return {version:'${info.version}',origin:location.origin,landscape:innerWidth>innerHeight,saveResume:true,sandboxed:typeof require==='undefined',journey:after.journeyId};
 })()`,true);
 win.setMinimumSize(360,360);win.setContentSize(480,800);
 await win.webContents.executeJavaScript(`(async()=>{
  for(let i=0;i<100&&!document.getElementById('orientation-dialog').open;i++)await new Promise(r=>setTimeout(r,50));
  if(!document.getElementById('orientation-dialog').matches(':modal'))throw Error('Portrait guard is missing');
  window.emberCourierNative.back();if(!document.getElementById('orientation-dialog').open)throw Error('Back dismissed the portrait gate');
  const before=JSON.parse(localStorage.getItem('ember-courier.save.v1')).totalTime;
  await new Promise(r=>setTimeout(r,600));window.emberCourierNative.pause();
  if(JSON.parse(localStorage.getItem('ember-courier.save.v1')).totalTime!==before)throw Error('Portrait advanced game time');
 })()`,true);
 if(reportPath)fs.writeFileSync(path.join(path.dirname(reportPath),'windows-portrait-guard.png'),(await win.webContents.capturePage()).toPNG());
 win.setContentSize(1024,640);
 await win.webContents.executeJavaScript(`(async()=>{
  for(let i=0;i<100&&document.getElementById('orientation-dialog').open;i++)await new Promise(r=>setTimeout(r,50));
  if(document.getElementById('orientation-dialog').open||!document.getElementById('pause-dialog').open)throw Error('Landscape did not restore the previous pause');
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 })()`,true);
 const image=await win.webContents.capturePage();
 if(reportPath)fs.writeFileSync(path.join(path.dirname(reportPath),'windows-smoke.png'),image.toPNG());
 writeReport({status:'passed',...probe,portraitGate:true,commit:info.commit,web_asset_sha256:verifyBundle(),electron:process.versions.electron});
 closing=true;win.destroy();app.quit();
}
async function boot(){
 verifyBundle();
 protocol.handle('ember',async request=>{
  try{
   if(!ownURL(request.url)||!['GET','HEAD'].includes(request.method))return new Response('',{status:403});
   const u=new URL(request.url),name=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname);
   const file=path.resolve(root,'.'+name),relative=path.relative(root,file);
   if(!relative||relative.startsWith('..')||path.isAbsolute(relative))return new Response('',{status:403});
   return new Response(request.method==='HEAD'?null:await fs.promises.readFile(file),{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response('',{status:404});}
 });
 session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 session.defaultSession.setPermissionCheckHandler(()=>false);
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!ownURL(details.url)&&!details.url.startsWith('data:')}));
 const area=screen.getPrimaryDisplay().workAreaSize,width=Math.min(1280,area.width),height=Math.min(800,area.height,Math.floor(width*.7));
 win=new BrowserWindow({width,height,minWidth:Math.min(960,width),minHeight:Math.min(540,height),title:'余烬信使',backgroundColor:'#102d32',autoHideMenuBar:true,show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,devTools:!app.isPackaged}});
 win.setMenu(null);
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{
  if(url==='ember://game/update-check'||url==='ember-update://check'){event.preventDefault();updater?.check(true);return;}
  if(!ownURL(url))event.preventDefault();
 });
 win.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&(input.key==='F11'||input.key==='Enter'&&input.alt)){event.preventDefault();win.setFullScreen(!win.isFullScreen());}});
 win.on('blur',()=>{if(!closing&&!smoke)win.webContents.executeJavaScript('window.emberCourierNative?.pause()').catch(()=>{});});
 win.on('close',event=>{
  if(closing)return;event.preventDefault();closing=true;
  const timer=setTimeout(()=>{if(!win.isDestroyed())win.destroy();},1800);
  win.webContents.executeJavaScript('window.emberCourierNative?.pause()').catch(()=>{}).finally(()=>{clearTimeout(timer);if(!win.isDestroyed())win.destroy();});
 });
 win.once('ready-to-show',()=>win.show());
 await win.loadURL('ember://game/index.html');
 if(smoke){await smokeTest();}
 else {const timer=setTimeout(()=>updater?.check(false),8000);timer.unref();}
}
if(!app.requestSingleInstanceLock()){app.quit();}
else{
 app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.focus();}});
 app.whenReady().then(()=>{
  updater=createUpdater({app,dialog,getWindow:()=>win,currentVersion:info.version,quit:()=>{closing=true;if(win&&!win.isDestroyed())win.destroy();app.quit();}});
  return boot();
 }).catch(error=>{writeReport({status:'failed',error:String(error)});console.error(error);if(!smoke)dialog.showErrorBox('余烬信使未能启动','游戏文件未能完整载入，请重新下载完整安装包。');app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
