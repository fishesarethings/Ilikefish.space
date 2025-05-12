const CACHE = 'fish-site-v1';
const ASSETS = [
  '/', '/index.html','/games.html','/server.html',
  '/assets/css/styles.css','/assets/js/typing.js','/assets/js/loco.js',
  '/assets/js/games-list.js','/assets/js/server.js','/assets/js/fullscreen.js',
  '/manifest.json','/CNAME',
  '/assets/img/bg-home.jpg','/assets/img/bg-games.jpg','/assets/img/bg-server.jpg',
  '/assets/img/example-game-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));  <!-- :contentReference[oaicite:9]{index=9} -->
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
