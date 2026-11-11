const CACHE='ember-courier-v1.13.0-r1';
const FILES=['./world-art.mjs','./world-enemies.webp','./world-bosses.webp','./world-props.webp','./world-residents.webp','./world-gear.webp','./world-decor.webp','./world-grounds-a.webp','./world-grounds-b.webp','./world-title.webp','./world-charms.webp','./art.mjs','./art.css','./skin-courier.webp','./skin-rain.webp','./skin-ember.webp','./weapon-cinder.webp','./weapon-frost.webp','./weapon-orbit.webp','./weapon-thunder.webp','./fx-brush-atlas.webp','./','./index.html','./style.css','./battle.css','./growth.css','./orientation.css','./orientation.mjs','./update.mjs','./growth.mjs','./growth-view.mjs','./narrative.mjs','./core.mjs','./routes.mjs','./expedition.mjs','./endless.mjs','./endless-maps.mjs','./combat.mjs','./draft.mjs','./tactics.mjs','./battlefx.mjs','./content.mjs','./systems.mjs','./progress.mjs','./hub.mjs','./motion.mjs','./render.mjs','./audio.mjs','./feedback.mjs','./app.mjs','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
// New versions wait for every old game tab to close, avoiding mixed runtime modules mid-run.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ember-courier-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
  const shell=new Set(FILES.map(f=>new URL(f,self.registration.scope).pathname));
  if(!shell.has(u.pathname))return;
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||fetch(event.request).then(response=>{
    if(response.ok&&response.type!=='opaque'){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}return response;
  }).catch(()=>event.request.mode==='navigate'?caches.match(new URL('./index.html',self.registration.scope)):Response.error())));
});

// A waiting worker can only be applied when this is the sole window. Never replace modules mid-game in a second tab.
self.addEventListener('message',event=>{
 if(event.data?.type!=='EMBER_APPLY_WAITING')return;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(windows.length!==1){event.ports?.[0]?.postMessage({status:'other-tabs'});return;}
  event.ports?.[0]?.postMessage({status:'applying'});
  await self.skipWaiting();
 })());
});
