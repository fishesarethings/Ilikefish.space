// assets/js/graphs.js
// MCStatus-backed graph with persistent client-side history + editable UI badge/modal.
// - Drop-in replacement for previous graphs.js
// - Exposes: window.initActivityChart(canvasId, defaultRangeMs)
//            window.updateActivityChart(rangeMs)
// - Injects a badge over the canvas showing data source, plus an Edit modal to change poll interval / maxPlayers / clear history.
//
// Usage: overwrite file, hard-refresh. The script auto-inits if a canvas with id "activityChart" exists.

(function () {
  if (window.__ILF_GRAPHS_ENHANCED_LOADED) return;
  window.__ILF_GRAPHS_ENHANCED_LOADED = true;

  /* -------------------------
     CONFIG DEFAULTS & CONSTS
     ------------------------- */
  const MCSTATUS_BASE = 'https://api.mcstatus.io/v2/status/java/';
  const DEFAULT_POLL_MS = 60 * 1000;    // 60s
  const MIN_POLL_MS = 15 * 1000;        // 15s minimum
  const DEFAULT_MAX_PLAYERS = 20;
  const STORAGE_PREFIX_SERIES = 'ilf_mc_metrics_';    // + server
  const STORAGE_PREFIX_SETTINGS = 'ilf_mc_settings_'; // + server
  const MAX_POINTS_STORED = 24 * 60;   // keep ~24h of minute points by default
  const DEFAULT_POINTS = 48;
  const MIN_POINTS = 12;
  const MAX_POINTS = 240;
  const FETCH_TIMEOUT_MS = 4500;

  /* -------------------------
     INTERNAL STATE
     ------------------------- */
  let chart = null;
  let canvasId = null;
  let pollHandle = null;
  let isUpdating = false;
  let lastPollAt = 0;

  /* -------------------------
     UTILITIES
     ------------------------- */
  function nowMs() { return Date.now(); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  }

  function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
    return withTimeout(fetch(url, opts), ms);
  }

  function getServerAddressFromDOM() {
    try {
      const host = (document.getElementById('address')?.textContent || '').trim() || 'mc.ilikefish.space';
      const port = (document.getElementById('port')?.textContent || '').trim();
      if (port && port !== '25565') return `${host}:${port}`;
      return host;
    } catch (e) { return 'mc.ilikefish.space'; }
  }

  function storageKeySeries(server) { return STORAGE_PREFIX_SERIES + encodeURIComponent(server); }
  function storageKeySettings(server) { return STORAGE_PREFIX_SETTINGS + encodeURIComponent(server); }

  function loadSeries(server) {
    try {
      const raw = localStorage.getItem(storageKeySeries(server));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.warn('loadSeries failed', e);
      return [];
    }
  }

  function saveSeries(server, arr) {
    try {
      const truncated = arr.slice(-MAX_POINTS_STORED);
      localStorage.setItem(storageKeySeries(server), JSON.stringify(truncated));
    } catch (e) {
      console.warn('saveSeries failed', e);
    }
  }

  function appendPoint(server, timestampMs, value) {
    try {
      const arr = loadSeries(server);
      // compress to minute resolution: if last point is same minute, replace it
      const minuteKey = Math.floor(timestampMs / 60000);
      if (arr.length) {
        const last = arr[arr.length - 1];
        const lastMinute = Math.floor((last.timestamp || last.t || 0) / 60000);
        if (lastMinute === minuteKey) {
          arr[arr.length - 1] = { timestamp: timestampMs, value };
          saveSeries(server, arr);
          return;
        }
      }
      arr.push({ timestamp: timestampMs, value });
      saveSeries(server, arr);
    } catch (e) {
      console.warn('appendPoint failed', e);
    }
  }

  function clearSeries(server) {
    try {
      localStorage.removeItem(storageKeySeries(server));
    } catch (e) {}
  }

  function loadSettings(server) {
    try {
      const raw = localStorage.getItem(storageKeySettings(server));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('loadSettings parse error', e);
      return null;
    }
  }

  function saveSettings(server, settings) {
    try {
      localStorage.setItem(storageKeySettings(server), JSON.stringify(settings));
    } catch (e) {
      console.warn('saveSettings failed', e);
    }
  }

  function getEffectiveSettings(server) {
    const saved = loadSettings(server) || {};
    const pollMs = clamp(Number(saved.pollMs || DEFAULT_POLL_MS), MIN_POLL_MS, 24 * 3600 * 1000);
    const maxPlayers = Math.max(1, Number(saved.maxPlayers || DEFAULT_MAX_PLAYERS));
    return { pollMs, maxPlayers };
  }

  /* -------------------------
     MCSTATUS FETCH
     ------------------------- */
  async function fetchMcStatus(serverAddress) {
    const url = MCSTATUS_BASE + encodeURIComponent(serverAddress);
    const resp = await fetchWithTimeout(url + '?t=' + Date.now(), { cache: 'no-store' }, FETCH_TIMEOUT_MS);
    if (!resp.ok) throw new Error('mcstatus network ' + resp.status);
    const json = await resp.json();
    // mcstatus v2 returns: { online, players: { online, max }, retrieved_at }
    const players = (json && json.players) || {};
    return {
      online: Boolean(json && json.online),
      playersOnline: Number(players.online ?? 0),
      playersMax: Number(players.max ?? DEFAULT_MAX_PLAYERS),
      retrievedAt: Number(json.retrieved_at ?? Date.now())
    };
  }

  /* -------------------------
     PAYLOAD BUILDERS
     ------------------------- */
  function payloadFromSeries(server, points) {
    const arr = loadSeries(server).slice(-points);
    const labels = arr.map(p => {
      const d = new Date(p.timestamp || Date.now());
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    });
    const data = arr.map(p => Number(p.value || 0));
    return { labels, data, usedReal: true };
  }

  function fallbackGenerator(rangeMs, points = DEFAULT_POINTS, maxPlayers = DEFAULT_MAX_PLAYERS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points || DEFAULT_POINTS)));
    const now = Date.now();
    const labels = new Array(points);
    const data = new Array(points);
    let base = Math.round(maxPlayers * 0.25 + Math.random() * maxPlayers * 0.25);
    let momentum = 0;
    const mf = 0.6;
    const maxStep = Math.max(1, Math.round(maxPlayers * 0.12));
    for (let i = 0; i < points; i++) {
      const t = now - rangeMs + Math.round((i / Math.max(1, points - 1)) * rangeMs);
      const dt = new Date(t);
      labels[i] = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      const rnd = (Math.random() - 0.5) * (maxPlayers * 0.3);
      momentum = momentum * mf + rnd * (1 - mf);
      let cand = Math.round(base + momentum);
      const step = Math.max(-maxStep, Math.min(maxStep, cand - base));
      base = Math.max(0, Math.min(maxPlayers, base + step));
      data[i] = Math.round(Math.max(0, Math.min(maxPlayers, base)));
    }
    return { labels, data, usedReal: false };
  }

  /* -------------------------
     CHART CREATION / UPDATE
     ------------------------- */
  function createGradient(ctx, height) {
    try {
      const g = ctx.createLinearGradient(0, 0, 0, height || 320);
      g.addColorStop(0, 'rgba(0,86,214,0.16)');
      g.addColorStop(0.6, 'rgba(0,86,214,0.06)');
      g.addColorStop(1, 'rgba(0,86,214,0)');
      return g;
    } catch (e) {
      return 'rgba(0,86,214,0.06)';
    }
  }

  async function initActivityChart(canvasElemId, defaultRangeMs = 86400000, points = DEFAULT_POINTS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points || DEFAULT_POINTS)));
    const canvas = document.getElementById(canvasElemId);
    if (!canvas) throw new Error('Canvas not found: ' + canvasElemId);
    canvasId = canvasElemId;
    const ctx = canvas.getContext('2d');

    const server = getServerAddressFromDOM();
    const settings = getEffectiveSettings(server);
    // If we have stored series, use it; else try a mcstatus instant fetch to seed
    let payload;
    const storedSeries = loadSeries(server);
    if (storedSeries && storedSeries.length >= Math.min(6, points)) {
      payload = payloadFromSeries(server, points);
    } else {
      try {
        const status = await fetchMcStatus(server);
        const maxP = Math.max(1, status.playersMax || settings.maxPlayers);
        const val = clamp(Math.round(status.playersOnline || 0), 0, maxP);
        appendPoint(server, status.retrievedAt || nowMs(), val);
        payload = payloadFromSeries(server, points);
      } catch (e) {
        payload = fallbackGenerator(defaultRangeMs, points, settings.maxPlayers);
      }
    }

    if (chart) {
      try { chart.destroy(); } catch (e) {}
      chart = null;
    }

    const gradient = createGradient(ctx, canvas.height || 320);
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: payload.labels,
        datasets: [{
          label: 'Players',
          data: payload.data,
          fill: true,
          backgroundColor: gradient,
          borderColor: '#003f8a',
          borderWidth: 2,
          pointRadius: 3,
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
          x: { ticks: { autoSkip: true, maxTicksLimit: 12 } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });

    if (!canvas.style.height) canvas.style.height = '320px';

    // inject the badge/ui overlay (or update it if present)
    injectBadgeAndModal(canvas, server, payload.usedReal);

    // start polling if not running
    startPollingIfNeeded(server);

    return;
  }

  async function updateActivityChart(rangeMs = 86400000, points = DEFAULT_POINTS) {
    if (isUpdating) return Promise.reject(new Error('update in progress'));
    isUpdating = true;
    try {
      const server = getServerAddressFromDOM();
      const settings = getEffectiveSettings(server);
      // perform an immediate mcstatus fetch (best-effort)
      let status = null;
      try {
        status = await fetchMcStatus(server);
      } catch (e) {
        status = null;
      }

      const maxPlayers = status && status.playersMax ? Math.max(1, status.playersMax) : settings.maxPlayers;
      if (status) {
        const val = clamp(Math.round(status.playersOnline || 0), 0, maxPlayers);
        appendPoint(server, status.retrievedAt || nowMs(), val);
      }

      // prepare payload from stored series (if available), or fallback generator
      const stored = loadSeries(server);
      const p = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points || DEFAULT_POINTS)));
      let payload;
      if (stored && stored.length >= 1) payload = payloadFromSeries(server, p);
      else payload = fallbackGenerator(rangeMs, p, maxPlayers);

      // update chart
      if (!chart || !canvasId) {
        await initActivityChart('activityChart', rangeMs, p);
        isUpdating = false;
        return;
      }
      const canvas = document.getElementById(canvasId);
      chart.data.labels = payload.labels;
      chart.data.datasets[0].data = payload.data;
      chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
      chart.update();

      // update badge/data-source indicator
      updateBadgeDataSource(payload.usedReal);

      isUpdating = false;
      return;
    } catch (e) {
      isUpdating = false;
      return Promise.reject(e);
    }
  }

  /* -------------------------
     POLLING
     ------------------------- */
  function startPollingIfNeeded(server) {
    // ensure we use server-specific poll interval from settings
    const settings = getEffectiveSettings(server);
    const pollMs = settings.pollMs;
    if (pollHandle) clearInterval(pollHandle);

    // Immediately tick once, then schedule
    (async function tickOnce() {
      try {
        const s = getServerAddressFromDOM();
        const stat = await fetchMcStatus(s).catch(() => null);
        if (stat) {
          const maxP = Math.max(1, stat.playersMax || settings.maxPlayers);
          const val = clamp(Math.round(stat.playersOnline || 0), 0, maxP);
          appendPoint(s, stat.retrievedAt || nowMs(), val);
          // if chart exists update it live
          if (chart && canvasId) {
            const shownPoints = Math.max(MIN_POINTS, Math.min(MAX_POINTS, chart.data.labels.length || DEFAULT_POINTS));
            const payload = payloadFromSeries(s, shownPoints);
            chart.data.labels = payload.labels;
            chart.data.datasets[0].data = payload.data;
            const canvas = document.getElementById(canvasId);
            if (canvas) chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
            chart.update();
            updateBadgeDataSource(true);
          }
        } else {
          // update badge to fallback if we failed
          updateBadgeDataSource(false);
        }
      } catch (e) {
        console.warn('poll tick err', e);
      }
    })();

    pollHandle = setInterval(async () => {
      try {
        const s = getServerAddressFromDOM();
        const settingsNow = getEffectiveSettings(s);
        const stat = await fetchMcStatus(s).catch(() => null);
        if (stat) {
          const maxP = Math.max(1, stat.playersMax || settingsNow.maxPlayers);
          const val = clamp(Math.round(stat.playersOnline || 0), 0, maxP);
          appendPoint(s, stat.retrievedAt || nowMs(), val);
          if (chart && canvasId) {
            const shownPoints = Math.max(MIN_POINTS, Math.min(MAX_POINTS, chart.data.labels.length || DEFAULT_POINTS));
            const payload = payloadFromSeries(s, shownPoints);
            chart.data.labels = payload.labels;
            chart.data.datasets[0].data = payload.data;
            const canvas = document.getElementById(canvasId);
            if (canvas) chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
            chart.update();
            updateBadgeDataSource(true);
          }
        } else {
          updateBadgeDataSource(false);
        }
      } catch (e) {
        console.warn('poll interval error', e);
      }
    }, pollMs);
  }

  /* -------------------------
     BADGE + CONFIG UI (injected)
     ------------------------- */
  function ensureBadgeElements(canvas, server) {
    // Container (positioned over canvas)
    const wrapperId = 'ilf-graph-badge-wrapper';
    let wrapper = document.getElementById(wrapperId);
    // If canvas changed (multiple pages), remove and recreate to avoid stale server binding
    if (wrapper && wrapper.dataset.server !== server) {
      wrapper.remove();
      wrapper = null;
    }

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.dataset.server = server;
      // absolute position relative to canvas: place wrapper within same offsetParent
      const parent = canvas.parentElement || document.body;
      parent.style.position = parent.style.position || 'relative';
      wrapper.style.position = 'absolute';
      wrapper.style.left = '12px';
      wrapper.style.top = '12px';
      wrapper.style.zIndex = '1200';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';
      parent.appendChild(wrapper);
    }

    // Badge (data source)
    let badge = wrapper.querySelector('.ilf-data-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ilf-data-badge';
      badge.style.background = 'rgba(255,255,255,0.92)';
      badge.style.border = '1px solid rgba(0,0,0,0.06)';
      badge.style.padding = '6px 8px';
      badge.style.borderRadius = '8px';
      badge.style.boxShadow = '0 8px 28px rgba(3,22,55,0.06)';
      badge.style.fontWeight = '700';
      badge.style.fontSize = '12px';
      badge.style.color = '#0b2136';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '8px';
      wrapper.appendChild(badge);
    }

    // Source label span
    let src = badge.querySelector('.ilf-src');
    if (!src) {
      src = document.createElement('span');
      src.className = 'ilf-src';
      badge.appendChild(src);
    }

    // Edit button
    let edit = wrapper.querySelector('.ilf-edit-btn');
    if (!edit) {
      edit = document.createElement('button');
      edit.className = 'ilf-edit-btn';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.style.padding = '6px 8px';
      edit.style.borderRadius = '6px';
      edit.style.border = 'none';
      edit.style.cursor = 'pointer';
      edit.style.background = '#0b2140';
      edit.style.color = '#fff';
      edit.style.fontWeight = '700';
      edit.style.fontSize = '12px';
      edit.addEventListener('click', (ev) => {
        ev.preventDefault();
        openConfigModal(server);
      });
      wrapper.appendChild(edit);
    }

    return { wrapper, badge, src, edit };
  }

  function updateBadgeDataSource(usedReal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const server = getServerAddressFromDOM();
    const els = ensureBadgeElements(canvas, server);
    if (!els) return;
    if (usedReal) {
      els.src.textContent = 'Live (mcstatus.io)';
      els.src.style.color = '#0b7a4d';
    } else {
      els.src.textContent = 'Fallback';
      els.src.style.color = '#c05a00';
    }
  }

  /* -------------------------
     CONFIG MODAL
     ------------------------- */
  function openConfigModal(server) {
    // Create modal overlay (if not present)
    const modalId = 'ilf-graph-config-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.background = 'rgba(4,8,15,0.45)';
      modal.style.zIndex = '2200';
      modal.innerHTML = `
        <div style="width:100%;max-width:420px;background:#fff;border-radius:12px;padding:16px;box-shadow:0 30px 80px rgba(3,22,55,0.16);font-family:system-ui,Segoe UI,Roboto,Arial;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="font-size:1rem;">Graph settings</strong>
            <button id="${modalId}-close" style="border:none;background:transparent;font-size:20px;cursor:pointer;">&times;</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <label style="font-size:0.9rem;color:#334e63;">Poll interval (seconds)</label>
            <input id="${modalId}-poll" type="number" min="15" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;" />
            <label style="font-size:0.9rem;color:#334e63;">Max players (for clamping)</label>
            <input id="${modalId}-max" type="number" min="1" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;" />
            <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:6px;">
              <button id="${modalId}-clear" style="background:#d93f3f;color:#fff;border:none;padding:8px 10px;border-radius:8px;cursor:pointer;">Clear history</button>
              <div style="display:flex;gap:8px;">
                <button id="${modalId}-cancel" style="background:transparent;border:1px solid #c7cdd2;padding:8px;border-radius:8px;cursor:pointer;">Cancel</button>
                <button id="${modalId}-save" style="background:#0b2140;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">Save</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById(`${modalId}-close`).addEventListener('click', () => { modal.style.display = 'none'; });
      document.getElementById(`${modalId}-cancel`).addEventListener('click', () => { modal.style.display = 'none'; });
      // handlers will be added each time we open (to bind server-specific actions)
    }

    // populate values from settings
    const settings = loadSettings(server) || {};
    const pollInput = document.getElementById(`${modalId}-poll`);
    const maxInput = document.getElementById(`${modalId}-max`);
    const clearBtn = document.getElementById(`${modalId}-clear`);
    const saveBtn = document.getElementById(`${modalId}-save`);

    const effective = getEffectiveSettings(server);
    pollInput.value = Math.round(effective.pollMs / 1000);
    maxInput.value = Math.round(effective.maxPlayers);

    // clear previous event listeners by cloning nodes (simple approach)
    const newClear = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClear, clearBtn);
    newClear.addEventListener('click', () => {
      if (!confirm('Clear stored history for this server? This cannot be undone.')) return;
      clearSeries(server);
      // update chart to fallback short generator
      updateActivityChart(86400000).catch(()=>{});
      newClear.textContent = 'Cleared';
      setTimeout(()=> newClear.textContent = 'Clear history', 1600);
    });

    const newSave = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSave, saveBtn);
    newSave.addEventListener('click', () => {
      const pollS = Number(document.getElementById(`${modalId}-poll`).value || 60);
      const maxP = Math.max(1, Number(document.getElementById(`${modalId}-max`).value || DEFAULT_MAX_PLAYERS));
      const pollMs = clamp(Math.round(pollS * 1000), MIN_POLL_MS, 24*3600*1000);
      saveSettings(server, { pollMs, maxPlayers: maxP });
      // restart polling with new settings
      if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
      startPollingIfNeeded(server);
      // update badge immediately (max players may affect fallback)
      updateActivityChart(86400000).catch(()=>{});
      // hide modal
      modal.style.display = 'none';
    });

    // show modal
    modal.style.display = 'flex';
  }

  /* -------------------------
     DOM INJECTION HELPERS
     ------------------------- */
  function injectBadgeAndModal(canvas, server, usedReal) {
    try {
      // make sure canvas's parent is positioned so our badge can be absolute inside it
      const parent = canvas.parentElement || document.body;
      if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

      // ensure badge elements
      const els = ensureBadgeElements(canvas, server);
      updateBadgeDataSource(usedReal);
    } catch (e) {
      console.warn('injectBadge error', e);
    }
  }

  // Ensure wrapper/badge exists for a given canvas & server (used by injectBadgeAndModal)
  function ensureBadgeElements(canvas, server) {
    const wrapperId = 'ilf-graph-badge-wrapper';
    let wrapper = document.getElementById(wrapperId);
    if (wrapper && wrapper.dataset.server !== server) {
      wrapper.remove();
      wrapper = null;
    }
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.dataset.server = server;
      wrapper.style.position = 'absolute';
      wrapper.style.left = '12px';
      wrapper.style.top = '12px';
      wrapper.style.zIndex = '1200';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';
      canvas.parentElement.appendChild(wrapper);
    }

    let badge = wrapper.querySelector('.ilf-data-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ilf-data-badge';
      badge.style.background = 'rgba(255,255,255,0.92)';
      badge.style.border = '1px solid rgba(0,0,0,0.06)';
      badge.style.padding = '6px 8px';
      badge.style.borderRadius = '8px';
      badge.style.boxShadow = '0 8px 28px rgba(3,22,55,0.06)';
      badge.style.fontWeight = '700';
      badge.style.fontSize = '12px';
      badge.style.color = '#0b2136';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '8px';
      wrapper.appendChild(badge);
    }

    let src = badge.querySelector('.ilf-src');
    if (!src) {
      src = document.createElement('span');
      src.className = 'ilf-src';
      badge.appendChild(src);
    }

    let edit = wrapper.querySelector('.ilf-edit-btn');
    if (!edit) {
      edit = document.createElement('button');
      edit.className = 'ilf-edit-btn';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.style.padding = '6px 8px';
      edit.style.borderRadius = '6px';
      edit.style.border = 'none';
      edit.style.cursor = 'pointer';
      edit.style.background = '#0b2140';
      edit.style.color = '#fff';
      edit.style.fontWeight = '700';
      edit.style.fontSize = '12px';
      edit.addEventListener('click', (ev) => {
        ev.preventDefault();
        openConfigModal(server);
      });
      wrapper.appendChild(edit);
    }

    return { wrapper, badge, src, edit };
  }

  /* -------------------------
     Expose API & Auto-init
     ------------------------- */
  window.initActivityChart = initActivityChart;
  window.updateActivityChart = updateActivityChart;

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('activityChart');
    if (canvas) {
      initActivityChart('activityChart', 86400000).catch(err => console.warn('initActivityChart failed', err));
      // Wire the update-graph button if present (the page already does this; this is a safeguard)
      const btn = document.getElementById('update-graph');
      if (btn && !btn._ilf_bound) {
        btn._ilf_bound = true;
        btn.addEventListener('click', () => {
          btn.classList.add('btn-disabled');
          btn.textContent = 'Updating...';
          const range = parseInt(document.getElementById('range-select').value, 10) || 86400000;
          updateActivityChart(range).finally(() => {
            btn.textContent = 'Update Graph';
            btn.classList.remove('btn-disabled');
          });
        });
      }
    }
  });
})();
