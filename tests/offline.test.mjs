import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
async function worker(){
  const origin='https://game.example',scope=origin+'/Game1/',listeners={},stores=new Map();let online=true,claimed=false,windows=1,skipped=false;
  const urlOf=request=>typeof request==='string'?new URL(request,scope).href:request.url;
  const normalize=(request,options={})=>{const u=new URL(urlOf(request));if(options.ignoreSearch)u.search='';return u.href;};
  const network=async request=>{if(!online)throw new Error('offline');const u=new URL(urlOf(request));const name=u.pathname.slice('/Game1/'.length)||'index.html';return new Response(await fs.readFile(new URL('../dist/'+name,import.meta.url)));};
  const caches={
    async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {
      async addAll(files){for(const f of files)store.set(normalize(f),await network(f));},
      async put(req,res){store.set(normalize(req),res);}
    };},
    async match(req,options){for(const store of stores.values())for(const [key,res]of store)if(normalize(key,options)===normalize(req,options))return res.clone();return undefined;},
    async keys(){return [...stores.keys()];},async delete(key){return stores.delete(key);}
  };
  const self={location:{origin},registration:{scope},clients:{claim:async()=>{claimed=true;},matchAll:async()=>Array.from({length:windows},(_,id)=>({id:String(id)}))},skipWaiting:async()=>{skipped=true;},addEventListener:(name,fn)=>listeners[name]=fn};
  vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),{self,caches,URL,Response,fetch:network});
  const lifecycle=async name=>{let pending;listeners[name]({waitUntil:p=>pending=p});await pending;};
  const get=async(path,mode='same-origin')=>{let result;listeners.fetch({request:{url:new URL(path,scope).href,method:'GET',mode},respondWith:p=>result=p});return result?await result:undefined;};
  const apply=async()=>{let pending,response;listeners.message({data:{type:'EMBER_APPLY_WAITING'},ports:[{postMessage:message=>response=message}],waitUntil:p=>pending=p});await pending;return response;};
  return {lifecycle,get,caches,offline:()=>online=false,claimed:()=>claimed,windows:n=>windows=n,apply,skipped:()=>skipped};
}
test('the entire precache installs correctly under a repository subdirectory',async()=>{const w=await worker();await w.lifecycle('install');w.offline();const index=await w.get('./');assert.match(await index.text(),/余烬信使/);for(const name of ['app.mjs','core.mjs','render.mjs','audio.mjs','style.css','manifest.webmanifest','icon-512.png'])assert.ok((await w.get(name)).ok,name);});
test('offline asset queries resolve and unrelated URLs are left alone',async()=>{const w=await worker();await w.lifecycle('install');w.offline();assert.match(await(await w.get('core.mjs?release=1')).text(),/createGame/);assert.equal(await w.get('unrelated.json'),undefined);assert.equal(await w.get('https://other.example/core.mjs'),undefined);});
test('activation removes only old game caches and claims the client',async()=>{const w=await worker();await w.caches.open('ember-courier-old');await w.caches.open('another-app');await w.lifecycle('install');await w.lifecycle('activate');const keys=await w.caches.keys();assert.ok(keys.includes('another-app'));assert.equal(keys.includes('ember-courier-old'),false);assert.equal(w.claimed(),true);});

test('waiting service worker never forces other active tabs to switch runtime versions',async()=>{
 const w=await worker();await w.lifecycle('install');
 w.windows(2);assert.deepEqual(await w.apply(),{status:'other-tabs'});assert.equal(w.skipped(),false);
 w.windows(1);assert.deepEqual(await w.apply(),{status:'applying'});assert.equal(w.skipped(),true);
});
