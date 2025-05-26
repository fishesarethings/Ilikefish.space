// service-worker.js

const STATIC_CACHE = 'static-v1';

self.addEventListener('install', evt => {
  evt.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const toCache = new Set([
      '/', '/index.html', '/games.html', '/server.html', '/manifest.json'
    ]);

    // helper: fetch & scrape an HTML page for local src/href
    async function fetchAndScrape(path) {
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        // grab src="..." and href="..."
        for (const [, u] of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
          try {
            const url = new URL(u, location);
            if (url.origin === location.origin) toCache.add(url.pathname);
          } catch {}
        }
      } catch (e) {
        console.warn('SW install: failed to fetch/scrape', path, e);
      }
    }

    // 1) crawl main pages
    await Promise.all([
      fetchAndScrape('/index.html'),
      fetchAndScrape('/games.html'),
      fetchAndScrape('/server.html'),
    ]);

    // 2) crawl games list + each game entry
    try {
      const idx = await fetch('/games/index.json').then(r => r.json());
      for (const slug of idx.folders || []) {
        const cfgPath = `/games/${slug}/config.json`;
        try {
          const cfg = await fetch(cfgPath).then(r => r.json());
          toCache.add(cfgPath);
          const entry = `/games/${slug}/${cfg.entry}`;
          const icon  = `/games/${slug}/${cfg.icon}`;
          toCache.add(entry);
          toCache.add(icon);
          await fetchAndScrape(entry);
        } catch (e) {
          console.warn('SW install: failed game', slug, e);
        }
      }
    } catch (e) {
      console.warn('SW install: failed to load /games/index.json', e);
    }

    // 3) actually cache everything, one by one, reporting progress
    const urls = Array.from(toCache);
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        await cache.add(url);
      } catch (e) {
        console.warn('SW install: cache failed', url, e);
      }
      // post progress to all clients
      const pct = Math.round((i+1) / urls.length * 100);
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({ type: 'PRECACHE_PROGRESS', percent: pct });
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  // only handle same-origin GETs
  if (url.origin !== location.origin || evt.request.method !== 'GET') return;

  evt.respondWith(
    caches.match(evt.request).then(cached =>
      cached ||
      fetch(evt.request).then(res => {
        // put new things into cache for next time
        if (res.ok) {
          caches.open(STATIC_CACHE).then(cache => cache.put(evt.request, res.clone()));
        }
        return res;
      })
    ).catch(() =>
      // optional: return a fallback (e.g. offline page) if you like
      null
    )
  );
});
