/** Portable update policy. The renderer may inspect updates but never installs native binaries. */
export const parseVersion=value=>{
 const match=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value||''));
 if(!match)return null;
 const parts=match.slice(1).map(Number);
 return parts.every(Number.isSafeInteger)?parts:null;
};
export function compareVersions(a,b){
 const x=parseVersion(a),y=parseVersion(b);if(!x||!y)return null;
 for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;
 return 0;
}
export const nativePlatform=(protocol,hostname)=>hostname==='appassets.androidplatform.net'?'android':protocol==='ember:'?'windows':'web';
export const safeWebRestart=({screen,hidden,openDialogs,portrait=false})=>screen==='menu'&&!hidden&&!portrait&&!openDialogs;
export const UPDATE_MESSAGE='EMBER_APPLY_WAITING';
