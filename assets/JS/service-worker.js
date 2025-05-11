const CACHE = 'fish-site-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/games.html',
  '/server.html',
  '/assets/css/styles.css',
  '/assets/js/loco.js',
  '/assets/js/typing.js',
  '/assets/js/sw-register.js',
  '/assets/js/server.js',
  '/assets/js/games-list.js',
  '/manifest.json'
  // plus each game folder & its assets
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
