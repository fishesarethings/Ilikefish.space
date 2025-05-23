// service-worker.js
const STATIC_CACHE = 'static-v1';
const RUNTIME_CACHE = 'runtime-v1';

// list your core pages & assets
const CORE_ASSETS = [
  '/', '/index.html', '/games.html', '/server.html',
  '/assets/css/styles.css',
  '/assets/js/typing.js',
  '/assets/js/loco.js',
  '/assets/js/sw-register.js',
  '/assets/js/server.js',
  '/assets/js/fullscreen.js'
];

self.addEventListener('install', evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // 1) cache core assets
    await cache.addAll(CORE_ASSETS);

    // 2) fetch the games folder list
    let idx;
    try {
      idx = await fetch('/games/index.json').then(r => r.json());
    } catch {
      return;
    }

    // 3) for each game, load its config, then cache icon & entry HTML
    for (const slug of idx.folders) {
      try {
        const cfg = await fetch(`/games/${slug}/config.json`).then(r => r.json());
        await cache.add(`/games/${slug}/${cfg.icon}`);
        await cache.add(`/games/${slug}/${cfg.entry}`);
        await cache.add(`/games/${slug}/config.json`);
      } catch (e) {
        console.error('SW: failed to cache game', slug, e);
      }
    }

    self.skipWaiting();
  })());
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (url.origin !== location.origin) return;

  // cache-first for anything we precached
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request).then(net => {
        // runtime cache for new requests
        if (net.ok && !CORE_ASSETS.includes(url.pathname)) {
          caches.open(RUNTIME_CACHE).then(c => c.put(evt.request, net.clone()));
        }
        return net;
      }).catch(() => {
        // you could return a fallback offline page here
      });
    })
  );
});
