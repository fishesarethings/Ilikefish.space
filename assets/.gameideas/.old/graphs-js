// assets/js/graphs.js
// mcstatus.io (Bedrock) backed chart + status panel + history + editable settings + export CSV.
// Drop-in replacement: overwrite /assets/js/graphs.js and hard-refresh page.
// Exposes: window.initActivityChart(canvasId, defaultRangeMs)
//          window.updateActivityChart(rangeMs)

(function () {
  if (window.__ILF_GRAPHS_MCSTATUS_LOADED) return;
  window.__ILF_GRAPHS_MCSTATUS_LOADED = true;

  /* ---------- CONFIG ---------- */
  const MCSTATUS_BASE = 'https://api.mcstatus.io/v2/status/bedrock/'; // bedrock endpoint
  const DEFAULT_POLL_MS = 60 * 1000;    // 60s default
  const MIN_POLL_MS = 15 * 1000;        // 15s minimum allowed
  const DEFAULT_MAX_PLAYERS = 20;       // clamp fallback
  const STORAGE_SERIES_PREFIX = 'ilf_mc_metrics_';
  const STORAGE_SETTINGS_PREFIX = 'ilf_mc_settings_';
  const MAX_POINTS_STORED = 24 * 60;    // ~24h of minute-resolution points
  const DEFAULT_POINTS = 48;
  const MIN_POINTS = 12;
  const MAX_POINTS = 240;
  const FETCH_TIMEOUT_MS = 4500;

  /* ---------- STATE ---------- */
  let chart = null;
  let canvasId = null;
  let pollHandle = null;
  let isUpdating = false;

  /* ---------- UTIL ---------- */
  const nowMs = () => Date.now();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  }
  function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
    return withTimeout(fetch(url, opts), ms);
  }

  function getServerAddressFromDOM() {
    try {
      const host = (document.getElementById('address')?.textContent || '').trim() || 'mc.ilikefish.space';
      const port = (document.getElementById('port')?.textContent || '').trim();
      if (port && port !== '25565' && port !== '') return `${host}:${port}`;
      return host;
    } catch (e) {
      return 'mc.ilikefish.space';
    }
  }

  function storageKeySeries(server) { return STORAGE_SERIES_PREFIX + encodeURIComponent(server); }
  function storageKeySettings(server) { return STORAGE_SETTINGS_PREFIX + encodeURIComponent(server); }

  function loadSeries(server) {
    try {
      const raw = localStorage.getItem(storageKeySeries(server));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch (e) {
      console.warn('loadSeries parse failed', e);
      return [];
    }
  }

  function saveSeries(server, arr) {
    try {
      localStorage.setItem(storageKeySeries(server), JSON.stringify(arr.slice(-MAX_POINTS_STORED)));
    } catch (e) {
      console.warn('saveSeries failed', e);
    }
  }

  function appendPoint(server, timestampMs, value) {
    try {
      const arr = loadSeries(server);
      const minuteKey = Math.floor(timestampMs / 60000);
      if (arr.length) {
        const last = arr[arr.length - 1];
        const lastMinute = Math.floor((last.timestamp || 0) / 60000);
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
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('loadSettings parse failed', e);
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

  /* ---------- mcstatus fetch (Bedrock) ---------- */
  async function fetchMcStatus(serverAddress) {
    const url = MCSTATUS_BASE + encodeURIComponent(serverAddress) + '?t=' + Date.now();
    const resp = await fetchWithTimeout(url, { cache: 'no-store' }, FETCH_TIMEOUT_MS);
    if (!resp.ok) throw new Error('mcstatus network ' + resp.status);
    return resp.json();
  }

  /* ---------- payload builders ---------- */
  function payloadFromSeries(server, points) {
    const arr = loadSeries(server).slice(-points);
    const labels = arr.map(p => {
      const d = new Date(p.timestamp || nowMs());
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    });
    const data = arr.map(p => Number(p.value || 0));
    return { labels, data, usedReal: true };
  }

  function fallbackGenerator(rangeMs, points = DEFAULT_POINTS, maxPlayers = DEFAULT_MAX_PLAYERS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points || DEFAULT_POINTS)));
    const now = nowMs();
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

  /* ---------- chart helpers ---------- */
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

  /* ---------- UI injection (CSS) ---------- */
  (function injectCSS() {
    if (document.getElementById('ilf-graphs-styles')) return;
    const css = `
/* small UI for status panel + badge */
.ilf-status-panel { display:flex; gap:12px; align-items:flex-start; margin-bottom:12px; }
.ilf-status-left { display:flex; gap:12px; align-items:center; }
.ilf-server-icon { width:56px; height:56px; border-radius:8px; background:#f3f5f8; display:flex; align-items:center; justify-content:center; overflow:hidden; box-shadow:0 6px 18px rgba(3,22,55,0.06); }
.ilf-server-icon img { width:100%; height:100%; object-fit:cover; }
.ilf-status-body { display:flex; flex-direction:column; gap:6px; color:#0b2136; font-weight:600; font-size:0.95rem; }
.ilf-motd { font-weight:700; color:#0b2140; font-size:1rem; }
.ilf-sub { font-weight:500; color:#334e63; font-size:0.9rem; }

.ilf-players-list { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; max-height:120px; overflow:auto; }
.ilf-player { display:flex; gap:8px; align-items:center; padding:.25rem .45rem; background:rgba(255,255,255,0.9); border-radius:8px; border:1px solid rgba(0,0,0,0.04); }
.ilf-avatar { width:28px; height:28px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; background:#dfeafc; color:#002e6b; font-weight:700; }

.ilf-badge-wrapper { position:absolute; left:12px; top:12px; z-index:1200; display:flex; gap:8px; align-items:center; }
.ilf-data-badge { background:rgba(255,255,255,0.96); border:1px solid rgba(0,0,0,0.06); padding:6px 8px; border-radius:8px; font-weight:700; font-size:12px; box-shadow:0 8px 28px rgba(3,22,55,0.06); display:inline-flex; gap:8px; align-items:center; color:#0b2136; }
.ilf-edit-btn { background:#0b2140; color:#fff; border:none; padding:6px 8px; border-radius:6px; cursor:pointer; font-weight:700; }

.ilf-meta-row { display:flex; gap:10px; align-items:center; font-size:0.9rem; color:#334e63; margin-top:4px; }
.ilf-meta-item { display:flex; gap:6px; align-items:center; background:rgba(255,255,255,0.9); padding:6px 8px; border-radius:8px; border:1px solid rgba(0,0,0,0.04); font-weight:600; }

.ilf-export-btn { background:#0b2140; color:#fff; border:none; padding:6px 8px; border-radius:6px; cursor:pointer; font-weight:700; }

.ilf-last-updated { font-size:0.85rem; color:#55606a; margin-left:6px; }

.ilf-config-modal { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(4,8,15,0.45); z-index:2600; }
.ilf-config-card { width:100%; max-width:420px; background:#fff; border-radius:12px; padding:14px; box-shadow:0 30px 80px rgba(3,22,55,0.12); }
.ilf-config-row { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
.ilf-config-row input { padding:8px; border-radius:8px; border:1px solid #e2e6ea; }
.ilf-config-actions { display:flex; justify-content:space-between; gap:8px; margin-top:10px; }
    `;
    const s = document.createElement('style');
    s.id = 'ilf-graphs-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  })();

  /* ---------- status panel injection ---------- */
  function injectStatusPanel(boxElement, server) {
    // If a panel already exists for this server, update rather than creating a duplicate
    const existing = boxElement.querySelector('.ilf-status-panel[data-server="' + server + '"]');
    if (existing) return existing;

    const panel = document.createElement('div');
    panel.className = 'ilf-status-panel';
    panel.dataset.server = server;

    const left = document.createElement('div'); left.className = 'ilf-status-left';
    const iconWrap = document.createElement('div'); iconWrap.className = 'ilf-server-icon';
    const iconImg = document.createElement('img'); iconImg.alt = 'icon';
    iconImg.style.display = 'none'; // hidden until we set src
    iconWrap.appendChild(iconImg);

    const body = document.createElement('div'); body.className = 'ilf-status-body';
    const motd = document.createElement('div'); motd.className = 'ilf-motd'; motd.textContent = 'Server';
    const sub = document.createElement('div'); sub.className = 'ilf-sub'; sub.textContent = '—';
    const metaRow = document.createElement('div'); metaRow.className = 'ilf-meta-row';
    const playersItem = document.createElement('div'); playersItem.className = 'ilf-meta-item'; playersItem.textContent = 'Players: —';
    const versionItem = document.createElement('div'); versionItem.className = 'ilf-meta-item'; versionItem.textContent = 'Version: —';
    const pingItem = document.createElement('div'); pingItem.className = 'ilf-meta-item'; pingItem.textContent = 'Ping: —';

    metaRow.appendChild(playersItem);
    metaRow.appendChild(versionItem);
    metaRow.appendChild(pingItem);

    const playersList = document.createElement('div'); playersList.className = 'ilf-players-list';
    const bottomRow = document.createElement('div'); bottomRow.style.display='flex'; bottomRow.style.alignItems='center'; bottomRow.style.gap='8px';
    const exportBtn = document.createElement('button'); exportBtn.className = 'ilf-export-btn'; exportBtn.textContent = 'Export CSV';
    const lastUpdated = document.createElement('div'); lastUpdated.className = 'ilf-last-updated'; lastUpdated.textContent = '';
    bottomRow.appendChild(exportBtn);
    bottomRow.appendChild(lastUpdated);

    body.appendChild(motd);
    body.appendChild(sub);
    body.appendChild(metaRow);
    body.appendChild(playersList);
    body.appendChild(bottomRow);

    left.appendChild(iconWrap);
    panel.appendChild(left);
    panel.appendChild(body);

    // insert at top of boxElement before the canvas
    boxElement.insertBefore(panel, boxElement.querySelector('div') || boxElement.firstChild);

    // wire export
    exportBtn.addEventListener('click', () => {
      const series = loadSeries(server);
      if (!series || !series.length) { alert('No history to export'); return; }
      const csv = ['timestamp,value'].concat(series.map(p => `${p.timestamp},${p.value}`)).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${server.replace(/[:]/g,'-')}-history.csv`; document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    });

    return {
      panel, iconImg, motd, sub, playersItem, versionItem, pingItem, playersList, lastUpdated
    };
  }

  function updateStatusPanel(boxElement, server, mcJson) {
    const els = injectStatusPanel(boxElement, server);
    const iconImg = els.iconImg, motd = els.motd, sub = els.sub, playersItem = els.playersItem, versionItem = els.versionItem, pingItem = els.pingItem, playersList = els.playersList, lastUpdated = els.lastUpdated;

    if (!mcJson) {
      motd.textContent = server;
      sub.textContent = 'Offline or unreachable';
      playersItem.textContent = 'Players: —';
      versionItem.textContent = 'Version: —';
      pingItem.textContent = 'Ping: —';
      playersList.innerHTML = '';
      lastUpdated.textContent = '';
      iconImg.style.display = 'none';
      return;
    }

    // MOTD: try to read motd from mcJson.motd?.clean or mcJson.motd?.raw
    let motdText = '';
    if (mcJson.motd) {
      if (typeof mcJson.motd.clean === 'string') motdText = mcJson.motd.clean;
      else if (Array.isArray(mcJson.motd.raw)) motdText = mcJson.motd.raw.join(' ');
      else if (typeof mcJson.motd.raw === 'string') motdText = mcJson.motd.raw;
      else motdText = (mcJson.motd || '').toString();
    } else motdText = server;

    motd.textContent = motdText.slice(0, 80);
    sub.textContent = (mcJson.hostname || '') || '';

    const playersOnline = Number(mcJson.players?.online ?? (mcJson.players?.online ?? 0));
    const playersMax = Number(mcJson.players?.max ?? DEFAULT_MAX_PLAYERS);
    playersItem.textContent = `Players: ${playersOnline} / ${playersMax}`;

    const version = (mcJson.version?.name ?? mcJson.version?.version ?? '') + '';
    versionItem.textContent = `Version: ${version || '—'}`;

    const ping = (typeof mcJson.latency === 'number' ? Math.round(mcJson.latency) : (mcJson?.ping ? Math.round(mcJson.ping) : '—'));
    pingItem.textContent = `Ping: ${ping} ms`;

    // icon: mcstatus may provide icon (Java often provides base64 'icon' data). For bedrock, often none.
    if (mcJson.icon) {
      // icon might be data:image/png;base64,.... or base64 without prefix - handle both
      let src = mcJson.icon;
      if (!src.startsWith('data:')) src = 'data:image/png;base64,' + src;
      iconImg.src = src;
      iconImg.style.display = 'block';
    } else {
      iconImg.style.display = 'none';
    }

    // players list: mcJson.players.sample perhaps, or mcJson.players.list (varies)
    playersList.innerHTML = '';
    const sample = mcJson.players?.sample || mcJson.players?.list || [];
    if (Array.isArray(sample) && sample.length) {
      sample.slice(0, 64).forEach(p => {
        const name = p.name || p;
        const div = document.createElement('div'); div.className = 'ilf-player';
        const avatar = document.createElement('div'); avatar.className = 'ilf-avatar'; avatar.textContent = (name && name[0]) ? name[0].toUpperCase() : '?';
        const label = document.createElement('div'); label.textContent = name;
        div.appendChild(avatar); div.appendChild(label);
        playersList.appendChild(div);
      });
    } else {
      // No sample provided; show nothing or short fallback message
      if (playersOnline === 0) {
        const t = document.createElement('div'); t.className = 'ilf-sub'; t.textContent = 'No players online';
        playersList.appendChild(t);
      } else {
        // If playersOnline > 0 but no list returned, show placeholders
        for (let i=0;i<Math.min(playersOnline,8);i++) {
          const div = document.createElement('div'); div.className = 'ilf-player';
          const avatar = document.createElement('div'); avatar.className = 'ilf-avatar'; avatar.textContent = '-';
          const label = document.createElement('div'); label.textContent = 'Player';
          div.appendChild(avatar); div.appendChild(label);
          playersList.appendChild(div);
        }
      }
    }

    // last updated label
    lastUpdated.textContent = `Last: ${new Date().toLocaleString()}`;
  }

  /* ---------- badge & edit modal ---------- */
  function ensureBadge(canvas, server) {
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
      canvas.parentElement.style.position = canvas.parentElement.style.position || 'relative';
      canvas.parentElement.appendChild(wrapper);
    }

    let badge = wrapper.querySelector('.ilf-data-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'ilf-data-badge';
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '8px';
      badge.style.padding = '6px 8px';
      badge.style.borderRadius = '8px';
      badge.style.background = 'rgba(255,255,255,0.96)';
      badge.style.boxShadow = '0 8px 28px rgba(3,22,55,0.06)';
      wrapper.appendChild(badge);
    }

    let src = badge.querySelector('.ilf-src');
    if (!src) {
      src = document.createElement('span');
      src.className = 'ilf-src';
      src.style.fontWeight = '700';
      src.style.fontSize = '12px';
      src.textContent = '—';
      badge.appendChild(src);
    }
    let edit = badge.querySelector('.ilf-edit-btn');
    if (!edit) {
      edit = document.createElement('button');
      edit.className = 'ilf-edit-btn';
      edit.textContent = 'Edit';
      edit.style.marginLeft = '6px';
      edit.addEventListener('click', () => openConfigModal(server));
      badge.appendChild(edit);
    }

    // small last-updated dot if needed
    return { wrapper, badge, src, edit };
  }

  function updateBadge(usedReal) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const server = getServerAddressFromDOM();
    const els = ensureBadge(canvas, server);
    els.src.textContent = usedReal ? 'Live (mcstatus.io)' : 'Fallback';
    els.src.style.color = usedReal ? '#0b7a4d' : '#c05a00';
  }

  function openConfigModal(server) {
    const modalId = 'ilf-config-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'ilf-config-modal';
      modal.style.display = 'flex';
      modal.innerHTML = `
        <div class="ilf-config-card" role="dialog" aria-modal="true">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Graph settings</strong>
            <button id="${modalId}-close" style="border:none;background:transparent;font-size:20px;cursor:pointer;">&times;</button>
          </div>
          <div class="ilf-config-row">
            <label>Poll interval (seconds, min 15)</label>
            <input id="${modalId}-poll" type="number" min="15" />
            <label>Max players (clamping)</label>
            <input id="${modalId}-max" type="number" min="1" />
            <div class="ilf-config-actions">
              <button id="${modalId}-clear" style="background:#d93f3f;color:#fff;border:none;padding:8px;border-radius:8px;cursor:pointer;">Clear history</button>
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
    }

    const settings = loadSettings(server) || {};
    const effective = getEffectiveSettings(server);
    const pollInput = document.getElementById(`${modalId}-poll`);
    const maxInput = document.getElementById(`${modalId}-max`);
    const clearBtn = document.getElementById(`${modalId}-clear`);
    const saveBtn = document.getElementById(`${modalId}-save`);

    pollInput.value = Math.round(effective.pollMs / 1000);
    maxInput.value = Math.round(effective.maxPlayers);

    // rebind clear
    clearBtn.onclick = () => {
      if (!confirm('Clear stored history for this server?')) return;
      clearSeries(server);
      updateActivityChart(86400000).catch(()=>{});
      clearBtn.textContent = 'Cleared';
      setTimeout(()=> clearBtn.textContent = 'Clear history', 1500);
    };

    saveBtn.onclick = () => {
      const pollS = Math.max(15, Number(pollInput.value || 60));
      const maxP = Math.max(1, Number(maxInput.value || DEFAULT_MAX_PLAYERS));
      const pollMs = clamp(Math.round(pollS * 1000), MIN_POLL_MS, 24 * 3600 * 1000);
      saveSettings(server, { pollMs, maxPlayers: maxP });
      // restart polling
      if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
      startPollingIfNeeded(server);
      updateActivityChart(86400000).catch(()=>{});
      modal.style.display = 'none';
    };

    modal.style.display = 'flex';
  }

  /* ---------- init / update chart API ---------- */
  async function initActivityChart(canvasElemId, defaultRangeMs = 86400000, points = DEFAULT_POINTS) {
    points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points || DEFAULT_POINTS)));
    const canvas = document.getElementById(canvasElemId);
    if (!canvas) throw new Error('Canvas not found: ' + canvasElemId);
    canvasId = canvasElemId;
    const ctx = canvas.getContext('2d');

    const server = getServerAddressFromDOM();
    const settings = getEffectiveSettings(server);

    // Seed: if we have history use it; else attempt one mcstatus fetch and append; else fallback
    let payload;
    const stored = loadSeries(server);
    if (stored && stored.length >= Math.min(6, points)) {
      payload = payloadFromSeries(server, points);
      updateBadge(true);
    } else {
      // attempt mcstatus once
      try {
        const json = await fetchMcStatus(server);
        // parse players
        const playersOnline = Number(json.players?.online ?? 0);
        const playersMax = Number(json.players?.max ?? settings.maxPlayers);
        const timestamp = Number(json.retrieved_at || nowMs());
        const val = clamp(playersOnline, 0, playersMax);
        appendPoint(server, timestamp, val);
        payload = payloadFromSeries(server, points);
        updateBadge(true);
        // also inject status panel
        const box = canvas.closest('.box') || canvas.parentElement;
        updateStatusPanel(box, server, json);
      } catch (e) {
        payload = fallbackGenerator(defaultRangeMs, points, settings.maxPlayers);
        updateBadge(false);
        const box = canvas.closest('.box') || canvas.parentElement;
        updateStatusPanel(box, server, null);
      }
    }

    if (chart) try { chart.destroy(); } catch (e) {}
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

    // inject UI
    const box = canvas.closest('.box') || canvas.parentElement;
    injectStatusPanel(box, server);
    updateStatusPanel(box, server, null); // will be updated by poll if available
    ensureBadge(canvas, server);

    // start polling
    startPollingIfNeeded(server);

    return;
  }

  async function updateActivityChart(rangeMs = 86400000, points = DEFAULT_POINTS) {
    if (isUpdating) return Promise.reject(new Error('update in progress'));
    isUpdating = true;
    try {
      const server = getServerAddressFromDOM();
      const settings = getEffectiveSettings(server);
      let json = null;
      try { json = await fetchMcStatus(server); } catch (e) { json = null; }

      if (json) {
        const playersOnline = Number(json.players?.online ?? 0);
        const playersMax = Number(json.players?.max ?? settings.maxPlayers);
        const timestamp = Number(json.retrieved_at || nowMs());
        const val = clamp(playersOnline, 0, playersMax);
        appendPoint(server, timestamp, val);
      }

      const stored = loadSeries(server);
      const p = Math.max(MIN_POINTS, Math.min(MAX_POINTS, Number(points || DEFAULT_POINTS)));
      let payload;
      if (stored && stored.length >= 1) payload = payloadFromSeries(server, p);
      else payload = fallbackGenerator(rangeMs, p, (json && json.players?.max) ? json.players.max : settings.maxPlayers);

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

      updateBadge(payload.usedReal);
      const box = canvas.closest('.box') || canvas.parentElement;
      updateStatusPanel(box, server, json);

      isUpdating = false;
      return;
    } catch (e) {
      isUpdating = false;
      return Promise.reject(e);
    }
  }

  function payloadFromSeries(server, points) {
    // local helper re-declared to ensure closure
    const arr = loadSeries(server).slice(-points);
    const labels = arr.map(p => {
      const d = new Date(p.timestamp || nowMs());
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    });
    const data = arr.map(p => Number(p.value || 0));
    return { labels, data, usedReal: true };
  }

  /* ---------- polling ---------- */
  function startPollingIfNeeded(server) {
    const settings = getEffectiveSettings(server);
    const pollMs = settings.pollMs;
    if (pollHandle) clearInterval(pollHandle);

    // immediate tick
    (async function tickOnce() {
      try {
        const s = getServerAddressFromDOM();
        const json = await fetchMcStatus(s).catch(() => null);
        const box = document.querySelector('#' + canvasId)?.closest('.box') || document.querySelector('#' + canvasId)?.parentElement;
        if (json) {
          const playersOnline = Number(json.players?.online ?? 0);
          const playersMax = Number(json.players?.max ?? settings.maxPlayers);
          const timestamp = Number(json.retrieved_at || nowMs());
          const val = clamp(playersOnline, 0, playersMax);
          appendPoint(s, timestamp, val);
          if (chart) {
            const shownPoints = Math.max(MIN_POINTS, Math.min(MAX_POINTS, chart.data.labels.length || DEFAULT_POINTS));
            const payload = payloadFromSeries(s, shownPoints);
            chart.data.labels = payload.labels;
            chart.data.datasets[0].data = payload.data;
            const canvas = document.getElementById(canvasId);
            if (canvas) chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
            chart.update();
          }
          updateBadge(true);
          if (box) updateStatusPanel(box, s, json);
        } else {
          updateBadge(false);
          if (box) updateStatusPanel(box, s, null);
        }
      } catch (e) {
        console.warn('poll tick error', e);
      }
    })();

    pollHandle = setInterval(async () => {
      try {
        const s = getServerAddressFromDOM();
        const settingsNow = getEffectiveSettings(s);
        const json = await fetchMcStatus(s).catch(() => null);
        const box = document.querySelector('#' + canvasId)?.closest('.box') || document.querySelector('#' + canvasId)?.parentElement;
        if (json) {
          const playersOnline = Number(json.players?.online ?? 0);
          const playersMax = Number(json.players?.max ?? settingsNow.maxPlayers);
          const timestamp = Number(json.retrieved_at || nowMs());
          const val = clamp(playersOnline, 0, playersMax);
          appendPoint(s, timestamp, val);
          if (chart) {
            const shownPoints = Math.max(MIN_POINTS, Math.min(MAX_POINTS, chart.data.labels.length || DEFAULT_POINTS));
            const payload = payloadFromSeries(s, shownPoints);
            chart.data.labels = payload.labels;
            chart.data.datasets[0].data = payload.data;
            const canvas = document.getElementById(canvasId);
            if (canvas) chart.data.datasets[0].backgroundColor = createGradient(canvas.getContext('2d'), canvas.height || 320);
            chart.update();
          }
          updateBadge(true);
          if (box) updateStatusPanel(box, s, json);
        } else {
          updateBadge(false);
          if (box) updateStatusPanel(box, s, null);
        }
      } catch (e) {
        console.warn('poll interval error', e);
      }
    }, pollMs);
  }

  /* ---------- expose API & auto-init ---------- */
  window.initActivityChart = initActivityChart;
  window.updateActivityChart = updateActivityChart;

  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('activityChart');
    if (c) {
      initActivityChart('activityChart', 86400000).catch(err => console.warn('initActivityChart failed', err));
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
