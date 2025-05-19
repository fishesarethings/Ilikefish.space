const CACHE_NAME = 'static-v1';
// During install, cache core pages
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        '/', '/index.html', '/games.html', '/server.html'
      ]))
      .then(() => self.skipWaiting())
  );
});

// Activate immediately
self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

// On fetch, serve from cache first for core pages, then network(→cache) for everything else
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // Core pages: cache‐first
  if (url.origin === location.origin &&
      ['/', '/index.html', '/games.html', '/server.html'].includes(url.pathname)) {
    evt.respondWith(
      caches.match(evt.request).then(c => c || fetch(evt.request))
    );
    return;
  }

  // Everything else (assets, games): network‐first then cache
  evt.respondWith(
    fetch(evt.request)
      .then(resp => {
        if (resp.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(evt.request, resp.clone()));
        }
        return resp;
      })
      .catch(() => caches.match(evt.request))
  );
});
