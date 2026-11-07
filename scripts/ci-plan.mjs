import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

export function planJobs({event,ref,changed=[],tagExists=false,message='',target='all',publish=true}){
 const manual=event==='workflow_dispatch',main=ref==='refs/heads/main',qa=message.includes('[qa-only]');
 const shared=changed.some(p=>/^(dist\/|package\.json$|\.gitattributes$|\.github\/workflows\/ci\.yml$)/.test(p));
 const release=main&&publish&&!qa&&!tagExists&&(!manual||target==='all');
 const selected=kind=>manual?target==='all'||target===kind:false;
 const web=release||selected('web')||!manual&&(shared||changed.some(p=>/^(scripts\/package_web\.py|scripts\/verify-pages\.py|\.github\/workflows\/pages\.yml)$/.test(p)));
 const android=release||selected('android')||!manual&&(shared||changed.some(p=>/^(android\/|scripts\/(package_release\.py|check_draft_screenshots\.py|start-android-emulator\.sh)$|\.github\/workflows\/android\.yml$)/.test(p)));
 const windows=release||selected('windows')||!manual&&(shared||changed.some(p=>/^(windows\/|scripts\/(prepare-windows\.mjs|package_windows\.mjs|smoke_windows\.ps1)$|\.github\/workflows\/windows\.yml$)/.test(p)));
 return {web,android,windows,release,deploy_web:main&&publish&&web,sign_android:main&&publish&&android};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH));
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const version=JSON.parse(fs.readFileSync('package.json')).version,tag=`v${version}`;
 let tagExists=false;try{git('rev-parse','--verify',`refs/tags/${tag}`);tagExists=true;}catch{}
 const base=event.pull_request?.base?.sha||event.before;
 const changed=(base&&!/^0+$/.test(base)?git('diff','--name-only',base,'HEAD'):git('show','--pretty=','--name-only','HEAD')).split('\n').filter(Boolean);
 const plan=planJobs({event:process.env.GITHUB_EVENT_NAME,ref:process.env.GITHUB_REF,changed,tagExists,message:event.head_commit?.message||'',target:event.inputs?.target||'all',publish:event.inputs?.publish!=='false'});
 if(tagExists&&process.env.GITHUB_REF==='refs/heads/main'){
  const runtimeDiff=git('diff','--name-only',tag,'HEAD','--','dist','android/app/src/main','windows/main.cjs','windows/package.json','windows/package-lock.json');
  if(runtimeDiff)throw Error(`Published ${tag} is immutable. Increment game/Windows versions before runtime changes.\n${runtimeDiff}`);
 }
 const outputs={version,...plan};
 fs.appendFileSync(process.env.GITHUB_OUTPUT,Object.entries(outputs).map(([k,v])=>`${k}=${v}\n`).join(''));
 console.log(JSON.stringify({changed,...outputs},null,2));
}
