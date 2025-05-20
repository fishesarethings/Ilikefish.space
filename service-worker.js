// service-worker.js

// 1. Import the manifest you already generate (self.__WB_MANIFEST is an array of all your URLs)
importScripts('/precache-manifest.js');

const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';

// 2. Install: precache all files in __WB_MANIFEST
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(self.__WB_MANIFEST))
      .then(() => self.skipWaiting())
  );
});

// 3. Activate: take control immediately
self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

// 4. Fetch:
//    - First try cache (precache) for anything we precached.
//    - Otherwise network‐first, falling back to cache if offline.
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // Only handle same-origin requests here; leave third-party alone.
  if (url.origin !== location.origin) {
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) {
        // If we precached it, serve from cache.
        return cached;
      }

      // Otherwise, try network and cache the result.
      return fetch(evt.request)
        .then(resp => {
          if (resp.ok) {
            return caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(evt.request, resp.clone());
              return resp;
            });
          }
          return resp;
        })
        .catch(() => {
          // Optional: serve a default offline page for navigation requests
          if (evt.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
    })
  );
});
