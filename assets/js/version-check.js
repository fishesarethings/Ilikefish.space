// assets/js/version-check.js
// Improved version-check with working Confirm, auto-update slider, and more robust SW handling.
//
// - Polls /version.json every 15s (cache-busted).
// - Badges + floating notifier.
// - Centered modal with: Confirm / Cancel, in-modal progress visuals.
// - Auto-apply toggle + delay slider (persisted to localStorage).
// - Proper timer & event cleanup; Confirm is clickable reliably.
// - SW-aware final update flow; falls back to location.reload.
//
// Usage: place at /assets/js/version-check.js and include on pages.
// Hard-refresh after deploy to test.

(function () {
  if (window.__ILF_VERSION_CHECK_LOADED) return;
  window.__ILF_VERSION_CHECK_LOADED = true;

  const VERSION_JSON = '/version.json';
  const CHECK_BTN_ID = 'check-update';
  const SITE_VERSION_KEY = 'siteVersion';
  const POLL_INTERVAL_MS = 15000; // 15s poll
  const AUTO_KEY = 'ilf_auto_update';
  const AUTO_DELAY_KEY = 'ilf_auto_update_delay';

  // ---------- Inject styles ----------
  (function injectStyles() {
    if (document.getElementById('ilf-version-css')) return;
    const css = `
/* Version-check modal styles (isolated under ilf- prefix) */
#ilf-update-backdrop { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(4,8,15,0.55); z-index: 2600; }
#ilf-update-modal { width: 100%; max-width: 520px; background: linear-gradient(180deg,#ffffff,#fbfbff); border-radius: 14px; padding: 1.05rem 1.15rem; box-shadow: 0 30px 90px rgba(6,18,40,0.36); font-family: system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial; color: #0b2136; }
#ilf-update-modal header { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
#ilf-update-modal h3 { margin:0; font-size:1.05rem; letter-spacing: -0.2px; }
#ilf-update-modal p { margin: .45rem 0 0 0; color: #334e63; font-size: .95rem; line-height:1.35; }
.ilf-modal-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; }
.ilf-btn { padding:.5rem .85rem; border-radius:8px; border: none; cursor:pointer; font-weight:700; background:#0b2140; color:#fff; box-shadow: 0 8px 22px rgba(11,33,64,0.12); }
.ilf-btn.secondary { background: transparent; color:#0b2140; border:1px solid rgba(11,33,64,0.08); box-shadow:none; font-weight:600; }
.ilf-cancel { background:transparent; color:#334e63; border: none; font-weight:600; padding:.45rem .75rem; border-radius:8px; }
.ilf-close { background:transparent; border:none; color:#334e63; font-size:1.25rem; cursor:pointer; }

/* progress visuals inside modal */
.ilf-progress-wrap { margin-top:12px; display:flex; flex-direction:column; gap:8px; }
.ilf-linear { width:100%; height:8px; background: rgba(11,33,64,0.06); border-radius:8px; overflow:hidden; }
.ilf-linear .bar { height:100%; width:0%; background: linear-gradient(90deg,#007aff,#0057d9); transition: width 200ms linear; }

/* small circular countdown (right) */
.ilf-countdown { display:flex; align-items:center; gap:10px; }
.ilf-countdown .circle { width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#f6f8ff,#eef5ff); font-weight:700; color:#00305f; box-shadow: 0 8px 20px rgba(3,22,55,0.06); }

/* bottom fixed bar (if we need a dedicated one) */
#ilf-bottom-bar { position: fixed; left:50%; transform: translateX(-50%); bottom: 18px; width: 360px; max-width:calc(100% - 36px); height:10px; background: rgba(11,33,64,0.08); border-radius:999px; overflow:hidden; z-index:2500; display:none; box-shadow:0 10px 32px rgba(3,22,55,0.08); }
#ilf-bottom-bar .inner { height:100%; width:0%; background: linear-gradient(90deg,#007aff,#0057d9); transition: width 200ms linear; }

/* floating notifier styling (small top-right) */
#ilf-floating-notif { display:none; position: fixed; top: 14px; right: 14px; background: linear-gradient(180deg,#ff6b6b,#e04242); color: #fff; padding: 10px 14px; border-radius: 10px; font-weight:700; z-index: 2700; box-shadow: 0 12px 36px rgba(0,0,0,0.18); cursor:pointer; }

/* auto-apply controls */
.ilf-auto-row { display:flex; align-items:center; gap:12px; margin-top:10px; justify-content:space-between; }
.ilf-auto-left { display:flex; align-items:center; gap:8px; }
.ilf-auto-left label { font-size:0.95rem; color:#334e63; }
.ilf-range-row { display:flex; align-items:center; gap:10px; margin-top:8px; justify-content:space-between; }

@media (max-width:560px) {
  #ilf-update-modal { margin: 16px; }
  .ilf-countdown .circle { width:40px; height:40px; font-size:.95rem; }
}
    `;
    const s = document.createElement('style');
    s.id = 'ilf-version-css';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  })();

  // ---------- Utility cleanup ----------
  (function cleanupFloats() {
    try {
      const oldNav = document.getElementById('ilf-floating-nav');
      if (oldNav && oldNav.parentNode) oldNav.parentNode.removeChild(oldNav);
    } catch (e) { /* ignore */ }
  })();

  // ---------- Create modal / notifier DOM ----------
  function ensureModalElements() {
    let backdrop = document.getElementById('ilf-update-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'ilf-update-backdrop';
      backdrop.style.display = 'none';
      backdrop.innerHTML = `
        <div id="ilf-update-modal" role="dialog" aria-modal="true" aria-labelledby="ilf-update-title">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h3 id="ilf-update-title">Site update available</h3>
              <p id="ilf-update-message">A newer version of this site is available. Proceed to refresh to get the latest files.</p>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <button class="ilf-close" id="ilf-modal-close" aria-label="Close">&times;</button>
            </div>
          </div>

          <div class="ilf-auto-row" style="display:block;">
            <div class="ilf-auto-left">
              <input id="ilf-auto-apply" type="checkbox" aria-label="Auto-apply update" />
              <label for="ilf-auto-apply">Auto-apply update</label>
            </div>
            <div style="font-size:.9rem;color:#334e63;" id="ilf-auto-status">Delay: <span id="ilf-auto-delay-label">10</span>s</div>
          </div>

          <div class="ilf-range-row" style="display:block;">
            <input id="ilf-auto-delay" type="range" min="0" max="60" step="5" value="10" />
            <div style="width:54px;text-align:right;font-size:.9rem;color:#334e63;"><span id="ilf-auto-delay-value">10</span>s</div>
          </div>

          <div class="ilf-progress-wrap" id="ilf-progress-wrap" style="display:none;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="flex:1;margin-right:12px;">
                <div class="ilf-linear"><div class="bar" id="ilf-linear-bar"></div></div>
              </div>
              <div class="ilf-countdown" id="ilf-countdown-display" aria-hidden="true">
                <div class="circle" id="ilf-count-num">5</div>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
            <button class="ilf-btn secondary" id="ilf-confirm-btn" style="display:inline-block;">Confirm</button>
            <button class="ilf-cancel" id="ilf-cancel-btn">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      // bottom bar (separate) if not present
      if (!document.getElementById('ilf-bottom-bar')) {
        const bb = document.createElement('div');
        bb.id = 'ilf-bottom-bar';
        bb.innerHTML = `<div class="inner" id="ilf-bottom-inner"></div>`;
        document.body.appendChild(bb);
      }

      // floating notifier
      if (!document.getElementById('ilf-floating-notif')) {
        const n = document.createElement('div');
        n.id = 'ilf-floating-notif';
        n.textContent = 'Update available — click Refresh';
        n.style.display = 'none';
        n.addEventListener('click', () => {
          const btn = document.getElementById(CHECK_BTN_ID);
          if (btn) btn.click(); // robust trigger
        });
        document.body.appendChild(n);
      }
    }

    return {
      backdrop: document.getElementById('ilf-update-backdrop'),
      modal: document.getElementById('ilf-update-modal'),
      closeBtn: document.getElementById('ilf-modal-close'),
      confirmBtn: document.getElementById('ilf-confirm-btn'),
      cancelBtn: document.getElementById('ilf-cancel-btn'),
      linearBar: document.getElementById('ilf-linear-bar'),
      progressWrap: document.getElementById('ilf-progress-wrap'),
      countdownNum: document.getElementById('ilf-count-num'),
      bottomBar: document.getElementById('ilf-bottom-bar'),
      bottomInner: document.getElementById('ilf-bottom-inner'),
      notifier: document.getElementById('ilf-floating-notif'),
      title: document.getElementById('ilf-update-title'),
      message: document.getElementById('ilf-update-message'),
      autoCheckbox: document.getElementById('ilf-auto-apply'),
      autoRange: document.getElementById('ilf-auto-delay'),
      autoLabel: document.getElementById('ilf-auto-delay-value'),
      autoStatus: document.getElementById('ilf-auto-delay-label')
    };
  }

  // ---------- State & timers ----------
  let stepTimerHandle = null; // generic handle for the countdown interval
  let linearAnimInterval = null;
  let autoCountdownHandle = null; // for auto-apply pre-wait
  let currentModalState = 'idle'; // idle | preparing | finalizing
  let lastDetectedVersion = null;

  function clearTimersAndHide() {
    if (stepTimerHandle) { clearInterval(stepTimerHandle); stepTimerHandle = null; }
    if (linearAnimInterval) { clearInterval(linearAnimInterval); linearAnimInterval = null; }
    if (autoCountdownHandle) { clearInterval(autoCountdownHandle); autoCountdownHandle = null; }
    const els = ensureModalElements();
    if (els) {
      els.progressWrap.style.display = 'none';
      if (els.linearBar) els.linearBar.style.width = '0%';
      if (els.countdownNum) els.countdownNum.textContent = '';
      if (els.confirmBtn) {
        els.confirmBtn.style.display = 'inline-block';
        els.confirmBtn.disabled = false;
        // remove any attached ilf handlers
        if (els.confirmBtn.__ilf_handler) {
          els.confirmBtn.removeEventListener('click', els.confirmBtn.__ilf_handler);
          delete els.confirmBtn.__ilf_handler;
        }
      }
      if (els.cancelBtn && els.cancelBtn.__ilf_handler) {
        els.cancelBtn.removeEventListener('click', els.cancelBtn.__ilf_handler);
        delete els.cancelBtn.__ilf_handler;
      }
      if (els.closeBtn && els.closeBtn.__ilf_handler) {
        els.closeBtn.removeEventListener('click', els.closeBtn.__ilf_handler);
        delete els.closeBtn.__ilf_handler;
      }
      // hide bottom bar if we created it
      if (els.bottomBar) els.bottomBar.style.display = 'none';
      // hide backdrop
      if (els.backdrop) els.backdrop.style.display = 'none';
      currentModalState = 'idle';
    }
  }

  // ---------- Service worker final update ----------
  function doFinalUpdate(latestVersion) {
    try { localStorage.setItem(SITE_VERSION_KEY, latestVersion); } catch (e) { /* ignore */ }

    if (!('serviceWorker' in navigator)) {
      try { location.reload(true); } catch (e) { location.reload(); }
      return;
    }

    let reloaded = false;
    function reloadOnce() {
      if (reloaded) return;
      reloaded = true;
      try { location.reload(true); } catch (e) { location.reload(); }
    }

    const onControllerChange = () => setTimeout(reloadOnce, 150);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        reloadOnce();
        return;
      }

      // Trigger an update attempt
      reg.update().catch(()=>{});

      // If there's a waiting worker -> ask it to skipWaiting
      if (reg.waiting) {
        try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch(e){/*ignore*/}
        // Wait for controllerchange (which we already listen for)
        return;
      }

      // If installing, watch its lifecycle
      if (reg.installing) {
        const installing = reg.installing;
        installing.addEventListener('statechange', function sc(e) {
          if (e.target.state === 'installed' && reg.waiting) {
            try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
          }
          if (e.target.state === 'activated') {
            setTimeout(reloadOnce, 120);
          }
        });
        return;
      }

      // Otherwise fallback after a short grace
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        reloadOnce();
      }, 1200);
    }).catch(err => {
      try { navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); } catch (e) {}
      reloadOnce();
    });
  }

  // ---------- Modal show + flow ----------
  function showModalCenter(latestVersion, onFinalConfirm) {
    lastDetectedVersion = latestVersion;
    const els = ensureModalElements();
    if (!els) return;

    // sync auto controls from storage
    const autoEnabled = localStorage.getItem(AUTO_KEY) === '1';
    const autoDelayStored = Number(localStorage.getItem(AUTO_DELAY_KEY) || 10);
    els.autoCheckbox.checked = !!autoEnabled;
    els.autoRange.value = String(isFinite(autoDelayStored) ? autoDelayStored : 10);
    els.autoLabel.textContent = String(els.autoRange.value);
    els.autoStatus.textContent = String(els.autoRange.value);

    els.title.textContent = `Update available — v${latestVersion}`;
    els.message.innerHTML = `A newer version (${latestVersion}) is available. Click <strong>Confirm</strong> to start the update flow or <strong>Cancel</strong> to abort. Closing the dialog will also cancel.`;

    // show modal
    els.backdrop.style.display = 'flex';
    // Init UI
    els.progressWrap.style.display = 'none';
    els.linearBar.style.width = '0%';
    els.countdownNum.textContent = '';
    els.confirmBtn.style.display = 'inline-block';
    els.confirmBtn.disabled = false;
    currentModalState = 'idle';

    // wire handlers (remove old handlers first)
    if (els.closeBtn.__ilf_handler) { els.closeBtn.removeEventListener('click', els.closeBtn.__ilf_handler); delete els.closeBtn.__ilf_handler; }
    if (els.cancelBtn.__ilf_handler) { els.cancelBtn.removeEventListener('click', els.cancelBtn.__ilf_handler); delete els.cancelBtn.__ilf_handler; }
    if (els.confirmBtn.__ilf_handler) { els.confirmBtn.removeEventListener('click', els.confirmBtn.__ilf_handler); delete els.confirmBtn.__ilf_handler; }

    const closeHandler = () => { clearTimersAndHide(); };
    els.closeBtn.__ilf_handler = closeHandler;
    els.closeBtn.addEventListener('click', closeHandler);

    const cancelHandler = () => { clearTimersAndHide(); };
    els.cancelBtn.__ilf_handler = cancelHandler;
    els.cancelBtn.addEventListener('click', cancelHandler);

    // range UI update
    els.autoRange.oninput = () => {
      els.autoLabel.textContent = String(els.autoRange.value);
      els.autoStatus.textContent = String(els.autoRange.value);
      try { localStorage.setItem(AUTO_DELAY_KEY, String(els.autoRange.value)); } catch(e){}
    };
    els.autoCheckbox.onchange = () => {
      try { localStorage.setItem(AUTO_KEY, els.autoCheckbox.checked ? '1' : '0'); } catch(e){}
    };

    // confirm handler (single-click to start step1)
    const startStep1 = () => {
      if (currentModalState !== 'idle') return;
      currentModalState = 'preparing';
      els.confirmBtn.disabled = true;
      runStepCountdown(3, 'Step 1: preparing update', els, () => {
        // step1 complete -> present final confirmation (or auto proceed)
        currentModalState = 'idle';
        els.message.innerHTML = `Final confirmation required. This will reload the site to apply the update. You may cancel.`;
        els.confirmBtn.disabled = false;
        // ensure confirm's click starts final step
      });
    };

    // final confirm starts finalizing countdown then runs final action
    const startFinalStep = () => {
      if (currentModalState === 'finalizing') return;
      currentModalState = 'finalizing';
      els.confirmBtn.disabled = true;
      runStepCountdown(5, 'Finalizing update', els, () => {
        // show bottom progress bar (use existing #download-progress if present)
        try {
          const existingBottom = document.getElementById('download-progress');
          const createdBottom = document.getElementById('ilf-bottom-bar');
          if (existingBottom) {
            existingBottom.style.display = 'block';
            const inner = existingBottom.querySelector('.bar');
            if (inner) inner.style.width = '20%';
          } else if (createdBottom) {
            createdBottom.style.display = 'block';
            const inner = document.getElementById('ilf-bottom-inner');
            if (inner) inner.style.width = '24%';
          }
          if (typeof onFinalConfirm === 'function') onFinalConfirm();
        } catch (e) {
          console.error('final update step error', e);
          clearTimersAndHide();
        }
      });
    };

    // attach click handlers via addEventListener and store references so we can remove later
    els.confirmBtn.__ilf_handler = function (ev) {
      ev.preventDefault();
      // clicking when idle -> run step1
      if (currentModalState === 'idle') {
        startStep1();
        // after step1 completes the user must click again to run final step; wait for that click
        // attach a one-time listener to confirm to trigger final step once
        const onceFinal = function onceFinalFn(e2) {
          e2.preventDefault();
          startFinalStep();
          // remove this onceFinal listener
          if (els.confirmBtn) els.confirmBtn.removeEventListener('click', onceFinalFn);
        };
        // Use setTimeout to attach after the immediate click to avoid re-triggering
        setTimeout(() => { if (els.confirmBtn) els.confirmBtn.addEventListener('click', onceFinal); }, 1200);
      } else if (currentModalState === 'preparing') {
        // prevent spamming
      } else if (currentModalState === 'finalizing') {
        // already finalizing
      }
    };
    els.confirmBtn.addEventListener('click', els.confirmBtn.__ilf_handler);

    // focus confirm for accessibility
    try { els.confirmBtn.focus(); } catch (e) {}

    // If auto-apply is enabled, start an auto-precountdown that triggers the flow.
    try {
      const autoOn = localStorage.getItem(AUTO_KEY) === '1';
      const autoDelay = Math.max(0, Number(localStorage.getItem(AUTO_DELAY_KEY) || els.autoRange.value || 10));
      if (autoOn) {
        // show a short auto countdown bar above confirm to show time until auto-start
        let remaining = Math.max(0, Math.floor(autoDelay));
        // if delay 0 -> start sequence immediately
        if (remaining <= 0) {
          // start step1 immediately then final
          startStep1();
          setTimeout(() => { startFinalStep(); }, 4200); // chain approx
        } else {
          // Start a small auto countdown visible in the message area
          const prevMsg = els.message.innerHTML;
          els.message.innerHTML = `Auto-apply in <strong><span id="ilf-auto-countdown">${remaining}</span>s</strong>. Cancel to abort.`;
          autoCountdownHandle = setInterval(() => {
            remaining--;
            const elc = document.getElementById('ilf-auto-countdown');
            if (elc) elc.textContent = String(Math.max(0, remaining));
            if (remaining <= 0) {
              clearInterval(autoCountdownHandle);
              autoCountdownHandle = null;
              // start both steps automatically
              startStep1();
              // start final a little after step1 finishes
              setTimeout(() => { startFinalStep(); }, 4200);
            }
          }, 1000);
        }
      }
    } catch (e) { /* ignore auto errors */ }
  }

  // ---------- Step countdown with in-modal progress ----------
  function runStepCountdown(seconds, label, els, doneCallback) {
    if (!els) return;
    els.progressWrap.style.display = 'block';
    els.message.textContent = label;
    const linear = els.linearBar;
    const circle = els.countdownNum;
    if (linear) linear.style.width = '0%';
    if (circle) circle.textContent = String(seconds);

    // clear any previous timers
    if (stepTimerHandle) { clearInterval(stepTimerHandle); stepTimerHandle = null; }
    if (linearAnimInterval) { clearInterval(linearAnimInterval); linearAnimInterval = null; }

    const start = Date.now();
    const total = Math.max(1, seconds);
    let elapsed = 0;

    linearAnimInterval = setInterval(() => {
      elapsed = (Date.now() - start) / 1000;
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      if (linear) linear.style.width = pct + '%';
    }, 200);

    let remaining = total;
    stepTimerHandle = setInterval(() => {
      remaining--;
      if (circle) circle.textContent = String(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(stepTimerHandle);
        stepTimerHandle = null;
        if (linearAnimInterval) { clearInterval(linearAnimInterval); linearAnimInterval = null; if (linear) linear.style.width = '100%'; }
        setTimeout(() => {
          if (typeof doneCallback === 'function') doneCallback();
        }, 360);
      }
    }, 1000);
  }

  // ---------- Badge + notifier + poll logic ----------
  function addBadgeToButton() {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    if (!btn.querySelector('.update-badge')) {
      const b = document.createElement('span');
      b.className = 'update-badge';
      b.textContent = 'new';
      b.style.marginLeft = '6px';
      b.style.padding = '0.12rem 0.45rem';
      b.style.borderRadius = '8px';
      b.style.background = '#e53935';
      b.style.color = '#fff';
      b.style.fontWeight = '700';
      b.style.fontSize = '0.75rem';
      btn.appendChild(b);
    }
  }

  function showFloatingNotifier(text) {
    const n = document.getElementById('ilf-floating-notif');
    if (!n) return;
    n.textContent = text;
    n.style.display = 'block';
    // hide after 9s
    setTimeout(() => { try { n.style.display = 'none'; } catch(e){} }, 9000);
  }

  // ---------- Immediate click bind ----------
  function bindImmediateClick() {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;

    // avoid double-binding
    if (btn.__ilf_click_handler) {
      btn.removeEventListener('click', btn.__ilf_click_handler);
      delete btn.__ilf_click_handler;
    }

    const handler = async function () {
      try {
        const url = VERSION_JSON + '?t=' + Date.now();
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) { alert('Could not check updates'); return; }
        const j = await res.json();
        const latest = String(j.version || '').trim();
        if (!latest) { alert('No version info'); return; }
        // update footer display if present
        const curEl = document.getElementById('current-site-version');
        if (curEl) curEl.textContent = latest;

        const stored = localStorage.getItem(SITE_VERSION_KEY);
        if (!stored) {
          try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
          alert('Version recorded. No update required.');
          return;
        }

        if (stored !== latest) {
          // show modal and supply final action
          showModalCenter(latest, () => {
            try {
              try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
              const existingBottom = document.getElementById('download-progress');
              const createdBottom = document.getElementById('ilf-bottom-bar');
              if (existingBottom) {
                existingBottom.style.display = 'block';
                const inner = existingBottom.querySelector('.bar');
                if (inner) inner.style.width = '20%';
              } else if (createdBottom) {
                createdBottom.style.display = 'block';
                const inner = document.getElementById('ilf-bottom-inner');
                if (inner) inner.style.width = '24%';
              }
              doFinalUpdate(latest);
            } catch (e) {
              console.error('final update invocation failed', e);
              try { location.reload(true); } catch (err) { location.reload(); }
            }
          });
        } else {
          alert('No updates available.');
        }
      } catch (e) {
        console.error(e);
        alert('Could not check updates.');
      }
    };

    btn.__ilf_click_handler = handler;
    btn.addEventListener('click', handler);
    // ensure it's visually enabled
    btn.classList.remove('btn-disabled');
  }

  async function pollOnce() {
    try {
      const url = VERSION_JSON + '?t=' + Date.now();
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const latest = String(j.version || '').trim();
      if (!latest) return;
      const cv = document.getElementById('current-site-version');
      if (cv) cv.textContent = latest;

      let stored = localStorage.getItem(SITE_VERSION_KEY);
      if (!stored) {
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
        stored = latest;
        return;
      }

      if (stored !== latest) {
        addBadgeToButton();
        showFloatingNotifier('Update available — click Refresh to update');
        lastDetectedVersion = latest;
      }
    } catch (err) {
      // silent
    }
  }

  // Start up
  (function start() {
    ensureModalElements();
    bindImmediateClick();
    pollOnce();
    setInterval(pollOnce, POLL_INTERVAL_MS);

    // Wire service worker progress messages into the bottom bar
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          navigator.serviceWorker.addEventListener('message', ev => {
            if (!ev.data) return;
            if (ev.data.type === 'PRECACHE_PROGRESS') {
              const percent = Number(ev.data.percent) || 0;
              const existingBottom = document.getElementById('download-progress');
              if (existingBottom) {
                existingBottom.style.display = 'block';
                const inner = existingBottom.querySelector('.bar');
                if (inner) inner.style.width = percent + '%';
                if (percent >= 100) {
                  setTimeout(() => { existingBottom.style.display = 'none'; }, 1600);
                }
              } else {
                const created = document.getElementById('ilf-bottom-bar');
                if (created) {
                  created.style.display = 'block';
                  const inner = document.getElementById('ilf-bottom-inner');
                  if (inner) inner.style.width = percent + '%';
                  if (percent >= 100) setTimeout(() => { created.style.display = 'none'; }, 1600);
                }
              }
            }
          });
        }).catch(()=>{/* ignore */});
      }
    } catch (e) { /* ignore */ }
  })();

})();
