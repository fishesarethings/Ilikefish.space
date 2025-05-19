// service-worker.js
const STATIC_CACHE   = 'static-v2';    // bump version to force-refresh
const RUNTIME_CACHE  = 'runtime-v1';

const CORE_PAGES = [
  '/', '/index.html', '/games.html', '/server.html'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_PAGES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // Core pages: Cache First
  if (url.origin === location.origin &&
      (CORE_PAGES.includes(url.pathname) || url.pathname === '/')) {
    evt.respondWith(caches.match(evt.request).then(c => c || fetch(evt.request)));
    return;
  }

  // Assets & games: Runtime Cache First
  if (url.origin === location.origin &&
      (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/games/'))) {
    evt.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(evt.request).then(cached => {
          if (cached) return cached;
          return fetch(evt.request).then(net => {
            if (net.ok) cache.put(evt.request, net.clone());
            return net;
          });
        })
      )
    );
    return;
  }

  // Fallback: network
  evt.respondWith(fetch(evt.request));
});
