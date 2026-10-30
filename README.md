const CACHE='jr-performance-v5-3-3-silver-nav-avatar-20261030';
const ASSETS=['./','./index.html','./style.css','./program.js','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{let request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;event.respondWith(fetch(request).then(response=>{if(response.ok){let clone=response.clone();caches.open(CACHE).then(c=>c.put(request,clone))}return response}).catch(()=>caches.match(request).then(x=>x||caches.match('./index.html'))))});


## Version 5.3.3
- Silver bottom navigation (light silver background, dark inactive buttons, dark active pill with white text).
- Profile photo / initials shown in the header on every page; tapping opens Profile.
- Header name reflects editable athlete display name.
- Cache bumped; same local storage key and workout data.

Version 5.3.4: Profile Save button and prominent Add Height or Weight action on the athlete profile. Fields auto-save on change.
