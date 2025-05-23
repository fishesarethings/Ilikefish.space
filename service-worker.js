// service-worker.js
const STATIC = 'static-v1';
const RUNTIME = 'runtime-v1';

self.addEventListener('install', evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(STATIC);
    // core pages + assets
    await cache.addAll([
      '/', '/index.html', '/games.html', '/server.html',
      '/assets/css/styles.css',
      '/assets/js/typing.js',
      '/assets/js/loco.js',
      '/assets/js/sw-register.js',
      '/assets/js/games-list.js',
      '/assets/js/server.js',
      '/assets/js/fullscreen.js',
      '/assets/img/bg-home.jpg',
      '/assets/img/bg-games.jpg',
      '/assets/img/bg-server.jpg',
      '/assets/img/ilikefishes.ico',
      '/manifest.json',
      // add any other static you want
    ]);

    // preload every game by reading /games/index.json
    try {
      const resp = await fetch('/games/index.json');
      const { folders } = await resp.json();
      const urls = [];
      for (const slug of folders) {
        urls.push(
          `/games/${slug}/config.json`,
          `/games/${slug}/${slug}.html`,
          `/games/${slug}/${slug}.css`,
          `/games/${slug}/${slug}.js`,
          `/games/${slug}/icon.png`
        );
      }
      await cache.addAll(urls);
    } catch (e) {
      console.warn('Could not precache games:', e);
    }

    self.skipWaiting();
  })());
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  // only handle same-origin
  if (url.origin !== location.origin) return;

  // core: cache-first
  if (['/', '/index.html', '/games.html', '/server.html',
       '/assets/css/styles.css', '/assets/img/ilikefishes.ico'
      ].includes(url.pathname)) {
    evt.respondWith(caches.match(evt.request).then(c => c || fetch(evt.request)));
    return;
  }

  // everything under /assets/ or /games/: network-first, fallback to cache
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/games/')) {
    evt.respondWith((async () => {
      try {
        const res = await fetch(evt.request);
        if (res.ok) {
          const cache = await caches.open(RUNTIME);
          cache.put(evt.request, res.clone());
        }
        return res;
      } catch {
        return caches.match(evt.request);
      }
    })());
    return;
  }

  // default network
  evt.respondWith(fetch(evt.request));
});
