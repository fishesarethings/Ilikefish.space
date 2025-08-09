// graphs.js — robust, non-blocking graph generator with caps and re-entry protection
(function () {
  if (window.__ILF_GRAPHS_LOADED) return;
  window.__ILF_GRAPHS_LOADED = true;

  let chart = null;
  let canvasId = null;
  let inProgress = false;

  // Configuration caps
  const DEFAULT_POINTS = 48;
  const MIN_POINTS = 12;
  const MAX_POINTS = 140;       // prevent extremely large charts
  const FETCH_TIMEOUT_MS = 5000; // if data generation takes >5s, abort

  // Dummy data generator (replace with real fetch if you have one).
  // Uses index-driven sampling to avoid accidental infinite loops.
  function fetchDummyData(rangeMs, points = DEFAULT_POINTS) {
    return new Promise((resolve) => {
      const now = Date.now();
      const labels = new Array(points);
      const data = new Array(points);

      // mild random walk seeded value
      let v = Math.floor(18 + Math.random() * 80);

      for (let i = 0; i < points; i++) {
        const t = now - rangeMs + Math.round((i / Math.max(1, points - 1)) * rangeMs);
        const dt = new Date(t);
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        labels[i] = `${hh}:${mm}`;

        // create a gentle daily cycle + noise
        const dayFactor = 1 + 0.35 * Math.sin((t / (1000 * 3600 * 24)) * Math.PI * 2);
        v = Math.max(0, Math.round(v + (Math.random() - 0.5) * 8 * dayFactor));
        data[i] = v;
      }

      // small async delay to simulate network
      setTimeout(() => resolve({ labels, data }), 120 + Math.random() * 220);
    });
  }

  // create a vertical gradient for fill
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

  // Timeout helper
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), ms))
    ]);
  }

  // Initialize chart (call once per page)
  async function initActivityChart(id, defaultRangeMs = 86400000, points = DEFAULT_POINTS) {
    // normalize and cap points
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));

    const el = document.getElementById(id);
    if (!el) throw new Error('Canvas not found: ' + id);
    canvasId = id;
    const ctx = el.getContext('2d');

    // guard: if chart exists, destroy it first
    if (chart) {
      try { chart.destroy(); } catch (e) { /* ignore */ }
      chart = null;
    }

    // fetch & build initial data (with timeout)
    const fetchPromise = fetchDummyData(defaultRangeMs, points);
    const d = await withTimeout(fetchPromise, FETCH_TIMEOUT_MS);

    const gradient = createGradient(ctx, el.height || 320);

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.labels,
        datasets: [{
          label: 'Players / Activity',
          data: d.data,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#003f8a',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.36,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 850, easing: 'easeOutQuart' },
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

    // ensure canvas a sane height
    if (!el.style.height) el.style.height = '340px';
    return;
  }

  // Update chart data — protected against re-entry and extremely large ranges.
  async function updateActivityChart(rangeMs, points = DEFAULT_POINTS) {
    if (inProgress) return Promise.reject(new Error('Chart update already in progress'));
    inProgress = true;

    // validate rangeMs numeric and sane
    let rangeNum = Number(rangeMs);
    if (!isFinite(rangeNum) || rangeNum <= 0) rangeNum = 86400000; // fallback to 24h

    // cap points to avoid giant arrays
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));

    // If chart not initialized, try to init it first
    if (!chart || !canvasId) {
      try {
        await initActivityChart('activityChart', rangeNum, points);
      } catch (err) {
        inProgress = false;
        return Promise.reject(err);
      }
    }

    try {
      // fetch data with timeout
      const d = await withTimeout(fetchDummyData(rangeNum, points), FETCH_TIMEOUT_MS);

      // update chart dataset + gradient
      const canvas = document.getElementById(canvasId);
      if (!canvas) throw new Error('Canvas missing during update');

      chart.data.labels = d.labels;
      chart.data.datasets[0].data = d.data;
      chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
      chart.options.animation.duration = 650;
      chart.update();

      inProgress = false;
      return Promise.resolve();
    } catch (err) {
      inProgress = false;
      return Promise.reject(err);
    }
  }

  // Expose functions
  window.initActivityChart = initActivityChart;
  window.updateActivityChart = updateActivityChart;
})();
