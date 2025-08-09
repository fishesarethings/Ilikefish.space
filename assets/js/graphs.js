// assets/js/graphs.js
// Attempts to fetch /metrics.json?t=<ts> and parse; fallback to smooth dummy generator.
// Prevents runaway loops; caps points; re-entrancy guard.

(function () {
  if (window.__ILF_GRAPHS_LOADED) return;
  window.__ILF_GRAPHS_LOADED = true;

  let chart = null;
  let canvasId = null;
  let inProgress = false;

  const DEFAULT_POINTS = 48;
  const MIN_POINTS = 12;
  const MAX_POINTS = 140;
  const FETCH_TIMEOUT_MS = 5000;
  const METRICS_ENDPOINT = '/metrics.json';

  function timeoutPromise(p, ms) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), ms))]);
  }

  async function fetchMetrics(rangeMs, points = DEFAULT_POINTS) {
    // Try to fetch a server-supplied metrics.json (cache-busted)
    try {
      const url = METRICS_ENDPOINT + '?t=' + Date.now();
      const res = await timeoutPromise(fetch(url, { cache: 'no-store' }), 3000);
      if (!res.ok) throw new Error('no metrics');
      const json = await res.json();
      // Support two shapes:
      // 1) { points: [{ timestamp: 169..., value: 12 }, ...] }
      // 2) [{ timestamp: 169..., value: 12 }, ...]
      let arr = Array.isArray(json) ? json : (Array.isArray(json.points) ? json.points : null);
      if (!arr || !arr.length) throw new Error('invalid metrics');
      // Normalize to labels/data limited to points (take last N)
      const last = arr.slice(-points);
      const labels = last.map(p => {
        const ts = Number(p.timestamp || p.ts || p.t || Date.now());
        const d = new Date(ts);
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      });
      const data = last.map(p => Number(p.value || p.v || 0));
      return { labels, data };
    } catch (err) {
      // signal fallback by rethrowing (caller will catch and use dummy)
      throw err;
    }
  }

  // Smooth dummy data generator (autocorrelated)
  function dummyData(rangeMs, points = DEFAULT_POINTS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));
    const now = Date.now();
    const labels = new Array(points);
    const data = new Array(points);
    // seed
    const baseHour = new Date(now).getHours();
    let v = Math.round(10 + (Math.sin(baseHour / 24 * Math.PI * 2) + 1) * 30);
    let momentum = 0;
    const momentumFactor = 0.6;
    const maxStep = 6;
    for (let i = 0; i < points; i++) {
      const t = now - rangeMs + Math.round((i / Math.max(1, points - 1)) * rangeMs);
      const dt = new Date(t);
      const hh = dt.getHours().toString().padStart(2, '0');
      const mm = dt.getMinutes().toString().padStart(2, '0');
      labels[i] = `${hh}:${mm}`;
      const dayFactor = 1 + 0.5 * Math.sin((t / (1000 * 3600 * 24)) * Math.PI * 2);
      const rnd = (Math.random() - 0.5) * 8;
      momentum = momentum * momentumFactor + rnd * (1 - momentumFactor);
      let candidate = Math.round(v * dayFactor + momentum);
      const step = Math.max(-maxStep, Math.min(maxStep, candidate - v));
      v = Math.max(0, v + step);
      data[i] = v;
    }
    return { labels, data };
  }

  function createGradient(ctx, h) {
    try {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,86,214,0.18)');
      g.addColorStop(0.6, 'rgba(0,86,214,0.06)');
      g.addColorStop(1, 'rgba(0,86,214,0)');
      return g;
    } catch (e) {
      return 'rgba(0,86,214,0.06)';
    }
  }

  async function initActivityChart(id, defaultRangeMs = 86400000, points = DEFAULT_POINTS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));
    const el = document.getElementById(id);
    if (!el) throw new Error('canvas not found: ' + id);
    canvasId = id;
    const ctx = el.getContext('2d');

    if (chart) try { chart.destroy(); } catch(e){ chart = null; }

    // Try real metrics first (fast timeout), otherwise dummy
    let payload;
    try {
      payload = await timeoutPromise(fetchMetrics(defaultRangeMs, points), 2500);
    } catch (e) {
      payload = dummyData(defaultRangeMs, points);
    }

    const gradient = createGradient(ctx, el.height || 320);
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: payload.labels,
        datasets: [{
          label: 'Players / Activity',
          data: payload.data,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#003f8a',
          borderWidth: 2.2,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          tension: 0.36,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutCubic' },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#213547' } },
          tooltip: { backgroundColor: '#0b2140', titleColor: '#fff', bodyColor: '#fff', mode: 'index', intersect: false }
        },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { color: '#3b4a59', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { color: '#3b4a59', precision: 0 } }
        }
      }
    });

    if (!el.style.height) el.style.height = '340px';
    return;
  }

  async function updateActivityChart(rangeMs, points = DEFAULT_POINTS) {
    if (inProgress) return Promise.reject(new Error('update in progress'));
    inProgress = true;
    let rangeNum = Number(rangeMs);
    if (!isFinite(rangeNum) || rangeNum <= 0) rangeNum = 86400000;
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));

    if (!chart || !canvasId) {
      try {
        await initActivityChart('activityChart', rangeNum, points);
      } catch (err) {
        inProgress = false;
        return Promise.reject(err);
      }
    }

    try {
      let payload;
      try {
        payload = await timeoutPromise(fetchMetrics(rangeNum, points), 3000);
      } catch (e) {
        payload = dummyData(rangeNum, points);
      }

      const canvas = document.getElementById(canvasId);
      if (!canvas) throw new Error('canvas missing during update');

      chart.data.labels = payload.labels;
      chart.data.datasets[0].data = payload.data;
      chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
      chart.options.animation.duration = 600;
      chart.update();

      inProgress = false;
      return Promise.resolve();
    } catch (err) {
      inProgress = false;
      return Promise.reject(err);
    }
  }

  window.initActivityChart = initActivityChart;
  window.updateActivityChart = updateActivityChart;
})();
