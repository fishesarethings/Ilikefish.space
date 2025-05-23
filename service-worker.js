// service-worker.js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (!workbox) {
  console.error('Workbox failed to load');
} else {
  // Precache & route everything under /assets/, /games/, + core pages
  workbox.precaching.precacheAndRoute([
    '/', '/index.html', '/games.html', '/server.html',
    // CSS/JS
    '/assets/css/styles.css',
    '/assets/js/typing.js',
    '/assets/js/loco.js',
    '/assets/js/sw-register.js',
    '/assets/js/games-list.js',
    '/assets/js/server.js',
    '/assets/js/fullscreen.js',
    // images
    '/assets/img/bg-home.jpg',
    '/assets/img/bg-games.jpg',
    '/assets/img/bg-server.jpg',
    '/assets/img/ilikefishes.ico',
    // game folders (add your own)
    '/games/pong/config.json','/games/pong/icon.png','/games/pong/pong.html','/games/pong/pong.css','/games/pong/pong.js',
    '/games/timestable-balloons/config.json','/games/timestable-balloons/icon.png',
    '/games/why-chicken-crossed/config.json','/games/why-chicken-crossed/icon.png',
    // …and every other asset you want offline
  ]);

  // Runtime caching for 3rd-party libraries (AOS, loco, Chart.js, etc.)
  workbox.routing.registerRoute(
    ({ url }) => url.origin.startsWith('https://unpkg.com/') || url.origin.startsWith('https://cdn.jsdelivr.net'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'external-resources'
    })
  );

  // Take control of clients ASAP
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();
}
