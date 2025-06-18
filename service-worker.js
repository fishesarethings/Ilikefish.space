// service-worker.js

const STATIC_CACHE = 'static-v1';

// Manually list every URL you need offline:
const PRECACHE_URLS = [
  '/', '/index.html', '/games.html', '/server.html', '/manifest.json',
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
  '/games/pong/config.json',
  '/games/pong/icon.png',
  '/games/pong/pong.html',
  '/games/pong/pong.css',
  '/games/pong/pong.js',
  '/games/timestable-balloons/config.json',
  '/games/timestable-balloons/icon.png',
  '/games/timestable-balloons/timestable-balloons.html',
  '/games/timestable-balloons/timestable-balloons.css',
  '/games/timestable-balloons/timestable-balloons.js',
  '/games/timestable-balloons/assets/background.jpg',
  '/games/timestable-balloons/assets/balloon.png',
  '/games/timestable-balloons/assets/sounds/bgm.mp3',
  '/games/timestable-balloons/assets/sounds/pop.mp3',
  '/games/timestable-balloons/assets/sounds/wrong.mp3',
  '/games/why-chicken-crossed/config.json',
  '/games/why-chicken-crossed/icon.png',
  '/games/why-chicken-crossed/why-chicken-crossed.html',
  '/games/tetnis/icon.png',
  '/games/tetnis/config.json',
  '/games/tetnis/tetnis.html',
  '/games/chess/icon.png',
  '/games/lawnmower-simulator/background.mp3',
  '/games/lawnmower-simulator/config.json',
  '/games/lawnmower-simulator/grass.png',
  '/games/lawnmower-simulator/icon.png',
  '/games/lawnmower-simulator/lawnmower.html',
  '/games/lawnmower-simulator/mower.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    for (const url of PRECACHE_URLS) {
      try {
        await cache.add(url);
      } catch (err) {
        console.warn('SW install: failed to cache', url, err);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  const req = evt.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (url.origin !== location.origin || req.method !== 'GET') return;

  evt.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(req);
      // Clone BEFORE consuming response
      const responseClone = response.clone();
      if (response.ok) {
        cache.put(req, responseClone);
      }
      return response;
    } catch (err) {
      console.warn('SW fetch failed:', req.url, err);
      // Optionally return a fallback here
      return cached || Response.error();
    }
  })());
});
