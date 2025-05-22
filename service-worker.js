// service-worker.js

// 1) Import your precache manifest + Workbox
importScripts('/precache-manifest.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// 2) Precache all URLs in your manifest
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// 3) Runtime caching for navigation & same-origin
workbox.routing.registerRoute(
  ({request, url}) =>
    request.mode === 'navigate' ||
    url.origin === self.location.origin,
  new workbox.strategies.NetworkFirst({
    cacheName: 'runtime-cache',
  })
);

// 4) During install, send progress messages back to clients
self.addEventListener('install', event => {
  const manifest = self.__WB_MANIFEST || [];
  const total = manifest.length;
  let count = 0;

  manifest.forEach(url => {
    caches.open(workbox.core.cacheNames.precache).then(cache =>
      cache.add(url).then(() => {
        count++;
        const percent = Math.round((count / total) * 100);
        self.clients.matchAll().then(clients =>
          clients.forEach(c =>
            c.postMessage({ type: 'PRECACHE_PROGRESS', percent })
          )
        );
      })
    );
  });
});
// service-worker.js

// 1) Import your precache manifest + Workbox
importScripts('/precache-manifest.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// 2) Precache all URLs in your manifest
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// 3) Runtime caching for navigation & same-origin
workbox.routing.registerRoute(
  ({request, url}) =>
    request.mode === 'navigate' ||
    url.origin === self.location.origin,
  new workbox.strategies.NetworkFirst({
    cacheName: 'runtime-cache',
  })
);

// 4) During install, send progress messages back to clients
self.addEventListener('install', event => {
  const manifest = self.__WB_MANIFEST || [];
  const total = manifest.length;
  let count = 0;

  manifest.forEach(url => {
    caches.open(workbox.core.cacheNames.precache).then(cache =>
      cache.add(url).then(() => {
        count++;
        const percent = Math.round((count / total) * 100);
        self.clients.matchAll().then(clients =>
          clients.forEach(c =>
            c.postMessage({ type: 'PRECACHE_PROGRESS', percent })
          )
        );
      })
    );
  });
});
