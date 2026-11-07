'use strict';
/**
 * Portable EXE updater. Renderer has no Node/network permissions.
 * Only official immutable GitHub Release artifacts are considered, and binaries
 * must match both SHA256SUMS and the release asset's size before staged replacement.
 * The user consents before download and before the OS starts the replacement.
 */
const https=require('node:https');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const {once}=require('node:events');

const REPO='https://github.com/AureliusWu/Game1/releases/download/';
const API='https://api.github.com/repos/AureliusWu/Game1/releases/latest';
const MAX_EXE=250*1024*1024;
const allowedHosts=new Set(['api.github.com','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com']);
const parseVersion=value=>{const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value||''));return m?m.slice(1).map(Number):null;};
function compareVersions(a,b){
 const left=parseVersion(a),right=parseVersion(b);
 if(!left||!right||![...left,...right].every(Number.isSafeInteger))return null;
 for(let i=0;i<3;i++)if(left[i]!==right[i])return left[i]>right[i]?1:-1;
 return 0;
}
function verifyHost(url){
 const u=new URL(url);
 if(u.protocol!=='https:'||!allowedHosts.has(u.hostname)||u.username||u.password)throw Error('Update URL must be official HTTPS');
 return u;
}
function open(url,depth=0){
 return new Promise((resolve,reject)=>{
  if(depth>5)return reject(Error('Too many redirects'));
  let u;try{u=verifyHost(url);}catch(e){reject(e);return;}
  const req=https.get(u,{headers:{'User-Agent':'Ember-Courier-Windows-Updater','Accept':'application/vnd.github+json, application/octet-stream'},timeout:18000},res=>{
   if(res.statusCode>=300&&res.statusCode<400){
    const to=res.headers.location;res.resume();
    if(!to){reject(Error('Empty update redirect'));return;}
    let target;try{target=new URL(to,u).toString();}catch(error){reject(error);return;}
    open(target,depth+1).then(resolve,reject);return;
   }
   if(res.statusCode!==200){res.resume();reject(Error('GitHub returned '+res.statusCode));return;}
   resolve(res);
  });
  req.once('timeout',()=>req.destroy(Error('Update request timed out')));
  req.once('error',reject);
 });
}
async function collect(url,maxBytes){
 const source=await open(url);let total=0;const parts=[];
 for await(const buf of source){total+=buf.length;if(total>maxBytes){source.destroy();throw Error('Update response too large');}parts.push(buf);}
 return Buffer.concat(parts).toString('utf8');
}
function checksumFor(text,filename){
 for(const line of text.split(/\r?\n/)){
  const m=/^([a-fA-F0-9]{64})  ([\w.-]+)$/.exec(line);
  if(m&&m[2]===filename)return m[1].toLowerCase();
 }
 throw Error('Release SHA256SUMS lacks the exact binary');
}
function pickRelease(data,currentVersion){
 const tag=data?.tag_name;
 if(typeof tag!=='string'||!/^v\d+\.\d+\.\d+$/.test(tag)||compareVersions(tag,currentVersion)!==1)return null;
 const version=tag.slice(1),name='Ember-Courier-v'+version+'-Windows-x64.exe',prefix=REPO+tag+'/';
 const binary=data.assets?.find(a=>a.name===name&&a.browser_download_url===prefix+name);
 const sums=data.assets?.find(a=>a.name==='SHA256SUMS.txt'&&a.browser_download_url===prefix+'SHA256SUMS.txt');
 if(!binary||!sums||!Number.isSafeInteger(binary.size)||binary.size<1000||binary.size>MAX_EXE)return null;
 return {tag,version,name,url:prefix+name,sums:prefix+'SHA256SUMS.txt',size:binary.size};
}
async function downloadVerified(release,directory){
 fs.mkdirSync(directory,{recursive:true});
 const text=await collect(release.sums,128*1024),expected=checksumFor(text,release.name);
 const destination=path.join(directory,release.name),part=destination+'.part';
 fs.rmSync(part,{force:true});
 let length=0,sha=crypto.createHash('sha256'),output;
 try{
  const input=await open(release.url);output=fs.createWriteStream(part,{flags:'wx'});
  for await(const buf of input){
   length+=buf.length;if(length>MAX_EXE||length>release.size)throw Error('EXE exceeds verified size');
   sha.update(buf);
   if(!output.write(buf))await once(output,'drain');
  }
  output.end();await once(output,'finish');
  if(length!==release.size||sha.digest('hex')!==expected)throw Error('EXE failed SHA256/size verification');
  fs.renameSync(part,destination);return {file:destination,sha256:expected};
 }catch(error){output?.destroy();try{fs.rmSync(part,{force:true});}catch{}throw error;}
}
/** Script is fixed local source; paths and hash are passed separately, never interpolated. */
const REPLACE_SCRIPT=String.raw`param([int]$ParentPid,[string]$Source,[string]$Target,[string]$Sha256,[string]$Backup,[string]$Log)
$ErrorActionPreference='Stop'
try {
  for($n=0;$n -lt 90;$n++){
    if(-not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)){break}
    Start-Sleep -Milliseconds 900
  }
  $actual=(Get-FileHash -LiteralPath $Source -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -ne $Sha256.ToLowerInvariant()){throw 'Downloaded EXE hash changed before replacement'}
  $replaced=$false
  for($n=0;$n -lt 25;$n++){
    try {
      if(-not (Test-Path -LiteralPath $Target)){throw 'Original executable vanished'}
      Move-Item -LiteralPath $Target -Destination $Backup -ErrorAction Stop
      $replaced=$true
      break
    } catch { Start-Sleep -Milliseconds 700 }
  }
  if(-not $replaced){throw 'Original EXE is locked or its folder is read-only'}
  try { Move-Item -LiteralPath $Source -Destination $Target -ErrorAction Stop }
  catch {
    Move-Item -LiteralPath $Backup -Destination $Target -ErrorAction SilentlyContinue
    throw
  }
  Start-Process -FilePath $Target -ErrorAction Stop
  Start-Sleep -Milliseconds 500
  Remove-Item -LiteralPath $Backup -Force -ErrorAction SilentlyContinue
  'success' | Set-Content -LiteralPath $Log
} catch {
  if((Test-Path -LiteralPath $Backup) -and -not (Test-Path -LiteralPath $Target)){
    Move-Item -LiteralPath $Backup -Destination $Target -ErrorAction SilentlyContinue
  }
  ('failed: '+$_.Exception.Message) | Set-Content -LiteralPath $Log
}
`;
function targetPortable(){
 const candidate=process.env.PORTABLE_EXECUTABLE_FILE;
 if(!candidate||!path.isAbsolute(candidate)||!/\.exe$/i.test(candidate))return null;
 try{if(!fs.statSync(candidate).isFile())return null;}catch{return null;}
 return candidate;
}
function stageReplacement({file,sha256,version,userData,target,quit}){
 const folder=path.join(userData,'updates'),script=path.join(folder,'replace-after-exit.ps1');
 const backup=target+'.ember-backup-'+Date.now(),log=path.join(folder,'last-update-result.txt');
 fs.writeFileSync(script,REPLACE_SCRIPT,{encoding:'utf8',mode:0o600});
 const args=['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',script,
  '-ParentPid',String(process.pid),'-Source',file,'-Target',target,'-Sha256',sha256,'-Backup',backup,'-Log',log];
 const child=cp.spawn('powershell.exe',args,{detached:true,windowsHide:true,stdio:'ignore'});
 child.unref();quit();
}
function createUpdater({app,dialog,getWindow,currentVersion,quit}){
 const userData=app.getPath('userData'),stateFile=path.join(userData,'updates','last-check.json');
 let busy=false;
 const notify=async({title,message,buttons=['确定']})=>{
  const win=getWindow();if(!win||win.isDestroyed())return {response:1};
  return dialog.showMessageBox(win,{type:'info',title,message,buttons,cancelId:buttons.length-1,noLink:true});
 };
 const check=async(manual=false)=>{
  if(busy||!getWindow()||getWindow().isDestroyed())return;
  if(!manual){
   try{const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));if(Date.now()-state.time<24*60*60*1000)return;}catch{}
  }
  busy=true;
  try{
   const latest=JSON.parse(await collect(API,512*1024));
   fs.mkdirSync(path.dirname(stateFile),{recursive:true});
   fs.writeFileSync(stateFile,JSON.stringify({time:Date.now()})+'\n');
   const release=pickRelease(latest,currentVersion);
   if(!release){if(manual)await notify({title:'余烬信使 · 检查更新',message:'当前 v'+currentVersion+' 已是最新版。'});return;}
   const decision=await notify({title:'余烬信使 v'+release.version+' 可更新',
    message:'已发现官方新版。下载并校验完整 EXE 后，将保存游戏、退出当前程序、覆盖原位置并重新启动。存档不会删除。',
    buttons:['下载并更新','稍后']});
   if(decision.response!==0)return;
   const staged=await downloadVerified(release,path.join(userData,'updates'));
   const target=targetPortable();
   if(!target){
    await notify({title:'已校验新版文件',message:'当前运行环境不能安全定位便携 EXE，因此不执行自动覆盖。已下载文件：'+staged.file});
    return;
   }
   const final=await notify({title:'已验证 v'+release.version,
    message:'SHA256 校验成功。点击“保存并重启”后游戏会退出，由独立更新进程覆盖原 EXE。若无写入权限，则保留旧程序和已下载的新文件。',
    buttons:['保存并重启','暂不安装']});
   if(final.response===0){
    const win=getWindow();if(win&&!win.isDestroyed())await win.webContents.executeJavaScript('window.emberCourierNative?.pause()').catch(()=>{});
    stageReplacement({...staged,version:release.version,userData,target,quit});
   }
  }catch(error){if(manual)await notify({title:'更新暂不可用',message:'无法检查或校验官方发布包。现有游戏未改动，离线模式正常。\n'+String(error.message||error).slice(0,140)});}
  finally{busy=false;}
 };
 return {check,portableExecutable:targetPortable};
}
module.exports={createUpdater,compareVersions,pickRelease,checksumFor,verifyHost,targetPortable,REPLACE_SCRIPT};
