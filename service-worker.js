// service-worker.js

// bring in your precache manifest (generated at build time)
importScripts('/precache-manifest.js');
// bring in Workbox runtime
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const { precaching, routing, strategies } = workbox;

// 1) precache everything in __WB_MANIFEST
precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// 2) send progress updates during install
self.addEventListener('install', event => {
  const manifest = self.__WB_MANIFEST || [];
  const total = manifest.length;
  let count = 0;

  event.waitUntil(
    Promise.all(
      manifest.map(url =>
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
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// 3) network-first for all same-origin navigation & assets not precached
routing.registerRoute(
  ({request, url}) =>
    url.origin === self.location.origin,
  new strategies.NetworkFirst({
    cacheName: 'runtime-cache',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 200 })]
  })
);
