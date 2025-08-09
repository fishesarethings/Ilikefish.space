// graphs.js — improved visuals + animation
(function () {
  if (window.__ILF_GRAPHS_LOADED) return;
  window.__ILF_GRAPHS_LOADED = true;

  let chart = null;
  let canvasId = null;

  function fetchDummyData(rangeMs, points = 48) {
    return new Promise((resolve) => {
      const now = Date.now();
      const step = Math.max(1, Math.floor(rangeMs / points));
      const labels = [];
      const data = [];
      let v = Math.floor(18 + Math.random() * 80);
      for (let t = now - rangeMs; t <= now; t += step) {
        const dt = new Date(t);
        const hh = dt.getHours();
        const mm = dt.getMinutes();
        labels.push(`${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`);
        // mild daily curve + small noise
        const dayFactor = 1 + 0.4 * Math.sin((t / (1000*3600*24)) * Math.PI * 2);
        v = Math.max(0, Math.round(v + (Math.random() - 0.5) * 8 * dayFactor));
        data.push(v);
      }
      setTimeout(() => resolve({ labels, data }), 150 + Math.random() * 200);
    });
  }

  function createGradient(ctx, h) {
    try {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,86,214,0.18)');
      grad.addColorStop(0.6, 'rgba(0,86,214,0.06)');
      grad.addColorStop(1, 'rgba(0,86,214,0)');
      return grad;
    } catch (e) {
      return 'rgba(0,86,214,0.06)';
    }
  }

  async function initActivityChart(id, defaultRangeMs = 86400000) {
    return new Promise(async (resolve, reject) => {
      try {
        const el = document.getElementById(id);
        if (!el) return reject(new Error('Canvas not found: ' + id));
        canvasId = id;
        const ctx = el.getContext('2d');

        const d = await fetchDummyData(defaultRangeMs, 48);
        const gradient = createGradient(ctx, el.height || 320);

        if (chart) try { chart.destroy(); } catch(e){}

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
            animation: {
              duration: 900,
              easing: 'easeOutQuart'
            },
            plugins: {
              legend: { display: true, position: 'top', labels: { color: '#213547' } },
              tooltip: {
                backgroundColor: '#0b2140',
                titleColor: '#fff',
                bodyColor: '#fff',
                mode: 'index',
                intersect: false,
              }
            },
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: {
                ticks: { color: '#3b4a59', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
              },
              y: {
                beginAtZero: true,
                ticks: { color: '#3b4a59', precision: 0 }
              }
            }
          }
        });

        if (!el.style.height) el.style.height = '340px';
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async function updateActivityChart(rangeMs) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!chart || !canvasId) return reject(new Error('Chart not initialized'));
        const d = await fetchDummyData(rangeMs, 48);
        chart.data.labels = d.labels;
        chart.data.datasets[0].data = d.data;
        const canvas = document.getElementById(canvasId);
        chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
        chart.options.animation.duration = 700;
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
