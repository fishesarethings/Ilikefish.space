// graphs.js
// Handles activityChart creation and updates.
// - initActivityChart(canvasId, defaultRangeMs) -> Promise
// - updateActivityChart(rangeMs) -> Promise
// If you have real API data, replace fetchDummyData(...) with an actual fetch to your server.

(function () {
  if (window.__ILF_GRAPHS_LOADED) return;
  window.__ILF_GRAPHS_LOADED = true;

  let chart = null;
  let currentCanvasId = null;

  // utility: generate dummy data (timestamps and values) for demonstration.
  // Replace this with your server call if available.
  function fetchDummyData(rangeMs, points = 48) {
    return new Promise((resolve) => {
      const now = Date.now();
      const step = Math.max(1, Math.floor(rangeMs / points));
      const labels = [];
      const data = [];
      // generate smooth-ish random walk
      let v = Math.floor(20 + Math.random() * 80);
      for (let t = now - rangeMs; t <= now; t += step) {
        const dt = new Date(t);
        const hh = dt.getHours();
        const mm = dt.getMinutes();
        labels.push(`${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`);
        // small random walk with daily pattern
        const dayFactor = 1 + 0.6 * Math.sin((t / 1000 / 3600 / 24) * Math.PI * 2);
        v = Math.max(0, Math.round(v + (Math.random() - 0.5) * 10 * dayFactor));
        data.push(v);
      }
      // small timeout to simulate network
      setTimeout(() => resolve({ labels, data }), 200 + Math.random() * 200);
    });
  }

  // create gradient if possible
  function createGradient(ctx, h) {
    try {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,122,255,0.18)');
      g.addColorStop(1, 'rgba(0,122,255,0.02)');
      return g;
    } catch (e) {
      return 'rgba(0,122,255,0.08)';
    }
  }

  async function initActivityChart(canvasId, defaultRangeMs = 86400000) {
    return new Promise(async (resolve, reject) => {
      try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return reject(new Error('Canvas not found: ' + canvasId));
        currentCanvasId = canvasId;
        const ctx = canvas.getContext('2d');

        // create initial dummy dataset
        const d = await fetchDummyData(defaultRangeMs, 48);

        const gradient = createGradient(ctx, canvas.height || 300);

        // destroy existing chart if any
        if (chart) {
          try { chart.destroy(); } catch (e) {}
        }

        chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: d.labels,
            datasets: [{
              label: 'Players / Activity',
              data: d.data,
              fill: true,
              backgroundColor: gradient,
              borderColor: '#007aff',
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 4,
              tension: 0.36,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: 'top' },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
              x: {
                display: true,
                ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
              },
              y: {
                display: true,
                beginAtZero: true,
                ticks: { precision: 0 }
              }
            }
          }
        });

        // ensure canvas height reasonable
        if (!canvas.style.height) canvas.style.height = '320px';
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async function updateActivityChart(rangeMs) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!chart || !currentCanvasId) return reject(new Error('Chart not initialized'));
        const d = await fetchDummyData(rangeMs, 48);
        chart.data.labels = d.labels;
        chart.data.datasets[0].data = d.data;
        // update gradient
        const canvas = document.getElementById(currentCanvasId);
        const ctx = canvas.getContext('2d');
        const g = createGradient(ctx, canvas.height || 300);
        chart.data.datasets[0].backgroundColor = g;
        chart.update();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  window.initActivityChart = initActivityChart;
  window.updateActivityChart = updateActivityChart;
})();
