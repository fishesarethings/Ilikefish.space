// sw-register.js
// Full replacement: registers /service-worker.js and performs automatic
// offline precache-check + missing-file download + creates offline.html
// Emits `window` CustomEvent 'sw:cache-status' with { cached, downloaded, failed }.
// Stores last status to localStorage.sw_cache_status

(function () {
  'use strict';

  const LOG_PREFIX = '[sw-register]';
  // ---- IMPORTANT: keep this list in sync with your service-worker.js PRECACHE_URLS ----
  // Copied from your service-worker.js (minor fix: removed stray comma in icon filename)
  const PRECACHE_URLS = [
    '/', '/index.html', '/games.html', '/gamepack.html', '/manifest.json', '/terms.html', '/games/game_player.html',
    '/assets/css/styles.css',
    '/assets/js/typing.js',
    '/assets/js/loco.js',
    '/assets/js/sw-register.js',
    '/assets/js/games-list.js',
    '/assets/js/fullscreen.js',
    '/assets/img/bg-home.jpg',
    '/assets/img/bg-games.jpg',
    '/assets/img/bg-gamepack.jpg',
    '/assets/img/ilikefishes.ico',
    '/assets/img/ilikefish.space-500px.ico',
    '/assets/img/ilikefish.space-icon-16.png',
    '/assets/img/ilikefish.space-icon-32.png',
    '/assets/img/ilikefish.space-icon-180.png',
    '/assets/img/screenshot/1.jpg',
    '/assets/img/screenshot/2.jpg',
    '/assets/img/screenshot/3.jpg',
    '/assets/img/screenshot/4.jpg',
    '/assets/img/screenshot/5.jpg',
    '/assets/img/screenshot/6.jpg',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',

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
    '/games/rotaze/icon1.png',
    '/games/rotaze/config.json',

    '/games/Tower-Defense/config.json',
    '/games/Tower-Defense/icon.png',
    '/games/Tower-Defense/icon1.png',
    '/games/Tower-Defense/Tower-defense.html',

    '/games/DiceRollIdleEmpires2/config.json',
    '/games/DiceRollIdleEmpires2/DiceRollIdleEmpires2.html',
    '/games/DiceRollIdleEmpires2/icon.png',
    '/games/DiceRollIdleEmpires2/icon1.png',

    '/games/fishclimbracing/config.json',
    '/games/fishclimbracing/fishclimbracing.html',
    '/games/fishclimbracing/icon1.png',
    '/games/fishclimbracing/icon.png',

    '/games/minetycoon/config.json',
    '/games/minetycoon/icon.png',
    '/games/minetycoon/minetycoon.html',

    '/games/emojimatch/config.json',
    '/games/emojimatch/emojimatch.html',
    '/games/emojimatch/icon.png',
    '/games/emojimatch/icon1.png',

    '/games/fishyclicker/config.json',
    '/games/fishyclicker/fishyclicker.html',
    '/games/fishyclicker/fishyclicker.png',

    '/games/fishcore/config.json',
    '/games/fishcore/fishcore.html',
    '/games/fishcore/fishcore.png',

    '/games/fishytycoon/config.json',
    '/games/fishtycoon/fishtycoon.html',
    '/games/fishtycoon/fishtycoon.png'
  ];

  // Name of the offline page the SW expects. We'll generate it dynamically and put it in cache.
  const OFFLINE_PAGE = '/offline.html';

  // helper logger
  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }
  function warn(...args) {
    console.warn(LOG_PREFIX, ...args);
  }
  function error(...args) {
    console.error(LOG_PREFIX, ...args);
  }

  // Register the service worker and wire up standard lifecycle events.
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      warn('Service Worker not supported in this browser.');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      log('ServiceWorker registered:', registration);

      // Listen for updates found
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        log('updatefound. state=', newWorker && newWorker.state);
        newWorker && newWorker.addEventListener('statechange', () => {
          log('installing worker state changed ->', newWorker.state);
          if (newWorker.state === 'installed') {
            // when a new SW is installed, but old one still controls, registration.waiting is set
            if (navigator.serviceWorker.controller) {
              // New update available
              log('New service worker is waiting (update available).');
              dispatchUpdateAvailable();
            } else {
              log('Service worker installed for the first time (no previous controller).');
            }
          }
        });
      });

      // Listen for the active controller changing (skipWaiting accepted + activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        log('controllerchange event — a new service worker has taken control.');
        // You may choose to reload the page here if desired:
        // window.location.reload();
      });

      // wire up messages from SW
      navigator.serviceWorker.addEventListener('message', (ev) => {
        // generic logging for messages from SW
        log('Message from SW:', ev.data);
      });

      return registration;
    } catch (e) {
      error('Service worker registration failed', e);
      return null;
    }
  }

  function dispatchUpdateAvailable() {
    // Dispatch an event the page can listen for to show an "Update available" UI
    window.dispatchEvent(new CustomEvent('sw:update-available', { detail: {} }));
  }

  // Posts a SKIP_WAITING message to the service worker (if waiting)
  async function skipWaiting() {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      if (reg.waiting) {
        log('Posting SKIP_WAITING to waiting worker');
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }
      return false;
    } catch (e) {
      warn('skipWaiting failed', e);
      return false;
    }
  }

  // Determine best static cache name. Prefer the most-recent key that starts with "static-".
  async function locateStaticCacheName() {
    try {
      const keys = await caches.keys();
      const staticKeys = keys.filter(k => k.startsWith('static-'));
      if (staticKeys.length === 0) {
        // fallback: use any cache (first) or null
        return keys.length ? keys[0] : null;
      }
      // sort lexicographically and return the last (highest) — assumes vN increases lexically
      staticKeys.sort();
      return staticKeys[staticKeys.length - 1];
    } catch (e) {
      warn('locateStaticCacheName failed', e);
      return null;
    }
  }

  // Build list of unique game folders from PRECACHE_URLS.
  function getGameFoldersFromPrecache() {
    const folders = new Set();
    PRECACHE_URLS.forEach(u => {
      // match /games/<folder>/
      const m = u.match(/^\/games\/([^\/]+)\//);
      if (m && m[1]) folders.add(m[1]);
    });
    return Array.from(folders);
  }

  // Create a simple offline HTML page that shows status (cached/downloaded/failed)
  function makeOfflineHtml(status) {
    // Keep it simple and inline the JSON and a bit of styling.
    const json = JSON.stringify(status, null, 2);
    const now = new Date().toISOString();
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline status — ilikefish.space</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:16px; background:#0b1220; color:#e6eef8}
  h1{font-size:20px;margin:0 0 8px}
  .summary{margin-bottom:12px; font-size:14px; opacity:0.9}
  pre{background:#071026;padding:12px;border-radius:8px;overflow:auto}
  .list{display:flex;gap:12px;flex-wrap:wrap}
  .box{background:#061024;padding:8px;border-radius:8px;min-width:220px}
  a{color: #8fd3ff}
</style>
</head>
<body>
  <h1>Offline cache status</h1>
  <div class="summary">Generated: ${now}. This page is stored in the service worker cache and will be shown when offline.</div>

  <div class="list">
    <div class="box"><strong>Cached (${status.cached.length})</strong><pre>${status.cached.slice(0,200).join("\n")}</pre></div>
    <div class="box"><strong>Downloaded now (${status.downloaded.length})</strong><pre>${status.downloaded.slice(0,200).join("\n")}</pre></div>
    <div class="box"><strong>Failed (${status.failed.length})</strong><pre>${status.failed.slice(0,200).join("\n")}</pre></div>
  </div>

  <h2>Full JSON</h2>
  <pre>${json}</pre>

  <p><a href="/">Go to site</a> · <a href="#" id="refreshBtn">Try re-download missing</a></p>

  <script>
    document.getElementById('refreshBtn').addEventListener('click', function(ev){
      ev.preventDefault();
      try {
        // trigger a fetch to the root; and ask the page to attempt re-download via postMessage
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'ATTEMPT_REDOWNLOAD' });
        }
        alert('Re-download requested (if supported). Reload the page after a short while.');
      } catch(e) {}
    });
  </script>
</body>
</html>`;
  }

  // Main function: check cache, try to fetch and fill missing files, also cache new game_player URLs.
  async function checkAndFillCache() {
    try {
      const cacheName = await locateStaticCacheName();
      const chosenCacheName = cacheName || ('static-v3');
      log('Using cache:', chosenCacheName);

      const cache = await caches.open(chosenCacheName);

      const cached = [];
      const toDownload = [];
      const downloaded = [];
      const failed = [];

      // Step 1: check what's in the cache already (by exact request)
      for (const url of PRECACHE_URLS) {
        try {
          const req = new Request(url, { cache: 'no-cache', mode: 'same-origin' });
          const match = await cache.match(req);
          if (match) {
            cached.push(url);
          } else {
            toDownload.push(url);
          }
        } catch (e) {
          warn('cache.match failed for', url, e);
          toDownload.push(url);
        }
      }

      // Step 2: For each unique game folder, add the new format `/games/game_player.html?folder=NAME`
      const folders = getGameFoldersFromPrecache();
      const newFormatUrls = folders.map(f => `/games/game_player.html?folder=${encodeURIComponent(f)}`);
      for (const nf of newFormatUrls) {
        try {
          const req = new Request(nf, { cache: 'no-cache', mode: 'same-origin' });
          const match = await cache.match(req);
          if (match) {
            cached.push(nf);
          } else {
            toDownload.push(nf);
          }
        } catch (e) {
          toDownload.push(nf);
        }
      }

      // Step 3: Try to download everything in toDownload, but do not block if network unavailable
      // We perform downloads in sequence to avoid hammering the server, but Promise.allSettled would be fine too.
      for (const url of toDownload) {
        try {
          log('Attempting fetch:', url);
          const resp = await fetch(url, { cache: 'no-cache', credentials: 'same-origin', mode: 'same-origin' });
          if (resp && resp.ok) {
            try {
              // Clone before putting
              await cache.put(url, resp.clone());
              downloaded.push(url);
              log('Cached:', url);
            } catch (putErr) {
              warn('cache.put failed for', url, putErr);
              // Even if put fails, we still consider fetch ok (but report it didn't get stored)
              failed.push(url);
            }
          } else {
            warn('fetch returned not-ok for', url, resp && resp.status);
            failed.push(url);
          }
        } catch (fetchErr) {
          warn('fetch failed for', url, fetchErr && fetchErr.message);
          failed.push(url);
        }
      }

      // Build final status
      const status = {
        timestamp: new Date().toISOString(),
        cacheName: chosenCacheName,
        cached: cached.sort(),
        downloaded: downloaded.sort(),
        failed: failed.sort()
      };

      // Step 4: Construct offline page and store it at /offline.html (so SW can serve it)
      try {
        const offlineHtml = makeOfflineHtml(status);
        await cache.put(OFFLINE_PAGE, new Response(offlineHtml, { headers: { 'Content-Type': 'text/html' } }));
        log('Generated and cached offline page at', OFFLINE_PAGE);
      } catch (e) {
        warn('Failed to write offline page to cache', e);
      }

      // Dispatch a custom event with the status so the UI can respond
      try {
        window.dispatchEvent(new CustomEvent('sw:cache-status', { detail: status }));
        localStorage.setItem('sw_cache_status', JSON.stringify(status));
      } catch (e) {
        warn('Failed to dispatch sw:cache-status', e);
      }

      return status;
    } catch (e) {
      error('checkAndFillCache failed', e);
      return null;
    }
  }

  // Listen for messages posted from our offline page ("ATTEMPT_REDOWNLOAD")
  function setupMessageListener() {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener('message', (ev) => {
      try {
        const data = ev.data || {};
        if (data && data.type === 'ATTEMPT_REDOWNLOAD') {
          // attempt redownload once
          log('Message from SW: ATTEMPT_REDOWNLOAD -> re-run checkAndFillCache');
          checkAndFillCache();
        }
      } catch (e) { warn('message handler error', e); }
    });
  }

  // Install-time helper: if a new registration is found and user wants to activate it immediately,
  // call skipWaiting() which will send message to SW to skip waiting.
  // We'll expose skipWaiting globally for UI to call it.
  window.__swRegister = {
    skipWaiting: skipWaiting,
    recheckCache: checkAndFillCache
  };

  // Run registration and caching flow immediately (non-blocking)
  (async () => {
    try {
      const reg = await registerServiceWorker();
      setupMessageListener();

      // Once the page is controlled by a service worker (or after the SW installs), run the cache check/fill.
      // If there's already a controller, run right away; otherwise wait for controllerchange.
      if (navigator.serviceWorker.controller) {
        log('Page already controlled by SW -> running cache fill check.');
        await checkAndFillCache();
      } else {
        // wait up to ~10s for controller to appear then run check; otherwise still run after timeout
        let controllerPromise = new Promise(resolve => {
          let resolved = false;
          const onController = () => {
            if (!resolved) {
              resolved = true;
              navigator.serviceWorker.removeEventListener('controllerchange', onController);
              resolve(true);
            }
          };
          navigator.serviceWorker.addEventListener('controllerchange', onController);
          // safety timeout
          setTimeout(() => { if (!resolved) resolve(false); }, 10000);
        });
        const became = await controllerPromise;
        log('controller appeared?', became);
        await checkAndFillCache();
      }

      // If registration.waiting exists now, let the page know an update is ready
      if (reg && reg.waiting) {
        dispatchUpdateAvailable();
      }
    } catch (e) {
      warn('sw-register main flow error', e);
    }
  })();

  // Convenience: expose a small API on window so other scripts can listen/control
  // - window.addEventListener('sw:cache-status', e => { ... })
  // - window.__swRegister.skipWaiting()  -> attempts to activate waiting SW
  // - window.__swRegister.recheckCache() -> re-runs the cache download attempt

})();
