importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');
importScripts('/precache-manifest.js');

// Precache & route everything in the manifest
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// Runtime: Cache-first for navigation, fallback to cache for assets
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({ cacheName: 'pages' })
);
workbox.routing.registerRoute(
  ({ request }) => ['style','script','image'].includes(request.destination),
  new workbox.strategies.CacheFirst({ cacheName: 'assets' })
);
