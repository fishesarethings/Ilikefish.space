importScripts('/precache-manifest.js');

const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      let done=0, total=self.__WB_MANIFEST.length;
      return Promise.all(self.__WB_MANIFEST.map(url =>
        cache.add(url).then(()=>{
          done++;
          const pct=Math.round(done/total*100);
          self.clients.matchAll().then(clients=>
            clients.forEach(c=>c.postMessage({type:'PRECACHE_PROGRESS',percent:pct}))
          );
        })
      ));
    }).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', evt=>
  evt.waitUntil(self.clients.claim())
);

self.addEventListener('fetch', evt=>{
  const url=new URL(evt.request.url);
  if(url.origin!==location.origin) return;
  evt.respondWith(
    caches.match(evt.request).then(cached=>cached||fetch(evt.request).then(resp=>{
      if(resp.ok){
        caches.open(RUNTIME_CACHE)
          .then(cache=>cache.put(evt.request,resp.clone()));
      }
      return resp;
    }).catch(()=>{}))
  );
});
