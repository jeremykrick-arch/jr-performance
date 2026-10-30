const CACHE='jr-performance-v6-3-rendered-video';
const ASSETS=['./','./index.html','./style.css','./program.js','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./repdb/front-squat.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{let request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;event.respondWith(fetch(request).then(response=>{if(response.ok){let clone=response.clone();caches.open(CACHE).then(c=>c.put(request,clone))}return response}).catch(()=>caches.match(request).then(x=>x||caches.match('./index.html'))))});
