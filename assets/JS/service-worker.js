const CACHE='fish-site-v2';
const ASSETS=[
  '/', '/index.html','/games.html','/server.html',
  '/assets/css/styles.css','/assets/js/typing.js','/assets/js/loco.js',
  '/assets/js/games-list.js','/assets/js/sw-register.js','/assets/js/service-worker.js',
  '/assets/js/server.js','/assets/js/fullscreen.js','/manifest.json'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
