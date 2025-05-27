// service-worker.js

const STATIC_CACHE = 'static-v1';

// List every file you want offline
const PRECACHE_URLS = [
  '/', '/index.html', '/games.html', '/server.html', '/manifest.json',

  // Core CSS & JS
  '/assets/css/styles.css',
  '/assets/js/typing.js',
  '/assets/js/loco.js',
  '/assets/js/sw-register.js',
  '/assets/js/games-list.js',
  '/assets/js/server.js',
  '/assets/js/fullscreen.js',

  // Background images & icon
  '/assets/img/bg-home.jpg',
  '/assets/img/bg-games.jpg',
  '/assets/img/bg-server.jpg',
  '/assets/img/ilikefishes.ico',

  // Games: Pong
  '/games/pong/config.json',
  '/games/pong/icon.png',
  '/games/pong/pong.html',
  '/games/pong/pong.css',
  '/games/pong/pong.js',

  // Games: Times Table Balloons
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

  // Games: Why Chicken Crossed
  '/games/why-chicken-crossed/config.json',
  '/games/why-chicken-crossed/icon.png',
  '/games/why-chicken-crossed/why-chicken-crossed.html',
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (url.origin !== location.origin || evt.request.method !== 'GET') return;

  evt.respondWith(
    caches.match(evt.request).then(cached =>
      cached ||
      fetch(evt.request).then(res => {
        if (res.ok) {
          caches.open(STATIC_CACHE)
            .then(cache => cache.put(evt.request, res.clone()));
        }
        return res;
      })
    ).catch(() => {
      // optionally return a fallback page here
    })
  );
});
