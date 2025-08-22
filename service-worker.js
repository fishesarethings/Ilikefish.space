// service-worker.js
// Drop this file at the site root: /service-worker.js
// IMPORTANT: bump CACHE_VERSION on each deploy to force cache refresh (see notes below).

const CACHE_VERSION = 'v2';               // <-- BUMP THIS on deploy (e.g. v3, v4) to invalidate old caches
const CACHE_NAME = `static-${CACHE_VERSION}`;
const LOG_PREFIX = '[sw]';

// --- Precache list (normalize all to absolute paths) ---
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

  // Games (ensure you add any new game files here when deploying)
  '/games/pong/config.json',
  '/games/pong/icon.png',
  '/games/pong/pong.html',

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
  '/games/lawnmower-simulator/mower.png',

  '/games/Block-bang/block-bang.html',
  '/games/Block-bang/config.json',
  '/games/Block-bang/explosion.mp4',
  '/games/Block-bang/icon.png',

  '/games/DiceRollIdleEmpires/config.json',
  '/games/DiceRollIdleEmpires/DiceRollIdleEmpires.html',
  '/games/DiceRollIdleEmpires/icon.png',
  '/games/DiceRollIdleEmpires/icon1.png',

  '/games/gridbite/config.json',
  '/games/gridbite/gridbite.html',
  '/games/gridbite/icon.png',
  '/games/gridbite/icon1.png',
  '/games/gridbite/music.mp3',

  '/games/rotaze/rotaze.html',
  '/games/rotaze/icon.png',
  '/games/rotaze/icon1.png'
];

// --- helper logs ---
function log(...args) {
  try { console.info(LOG_PREFIX, ...args); } catch (e) {}
}
function warn(...args) {
  try { console.warn(LOG_PREFIX, ...args); } catch (e) {}
}
function err(...args) {
  try { console.error(LOG_PREFIX, ...args); } catch (e) {}
}

// --- Install: open cache and precache assets (best-effort) ---
self.addEventListener('install', event => {
  log('install event, cache=', CACHE_NAME);
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Use Promise.allSettled so one bad file doesn't fail the whole install
    const settle = await Promise.allSettled(
      PRECACHE_URLS.map(u => {
        // add with cache-bypass request option to try to avoid intermediate caches
        const req = new Request(u, { cache: 'no-cache', mode: 'same-origin' });
        return cache.add(req).catch(err => {
          warn('precaching failed for', u, err && err.message);
          // swallow error; we still resolve for allSettled
        });
      })
    );
    // finished install, but DO NOT call skipWaiting() automatically — let the page trigger skipWaiting
    log('install precache result: ', settle.map(s => s.status).slice(0, 6), '...total=', settle.length);
  })());
});

// --- Activate: claim clients and remove old caches ---
self.addEventListener('activate', event => {
  log('activate event, claiming clients and cleaning old caches');
  event.waitUntil((async () => {
    // claim clients immediately so controllerchange fires once activated (clients.claim() used)
    await self.clients.claim();

    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k !== CACHE_NAME) {
        log('deleting old cache', k);
        return caches.delete(k);
      }
      return Promise.resolve();
    }));
    log('activate: cache cleanup complete. current cache=', CACHE_NAME);
  })());
});

// --- Listen for page message to skipWaiting (version-check uses this) ---
self.addEventListener('message', event => {
  if (!event.data) return;
  try {
    if (event.data.type === 'SKIP_WAITING') {
      log('message SKIP_WAITING received -> calling skipWaiting()');
      self.skipWaiting();
    }
    // you could support other diagnostic messages here
  } catch (e) { warn('message handler error', e); }
});

// --- Fetch handler: cache-first, then network (and cache new responses) ---
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (req.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // try cache first
    const cached = await cache.match(req);
    if (cached) return cached;

    // fallback to network
    try {
      const networkResp = await fetch(req);
      // put a clone into cache if ok
      if (networkResp && networkResp.ok) {
        try { await cache.put(req, networkResp.clone()); } catch (e) { warn('cache.put failed', req.url, e); }
      }
      return networkResp;
    } catch (e) {
      warn('fetch failed for', req.url, e && e.message);
      // final fallback: try to return a cached fallback or a simple error response
      const fallback = await cache.match('/offline.html'); // optional if you add offline page
      return fallback || Response.error();
    }
  })());
});
