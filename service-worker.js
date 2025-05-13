// service-worker.js

const STATIC_CACHE   = 'static-v1';    // for core pages
const RUNTIME_CACHE  = 'runtime-v1';   // for assets & games

// Pages to pre-cache
const CORE_PAGES = [
  '/', 
  '/index.html', 
  '/games.html', 
  '/server.html'
];

// Install: cache core pages
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_PAGES))
      .then(() => self.skipWaiting())
  );
});

// Activate: take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Fetch: respond with cache, then network, and dynamically cache assets & games
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Handle core pages with Cache First
  if (
    url.origin === location.origin &&
    (CORE_PAGES.includes(url.pathname) || url.pathname === '/')
  ) {
    event.respondWith(
      caches.match(request)
        .then(cached => cached || fetch(request))
    );
    return;
  }

  // 2. Handle everything under /assets/ and /games/ with Runtime Cache First
  if (
    url.origin === location.origin &&
    (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/games/'))
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(networkResponse => {
            // Only cache valid responses
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        })
      )
    );
    return;
  }

  // 3. For anything else (e.g. external CDN), just go to network
  event.respondWith(fetch(request));
});
