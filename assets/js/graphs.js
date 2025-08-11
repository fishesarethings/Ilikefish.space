// assets/js/graphs.js
// Uses mcstatus.io to fetch real server status (players online & max) and keeps a local
// time-series in localStorage for graphing. Falls back to bounded generator if needed.
//
// - Reads server from #address and #port elements on the page.
// - Exposes: window.initActivityChart(canvasId, defaultRangeMs)
//            window.updateActivityChart(rangeMs)
// - Default behavior: poll mcstatus once per minute and append snapshots to localStorage.

(function () {
  if (window.__ILF_GRAPHS_LOADED) return;
  window.__ILF_GRAPHS_LOADED = true;

  // CONFIG
  const MCSTATUS_BASE = 'https://api.mcstatus.io/v2/status/java/'; // mcstatus status endpoint (Java)
  const POLL_MS = 60 * 1000;          // default polling interval (60s) to respect rate limits
  const STORAGE_PREFIX = 'ilf_mc_metrics_';
  const MAX_POINTS_STORED = 24 * 60;  // keep up to 24h of minute-granularity points (changeable)
  const DEFAULT_MAX_PLAYERS = 20;     // fallback clamp if mcstatus doesn't return 'max'
  const DEFAULT_POINTS = 48;
  const MIN_POINTS = 12;
  const MAX_POINTS = 240;
  const FETCH_TIMEOUT_MS = 4000;

  // internal state
  let chart = null;
  let canvasId = null;
  let isUpdating = false;
  let pollIntervalHandle = null;

  // Helper: safe fetch with timeout
  function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
    return Promise.race([
      fetch(url, opts),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
    ]);
  }

  // Compose server address from DOM (index & server pages have #address and #port)
  function getServerAddressFromDOM() {
    try {
      const host = (document.getElementById('address')?.textContent || '').trim() || 'mc.ilikefish.space';
      const port = (document.getElementById('port')?.textContent || '').trim();
      if (!host) return 'mc.ilikefish.space';
      // If port is present and not default 25565, include it
      if (port && port !== '25565' && port !== '') return `${host}:${port}`;
      return host;
    } catch (e) {
      return 'mc.ilikefish.space';
    }
  }

  // Local storage helpers
  function storageKeyFor(serverAddress) {
    return STORAGE_PREFIX + encodeURIComponent(serverAddress);
  }

  function loadSeries(serverAddress) {
    try {
      const raw = localStorage.getItem(storageKeyFor(serverAddress));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch (e) {
      console.warn('loadSeries parse error', e);
      return [];
    }
  }

  function saveSeries(serverAddress, arr) {
    try {
      localStorage.setItem(storageKeyFor(serverAddress), JSON.stringify(arr.slice(-MAX_POINTS_STORED)));
    } catch (e) {
      console.warn('saveSeries failed', e);
    }
  }

  // Append a new point (timestamp in ms, value number). Avoid duplicates (same minute).
  function appendPoint(serverAddress, timestamp, value) {
    const arr = loadSeries(serverAddress);
    const minuteKey = Math.floor(timestamp / 60000); // minute bucket
    if (arr.length) {
      const last = arr[arr.length - 1];
      const lastMinute = Math.floor((last.timestamp || last.t || 0) / 60000);
      if (lastMinute === minuteKey) {
        // replace last value (same minute) to keep series consistent
        arr[arr.length - 1] = { timestamp, value };
        saveSeries(serverAddress, arr);
        return;
      }
    }
    arr.push({ timestamp, value });
    saveSeries(serverAddress, arr);
  }

  // Build chart payload (labels/data) from stored series limited to 'points'
  function payloadFromSeries(serverAddress, points) {
    const series = loadSeries(serverAddress);
    const arr = series.slice(-points);
    const labels = arr.map(pt => {
      const d = new Date(pt.timestamp || Date.now());
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    const data = arr.map(pt => Number(pt.value || 0));
    return { labels, data, usedReal: true };
  }

  // Fallback bounded generator (safe, no large spikes)
  function fallbackGenerator(rangeMs, points = DEFAULT_POINTS, maxPlayers = DEFAULT_MAX_PLAYERS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));
    const now = Date.now();
    const labels = new Array(points);
    const data = new Array(points);
    let base = Math.round(maxPlayers * 0.25 + Math.random() * maxPlayers * 0.25);
    let momentum = 0;
    const momentumFactor = 0.6;
    const maxStep = Math.max(1, Math.round(maxPlayers * 0.12));
    for (let i = 0; i < points; i++) {
      const t = now - rangeMs + Math.round((i / Math.max(1, points - 1)) * rangeMs);
      const dt = new Date(t);
      labels[i] = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      const rnd = (Math.random() - 0.5) * (maxPlayers * 0.3);
      momentum = momentum * momentumFactor + rnd * (1 - momentumFactor);
      let cand = Math.round(base + momentum);
      const step = Math.max(-maxStep, Math.min(maxStep, cand - base));
      base = Math.max(0, Math.min(maxPlayers, base + step));
      data[i] = Math.max(0, Math.min(maxPlayers, Math.round(base)));
    }
    return { labels, data, usedReal: false };
  }

  // Fetch mcstatus for the server address and return {online, playersOnline, playersMax, retrieved_at}
  async function fetchMcStatus(serverAddress) {
    const url = MCSTATUS_BASE + encodeURIComponent(serverAddress);
    const resp = await fetchWithTimeout(url, { cache: 'no-store' }, FETCH_TIMEOUT_MS);
    if (!resp.ok) throw new Error('mcstatus fetch failed: ' + resp.status);
    const json = await resp.json();
    // expected fields per docs: json.players.online, json.players.max, json.retrieved_at
    const players = (json && json.players) || {};
    return {
      online: Boolean(json && json.online),
      playersOnline: Number(players.online ?? 0),
      playersMax: Number(players.max ?? DEFAULT_MAX_PLAYERS),
      retrievedAt: Number(json.retrieved_at ?? Date.now())
    };
  }

  // Build the chart (initialize Chart.js)
  async function initActivityChart(canvasElemId, defaultRangeMs = 86400000, points = DEFAULT_POINTS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));
    const canvas = document.getElementById(canvasElemId);
    if (!canvas) throw new Error('Canvas not found: ' + canvasElemId);
    canvasId = canvasElemId;
    const ctx = canvas.getContext('2d');

    // Try: load stored series first. If empty, attempt a mcstatus call to seed one.
    const serverAddress = getServerAddressFromDOM();
    let payload = null;

    const stored = loadSeries(serverAddress);
    if (stored && stored.length >= Math.min(6, points)) {
      // we have stored history, use it
      payload = payloadFromSeries(serverAddress, points);
    } else {
      // attempt to fetch mcstatus once to seed and then use stored/fallback
      try {
        const status = await fetchMcStatus(serverAddress);
        // clamp to max
        const maxPlayers = Math.max(1, status.playersMax || DEFAULT_MAX_PLAYERS);
        const val = Math.max(0, Math.min(maxPlayers, Math.round(status.playersOnline || 0)));
        appendPoint(serverAddress, status.retrievedAt || Date.now(), val);
        payload = payloadFromSeries(serverAddress, points);
      } catch (e) {
        // fallback generator
        payload = fallbackGenerator(defaultRangeMs, points, DEFAULT_MAX_PLAYERS);
      }
    }

    // create gradient
    function createGradient(ctx, h) {
      try {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(0,86,214,0.16)');
        g.addColorStop(0.6, 'rgba(0,86,214,0.06)');
        g.addColorStop(1, 'rgba(0,86,214,0)');
        return g;
      } catch (e) {
        return 'rgba(0,86,214,0.06)';
      }
    }

    if (chart) try { chart.destroy(); } catch (e) {}

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: payload.labels,
        datasets: [{
          label: 'Players',
          data: payload.data,
          fill: true,
          backgroundColor: createGradient(ctx, canvas.height || 320),
          borderColor: '#003f8a',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: { legend: { display: true } },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });

    if (!canvas.style.height) canvas.style.height = '320px';

    // start background polling (if not already)
    if (!pollIntervalHandle) {
      startBackgroundPolling();
    }
    return;
  }

  // Manual update: fetch mcstatus now, append into series and update chart to show last points fitting rangeMs
  async function updateActivityChart(rangeMs = 86400000, points = DEFAULT_POINTS) {
    if (isUpdating) return Promise.reject(new Error('update in progress'));
    isUpdating = true;
    try {
      const serverAddress = getServerAddressFromDOM();
      let status = null;
      try {
        status = await fetchMcStatus(serverAddress);
      } catch (err) {
        // fallback: no new point from mcstatus; still render from existing series or dummy
        console.warn('mcstatus fetch failed during manual update', err);
      }

      const maxPlayers = (status && status.playersMax) ? Math.max(1, status.playersMax) : DEFAULT_MAX_PLAYERS;
      if (status) {
        const ts = status.retrievedAt || Date.now();
        const val = Math.max(0, Math.min(maxPlayers, Math.round(status.playersOnline || 0)));
        appendPoint(serverAddress, ts, val);
      }

      // Compose payload for chart (limited by points derived from rangeMs)
      const approxPoints = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round((points || DEFAULT_POINTS))));
      let payload;
      const stored = loadSeries(serverAddress);
      if (stored && stored.length >= 1) {
        payload = payloadFromSeries(serverAddress, approxPoints);
      } else {
        payload = fallbackGenerator(rangeMs, approxPoints, maxPlayers);
      }

      // Update chart
      if (!chart || !canvasId) {
        // create chart first if necessary
        await initActivityChart('activityChart', rangeMs, approxPoints);
        isUpdating = false;
        return;
      }

      const canvas = document.getElementById(canvasId);
      chart.data.labels = payload.labels;
      chart.data.datasets[0].data = payload.data;
      chart.data.datasets[0].backgroundColor = (canvas) ? (function(){
        const ctx = canvas.getContext('2d');
        try {
          const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 320);
          g.addColorStop(0, 'rgba(0,86,214,0.16)');
          g.addColorStop(0.6, 'rgba(0,86,214,0.06)');
          g.addColorStop(1, 'rgba(0,86,214,0)');
          return g;
        } catch (e) { return 'rgba(0,86,214,0.06)'; }
      })() : chart.data.datasets[0].backgroundColor;
      chart.update();

      isUpdating = false;
      return;
    } catch (e) {
      isUpdating = false;
      return Promise.reject(e);
    }
  }

  // Background polling: fetch mcstatus at POLL_MS interval and append to storage.
  function startBackgroundPolling() {
    if (pollIntervalHandle) return;
    async function tick() {
      try {
        const serverAddress = getServerAddressFromDOM();
        const status = await fetchMcStatus(serverAddress).catch(() => null);
        if (status) {
          const maxPlayers = Math.max(1, status.playersMax || DEFAULT_MAX_PLAYERS);
          const val = Math.max(0, Math.min(maxPlayers, Math.round(status.playersOnline || 0)));
          appendPoint(serverAddress, status.retrievedAt || Date.now(), val);
          // if chart exists, update chart live (keep last default points)
          if (chart && canvasId) {
            // keep the same number of points as currently displayed (chart.data.labels.length)
            const shownPoints = Math.max(MIN_POINTS, Math.min(MAX_POINTS, chart.data.labels.length || DEFAULT_POINTS));
            const payload = payloadFromSeries(serverAddress, shownPoints);
            chart.data.labels = payload.labels;
            chart.data.datasets[0].data = payload.data;
            const canvas = document.getElementById(canvasId);
            if (canvas) chart.data.datasets[0].backgroundColor = (function(){
              const ctx = canvas.getContext('2d');
              try {
                const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 320);
                g.addColorStop(0, 'rgba(0,86,214,0.16)');
                g.addColorStop(0.6, 'rgba(0,86,214,0.06)');
                g.addColorStop(1, 'rgba(0,86,214,0)');
                return g;
              } catch (e) { return chart.data.datasets[0].backgroundColor; }
            })();
            chart.update();
          }
        }
      } catch (e) {
        // ignore individual poll failures
        // console.warn('poll tick error', e);
      }
    }

    // fire the first tick immediately, then schedule interval
    tick();
    pollIntervalHandle = setInterval(tick, POLL_MS);
  }

  // Expose public API
  window.initActivityChart = initActivityChart;
  window.updateActivityChart = updateActivityChart;

  // Auto-init if there is a canvas on page with id 'activityChart'
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const c = document.getElementById('activityChart');
      if (c) {
        // default range matches your UI (24h)
        initActivityChart('activityChart', 86400000).catch(err => console.warn('initActivityChart failed', err));
      }
    } catch (e) {}
  });
})();
