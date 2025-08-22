// assets/js/version-check.js
// Modern centered update UI with in-modal progress + bottom bar usage.
// - Polls /version.json every 15s for new version.
// - Shows badge + floating notifier when new version detected.
// - Clicking "Refresh" will re-check and (if new) open a centered modal with two-step confirmation:
//    Step 1: 5s countdown (in-modal progress)
//    Step 2: 15s countdown (in-modal progress)
// - Modal is dismissable (X) and cancelable at any point; timers are cleaned up.
// - On final confirm the script stores the new version in localStorage.siteVersion and does location.reload(true).
// - If #download-progress exists we will use it as the bottom update bar during the final step; otherwise we create a temporary bottom bar.
// - This script injects its own CSS so no stylesheet edits are required.
//
// Drop this file into /assets/js/version-check.js (overwrite). Hard-refresh the page after deploy.

(function () {
  if (window.__ILF_VERSION_CHECK_LOADED) return;
  window.__ILF_VERSION_CHECK_LOADED = true;

  const VERSION_JSON = '/version.json';
  const CHECK_BTN_ID = 'check-update';
  const SITE_VERSION_KEY = 'siteVersion';
  const POLL_INTERVAL_MS = 15000; // 15s poll

  // ---- Inject styles for the modal & notifier ----
  (function injectStyles() {
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

  // ---- Utility / cleanup ----
  (function cleanupFloats() {
    try {
      const oldNav = document.getElementById('ilf-floating-nav');
      if (oldNav && oldNav.parentNode) oldNav.parentNode.removeChild(oldNav);
    } catch (e) {/* ignore */}
  })();

  // ---- Create modal / notifier DOM (if absent) ----
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
            <button class="ilf-btn secondary" id="ilf-confirm-btn" style="display:none;">Confirm</button>
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
          if (btn && typeof btn.onclick === 'function') btn.onclick();
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
      message: document.getElementById('ilf-update-message')
    };
  }

  // ---- Modal control + timers ----
  let step1Timer = null;
  let step2Timer = null;
  let step1Remaining = 0;
  let step2Remaining = 0;
  let linearAnimInterval = null;
  let bottomBarAnimation = null;

  function clearTimersAndHide() {
    if (step1Timer) { clearInterval(step1Timer); step1Timer = null; }
    if (step2Timer) { clearInterval(step2Timer); step2Timer = null; }
    if (linearAnimInterval) { clearInterval(linearAnimInterval); linearAnimInterval = null; }
    if (bottomBarAnimation) { clearInterval(bottomBarAnimation); bottomBarAnimation = null; }
    const els = ensureModalElements();
    if (els) {
      els.progressWrap.style.display = 'none';
      els.linearBar.style.width = '0%';
      els.countdownNum.textContent = '';
      els.confirmBtn.style.display = 'none';
      // hide bottom bar if we created it
      if (els.bottomBar) els.bottomBar.style.display = 'none';
      // hide backdrop
      if (els.backdrop) els.backdrop.style.display = 'none';
    }
  }

  // ---- New: force service worker update & wait for activation ----
  // This will:
  //  - set the version in localStorage
  //  - try to update the registration
  //  - instruct waiting worker to skipWaiting (if present)
  //  - wait for the new worker to activate, then reload once
  // Fallbacks to location.reload(true) on errors.
  function doFinalUpdate(latestVersion) {
    try { localStorage.setItem(SITE_VERSION_KEY, latestVersion); } catch (e) { /* ignore */ }

    if (!('serviceWorker' in navigator)) {
      try { location.reload(true); } catch (e) { location.reload(); }
      return;
    }

    // guard to ensure we reload exactly once
    let reloaded = false;
    function reloadOnce() {
      if (reloaded) return;
      reloaded = true;
      try { location.reload(true); } catch (e) { location.reload(); }
    }

    // If the SW activates and becomes controller, controllerchange will fire -> safe to reload
    const onControllerChange = () => {
      // slight delay to allow the new SW to take control
      setTimeout(reloadOnce, 150);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) {
        // no registration - just reload
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        reloadOnce();
        return;
      }

      // ask the registration to update its worker files (this should fetch the new precache manifest)
      reg.update().catch(() => { /* continue anyway */ });

      // If there's a waiting worker, tell it to skipWaiting (activate immediately)
      if (reg.waiting) {
        try {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch (e) { /* ignore */ }
        // Wait for controllerchange -> reload
        // if controller doesn't change, fallback to listening to the statechange on waiting
        if (reg.waiting.addEventListener) {
          reg.waiting.addEventListener('statechange', function sc(e) {
            if (e.target.state === 'activated') {
              // give controllerchange a chance to fire; but if it doesn't, reload anyway
              setTimeout(reloadOnce, 120);
            }
          });
        }
        return;
      }

      // Otherwise, maybe an installing worker is present -> watch it
      if (reg.installing) {
        const installing = reg.installing;
        installing.addEventListener('statechange', (evt) => {
          if (evt.target.state === 'installed') {
            // If it's installed and there's no waiting (rare), attempt to message skipWaiting
            if (reg.waiting) {
              try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
            }
          }
          if (evt.target.state === 'activated') {
            // activated -> reload
            setTimeout(reloadOnce, 120);
          }
        });
        return;
      }

      // No installing/waiting worker found; try to fetch an update and then reload as fallback
      // Give reg.update() a short grace period
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        reloadOnce();
      }, 1200);
    }).catch(err => {
      try { navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); } catch (e){ }
      reloadOnce();
    });
  }

  function showModalCenter(latestVersion, onFinalConfirm) {
    const els = ensureModalElements();
    if (!els) return;
    els.title.textContent = `Update available — v${latestVersion}`;
    els.message.innerHTML = `A newer version (${latestVersion}) is available. Click <strong>Confirm</strong> to start the update flow or <strong>Cancel</strong> to abort. Closing the dialog will also cancel.`;

    // show modal
    els.backdrop.style.display = 'flex';
    // Initialize UI
    els.progressWrap.style.display = 'none';
    els.linearBar.style.width = '0%';
    els.countdownNum.textContent = '';
    els.confirmBtn.style.display = 'inline-block';
    els.confirmBtn.disabled = false;
    els.cancelBtn.disabled = false;

    // wire close
    els.closeBtn.onclick = () => { clearTimersAndHide(); };

    // Cancel button
    els.cancelBtn.onclick = () => { clearTimersAndHide(); };

    // Confirm click -> run step 1 then step 2
    els.confirmBtn.onclick = () => {
      els.confirmBtn.disabled = true;
      // step 1
      runStepCountdown(5, 'Step 1: preparing update', els, async () => {
        // after step1 complete, present step2
        // show confirm again for final step
        els.confirmBtn.style.display = 'inline-block';
        els.confirmBtn.disabled = false;
        els.message.innerHTML = `Final confirmation required. This will reload the site to apply the update. You may cancel.`;
        // when confirm clicked for step2, start final countdown and run onFinalConfirm at finish
        els.confirmBtn.onclick = () => {
          els.confirmBtn.disabled = true;
          runStepCountdown(15, 'Finalizing update', els, async () => {
            // show bottom bar progress while we perform final actions
            try {
              // reveal bottom bar (use existing #download-progress if present)
              const existingBottom = document.getElementById('download-progress');
              if (existingBottom) {
                existingBottom.style.display = 'block';
                // if it has .bar inside, update that later via service worker messages if any
              } else {
                // reveal our own bottom bar
                if (els.bottomBar) els.bottomBar.style.display = 'block';
              }

              // call final action (store version, reload/update SW)
              if (typeof onFinalConfirm === 'function') onFinalConfirm();
            } catch (e) {
              console.error('final update step error', e);
              clearTimersAndHide();
            }
          });
        };
      });
    };
  }

  // runs a step countdown with in-modal progress visual
  function runStepCountdown(seconds, label, els, doneCallback) {
    // prepare UI
    els.progressWrap.style.display = 'block';
    els.message.textContent = label;
    const linear = els.linearBar;
    const circle = els.countdownNum;
    linear.style.width = '0%';
    circle.textContent = String(seconds);

    // clear any previous timers
    if (step1Timer) { clearInterval(step1Timer); step1Timer = null; }
    if (step2Timer) { clearInterval(step2Timer); step2Timer = null; }
    if (linearAnimInterval) { clearInterval(linearAnimInterval); linearAnimInterval = null; }

    const start = Date.now();
    const total = Math.max(1, seconds);
    let elapsed = 0;

    // update every 200ms for smoother bar movement
    linearAnimInterval = setInterval(() => {
      elapsed = (Date.now() - start) / 1000;
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      linear.style.width = pct + '%';
    }, 200);

    // countdown integer update every 1s
    let remaining = total;
    const interval = setInterval(() => {
      remaining--;
      circle.textContent = String(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(interval);
        if (linearAnimInterval) { clearInterval(linearAnimInterval); linearAnimInterval = null; linear.style.width = '100%'; }
        // small delay to show full bar
        setTimeout(() => {
          // done
          if (typeof doneCallback === 'function') doneCallback();
        }, 360);
      }
    }, 1000);

    // store ref so it can be canceled externally
    if (seconds <= 5) step1Timer = interval; else step2Timer = interval;
  }

  // ---- Badge + notifier + poll logic ----

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

  // immediate click handler (always enabled)
  function bindImmediateClick() {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    // ensure it's clickable
    btn.classList.remove('btn-disabled');
    btn.onclick = async () => {
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
              // ensure bottom progress visible (use existing download-progress if present)
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
              // Use SW-aware final update which will try to update the SW, skip waiting, wait for activation, then reload
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
      }
    } catch (err) {
      // silent
    }
  }

  // Start up
  (function start() {
    // ensure our elements exist
    ensureModalElements();
    // bind click to refresh button
    bindImmediateClick();
    // initial poll & set interval
    pollOnce();
    setInterval(pollOnce, POLL_INTERVAL_MS);

    // Wire service worker progress messages (if present) into the bottom bar so real SW updates show progress
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.active; // no-op, ensure ready
          navigator.serviceWorker.addEventListener('message', ev => {
            if (!ev.data) return;
            // handle pre-cache progress messages like earlier code
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
