// assets/js/server.js

console.log('[server] script loaded');

window.copyText = txt =>
  navigator.clipboard.writeText(txt)
    .then(() => console.log('[server] copied:', txt))
    .catch(err => console.error('[server] copy failed:', err));

// ───────────────
// Utility: load history from localStorage (array of {t, count})
function loadHistory() {
  const raw = localStorage.getItem('serverHistory');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Utility: save history back to localStorage
function saveHistory(arr) {
  localStorage.setItem('serverHistory', JSON.stringify(arr));
}

// Prune out entries older than 1 year
function pruneOldHistory() {
  const oneYearAgo = Date.now() - 31536000000; // 1 year in ms
  let history = loadHistory();
  history = history.filter(item => item.t >= oneYearAgo);
  saveHistory(history);
  return history;
}

// Add a new data point to history, then prune
function addToHistory(count) {
  const history = pruneOldHistory();
  history.push({ t: Date.now(), count });
  saveHistory(history);
  return history;
}

// Build chart dataset filtered by timeframe (in ms)
function getFilteredHistory(timeWindow) {
  const now = Date.now();
  const history = pruneOldHistory();
  return history
    .filter(item => item.t >= now - timeWindow)
    .map(item => ({ x: item.t, y: item.count }));
}

// Format timestamp (e.g., “HH:MM” or “MM/DD”)
function formatTimestamp(ts) {
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ───────────────
// Update the “Ping” (ms) and show/hide pulsing dot
async function updatePing() {
  const pingEl = document.getElementById('ping');
  const dotEl  = document.querySelector('.ring-container');
  if (!pingEl || !dotEl) return;

  dotEl.style.opacity = 0;
  pingEl.textContent = '…';

  try {
    const url = 'https://api.mcsrvstat.us/bedrock/2/mc.ilikefish.space:65167';
    const t0 = performance.now();
    const res = await fetch(url);
    const t1 = performance.now();

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ms = Math.round(t1 - t0);
    pingEl.textContent = `${ms} ms`;
    dotEl.style.opacity = 1;
  } catch (err) {
    console.error('[server] ❌ ping failed:', err);
    pingEl.textContent = 'Unavailable';
    dotEl.style.opacity = 0;
  }
}

// ───────────────
// Main “DOMContentLoaded” logic: fetch current count, store in history, render chart
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[server] DOMContentLoaded');

  // 1) Write join info
  document.getElementById('address').textContent = 'mc.ilikefish.space';
  document.getElementById('port').textContent    = '65167';

  // 2) Fetch current “players online” for chart and store in history
  const ctx = document.getElementById('activityChart');
  let currentCount = 0;
  if (ctx) {
    try {
      console.log('[server] fetching server stats…');
      const res  = await fetch('https://api.mcsrvstat.us/bedrock/2/mc.ilikefish.space:65167');
      const data = await res.json();
      currentCount = data.players?.online ?? 0;
      console.log('[server] got server stats:', data);
      addToHistory(currentCount);
    } catch {
      console.warn('[server] failed to fetch current stats, skipping history update');
    }
  }

  // 3) Initial ping and schedule ping updates
  await updatePing();
  setInterval(updatePing, 30000);

  // 4) Build Chart.js chart instance and render initial data
  let chartInstance = null;
  function renderChart(timeWindow) {
    const rawData = getFilteredHistory(timeWindow);
    const labels  = rawData.map(pt => formatTimestamp(pt.x));
    const dataset = rawData.map(pt => pt.y);

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Players Online',
          data: dataset,
          fill: false,
          borderColor: '#007aff',
          pointRadius: 2,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: { display: true, text: 'Time' }
          },
          y: {
            title: { display: true, text: 'Count' },
            beginAtZero: true
          }
        }
      }
    };

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = dataset;
      chartInstance.update();
    } else {
      chartInstance = new Chart(ctx, config);
    }
  }

  // 5) On timeframe selection change, re-render chart
  const selectEl = document.getElementById('range-select');
  selectEl.addEventListener('change', () => {
    const msWindow = parseInt(selectEl.value, 10);
    renderChart(msWindow);
  });

  // 6) “Update Graph” button – explicitly re-render chart
  document.getElementById('update-graph')?.addEventListener('click', () => {
    const msWindow = parseInt(selectEl.value, 10);
    renderChart(msWindow);
  });

  // 7) Render initial chart using default “Last 24 Hours”
  const initialWindow = parseInt(selectEl.value, 10);
  renderChart(initialWindow);
});

// Manual “Refresh Ping” button
document.getElementById('refresh-ping')?.addEventListener('click', updatePing);
