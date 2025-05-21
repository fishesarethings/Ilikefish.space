importScripts('/precache-manifest.js');

const STATIC_CACHE  = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';

// Install: precache all your files, and post progress to clients
self.addEventListener('install', evt => {
  const total = self.__WB_MANIFEST.length;
  let count = 0;
  evt.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache =>
        Promise.all(
          self.__WB_MANIFEST.map(url =>
            cache.add(url).then(()=>{
              count++;
              const pct = Math.round((count/total)*100);
              self.clients.matchAll().then(clients=>
                clients.forEach(c=>c.postMessage({type:'PRECACHE_PROGRESS',percent:pct}))
              );
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', evt =>
  evt.waitUntil(self.clients.claim())
);

// Fetch: cache-first for precached, otherwise network-first
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (url.origin !== location.origin) return;

  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request)
        .then(resp => {
          if (resp.ok) {
            return caches.open(RUNTIME_CACHE).then(cache=>{
              cache.put(evt.request, resp.clone());
              return resp;
            });
          }
          return resp;
        })
        .catch(()=>{
          if (evt.request.mode==='navigate')
            return caches.match('/offline.html');
        });
    })
  );
});
