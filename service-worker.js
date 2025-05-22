// service-worker.js

// Import precache manifest + Workbox from CDN
importScripts('/precache-manifest.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Precache & route everything in __WB_MANIFEST
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Runtime caching for same-origin navigation and assets
workbox.routing.registerRoute(
  ({request, url}) =>
    request.mode === 'navigate' ||
    url.origin === self.location.origin,
  new workbox.strategies.NetworkFirst({
    cacheName: 'runtime-cache',
  })
);

// Send progress updates back to page
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
