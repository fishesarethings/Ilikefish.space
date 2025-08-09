// assets/js/graphs.js — robust, caps, guard against infinite loops
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

  function fetchDummyData(rangeMs, points = DEFAULT_POINTS) {
    return new Promise((resolve) => {
      const now = Date.now();
      const labels = new Array(points);
      const data = new Array(points);
      let v = Math.floor(18 + Math.random() * 80);

      for (let i = 0; i < points; i++) {
        const t = now - rangeMs + Math.round((i / Math.max(1, points - 1)) * rangeMs);
        const dt = new Date(t);
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        labels[i] = `${hh}:${mm}`;
        const dayFactor = 1 + 0.35 * Math.sin((t / (1000 * 3600 * 24)) * Math.PI * 2);
        v = Math.max(0, Math.round(v + (Math.random() - 0.5) * 8 * dayFactor));
        data[i] = v;
      }

      setTimeout(() => resolve({ labels, data }), 120 + Math.random() * 220);
    });
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

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), ms))
    ]);
  }

  async function initActivityChart(id, defaultRangeMs = 86400000, points = DEFAULT_POINTS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points) || DEFAULT_POINTS));

    const el = document.getElementById(id);
    if (!el) throw new Error('Canvas not found: ' + id);
    canvasId = id;
    const ctx = el.getContext('2d');

    if (chart) {
      try { chart.destroy(); } catch (e) {}
      chart = null;
    }

    const d = await withTimeout(fetchDummyData(defaultRangeMs, points), FETCH_TIMEOUT_MS);

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

    if (!el.style.height) el.style.height = '340px';
    return;
  }

  async function updateActivityChart(rangeMs, points = DEFAULT_POINTS) {
    if (inProgress) return Promise.reject(new Error('Chart update already in progress'));
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
      const d = await withTimeout(fetchDummyData(rangeNum, points), FETCH_TIMEOUT_MS);
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

  window.initActivityChart = initActivityChart;
  window.updateActivityChart = updateActivityChart;
})();
