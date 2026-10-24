const CACHE_VERSION = 'v33';
const ESSENTIALS_CACHE = `essentials-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const LOG_PREFIX = '[sw]';

const ESSENTIALS = [
  '/', '/index.html', '/games/index.html', '/gamepack/index.html', '/offline.html', '/manifest.json',
  '/terms.html', '/privacy.html', '/about.html', '/contact.html',
  '/assets/css/styles.css?v=33', '/assets/css/ads.css?v=33',
  '/assets/js/games-list.js?v=33', '/assets/js/sw-register.js', '/assets/js/version-check.js',
  '/assets/js/typing.js', '/assets/js/loco.js', '/assets/js/ads-config.js?v=33', '/assets/js/ads.js?v=33', '/assets/js/recommendations.js?v=33',
  '/games/index.json', '/games/game_player.html'
];

function log(...a){ try{ console.info(LOG_PREFIX,...a); }catch(e){} }
function warn(...a){ try{ console.warn(LOG_PREFIX,...a); }catch(e){} }

self.addEventListener('install', event => {
  log('install', ESSENTIALS_CACHE);
  event.waitUntil((async () => {
    const cache = await caches.open(ESSENTIALS_CACHE);
    await Promise.allSettled(ESSENTIALS.map(u => cache.add(u).catch(e => warn('precache failed', u, e && e.message))));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  log('activate, claiming clients');
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k !== ESSENTIALS_CACHE && k !== RUNTIME_CACHE) {
        log('deleting old cache', k);
        return caches.delete(k);
      }
      return Promise.resolve();
    }));
  })());
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (event.data.type === 'PREFETCH_ALL') {
    event.waitUntil(prefetchAll().catch(e => warn('prefetch error', e)));
  }
});

async function prefetchAll() {
  log('prefetch all start');
  const cache = await caches.open(RUNTIME_CACHE);
  async function put(url) {
    try {
      const res = await fetch(new Request(url, { cache: 'no-cache' }));
      if (res && res.ok) await cache.put(new Request(url), res.clone());
    } catch (e) { /* ignore */ }
  }
  await put('/games/index.json');
  let index = null;
  try {
    const r = await cache.match('/games/index.json') || await caches.match('/games/index.json');
    if (r) index = await r.json();
  } catch (e) {}
  if (index && Array.isArray(index.folders)) {
    for (const slug of index.folders) {
      const cfgUrl = `/games/${slug}/config.json`;
      await put(cfgUrl);
      let cfg = null;
      try {
        const r = await cache.match(cfgUrl) || await caches.match(cfgUrl);
        if (r) cfg = await r.json();
      } catch (e) {}
      if (cfg) {
        if (cfg.icon) await put(`/games/${slug}/${cfg.icon}`);
        if (cfg.entry) await put(`/games/${slug}/${cfg.entry}`);
      }
    }
  }
  log('prefetch all done');
  const clients = await self.clients.matchAll();
  clients.forEach(c => { try { c.postMessage({ type: 'PREFETCH_DONE' }); } catch (e) {} });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  event.respondWith((async () => {
    const essentials = await caches.open(ESSENTIALS_CACHE);
    const runtime = await caches.open(RUNTIME_CACHE);
    const cached = await runtime.match(req) || await essentials.match(req);

    const networkPromise = fetch(req).then(res => {
      if (res && res.ok) {
        runtime.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);

    if (cached) {
      networkPromise.catch(() => {});
      return cached;
    }
    const res = await networkPromise;
    if (res) return res;
    const fallback = await essentials.match('/offline.html') || await runtime.match('/offline.html');
    return fallback || Response.error();
  })());
});
