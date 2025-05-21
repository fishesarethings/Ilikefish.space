// Import the precache manifest (auto-generated)
importScripts('/precache-manifest.js');

const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';

self.addEventListener('install', evt => {
  const total = self.__WB_MANIFEST.length;
  let count = 0;

  evt.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache =>
        Promise.all(self.__WB_MANIFEST.map(url =>
          cache.add(url).then(() => {
            count++;
            const percent = Math.round((count / total) * 100);
            self.clients.matchAll().then(clients =>
              clients.forEach(c => c.postMessage({ type: 'PRECACHE_PROGRESS', percent }))
            );
          })
        ))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (url.origin !== location.origin) {
    // Let 3rd-party requests pass through
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;

      return fetch(evt.request)
        .then(resp => {
          if (resp.ok) {
            return caches.open(RUNTIME_CACHE)
              .then(cache => {
                cache.put(evt.request, resp.clone());
                return resp;
              });
          }
          return resp;
        })
        .catch(() => {
          // Optional: return offline.html on nav failures
          if (evt.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
    })
  );
});
