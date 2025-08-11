// assets/js/version-check.js
// Centralized version check with polling and floating notifier.
// NOTE: Floating navigation removed (was causing vertical single-letter buttons).
// - Button is actionable always (click checks immediately).
// - Polls /version.json every 15s to detect new versions and shows badge + notifier.
// - Modal flow is the same centered 2-step confirm and preserves localStorage (no clearing).

if (window.__ILF_VERSION_CHECK_LOADED) {
  // already loaded
} else {
  window.__ILF_VERSION_CHECK_LOADED = true;

  const VERSION_JSON = '/version.json';
  const CHECK_BTN_ID = 'check-update';
  const SITE_VERSION_KEY = 'siteVersion';
  const POLL_INTERVAL_MS = 15000; // 15s poll

  // remove any previously-inserted floating nav (safety cleanup)
  (function cleanupFloatingNav() {
    try {
      const n = document.getElementById('ilf-floating-nav');
      if (n && n.parentNode) n.parentNode.removeChild(n);
      // also remove any small single-character anchors if created differently
      const possible = document.querySelectorAll('[data-ilf-fn]');
      possible.forEach(el => el.remove());
    } catch(e){ /* ignore */ }
  })();

  function ensureModalExists() {
    let backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      backdrop.className = 'modal-backdrop';
      backdrop.style.display = 'none';
      backdrop.innerHTML = `
        <div class="modal" id="modal">
          <button class="close" id="modal-close" aria-label="Close">&times;</button>
          <h2 id="modal-title"></h2>
          <p id="modal-message"></p>
          <div id="modal-buttons"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
      document.getElementById('modal-close').addEventListener('click', () => { backdrop.style.display = 'none'; backdrop.setAttribute('aria-hidden','true'); });
    }
    return backdrop;
  }

  function showModal(title, messageHtml, buttonsHtml) {
    const backdrop = ensureModalExists();
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    const btnsEl = document.getElementById('modal-buttons');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = messageHtml;
    if (btnsEl) btnsEl.innerHTML = buttonsHtml;
    backdrop.style.display = 'flex';
    backdrop.removeAttribute('aria-hidden');
  }

  function closeModal() {
    const b = document.getElementById('modal-backdrop');
    if (b) { b.style.display = 'none'; b.setAttribute('aria-hidden','true'); }
  }

  function runUpdateFlow(latest) {
    // Step 1 (5s)
    let countdown = 5;
    showModal('Confirm Refresh', `Warning: proceeding will reload the site.<br>Confirm in <span class="countdown" id="cd1">${countdown}</span>s.`,
      `<button id="confirm1" disabled>Confirm</button> <button id="cancel1">Cancel</button>`
    );

    const interval1 = setInterval(() => {
      countdown--;
      const el = document.getElementById('cd1');
      if (el) el.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(interval1);
        const c1 = document.getElementById('confirm1');
        if (c1) c1.disabled = false;
      }
    }, 1000);

    const cancel1 = document.getElementById('cancel1');
    if (cancel1) cancel1.onclick = () => { clearInterval(interval1); closeModal(); };

    const confirm1 = document.getElementById('confirm1');
    if (confirm1) confirm1.onclick = () => {
      clearInterval(interval1);
      // Step 2 (15s)
      let cd2 = 15;
      showModal('Are you sure?', `Are you sure you want to update? Proceed in <span class="countdown" id="cd2">${cd2}</span>s.`,
        `<button id="confirm2" disabled>Yes, proceed</button> <button id="cancel2">Cancel</button>`
      );

      const interval2 = setInterval(() => {
        cd2--;
        const el2 = document.getElementById('cd2');
        if (el2) el2.textContent = cd2;
        if (cd2 <= 0) {
          clearInterval(interval2);
          const c2 = document.getElementById('confirm2');
          if (c2) c2.disabled = false;
        }
      }, 1000);

      const cancel2 = document.getElementById('cancel2');
      if (cancel2) cancel2.onclick = () => { clearInterval(interval2); closeModal(); };

      const confirm2 = document.getElementById('confirm2');
      if (confirm2) confirm2.onclick = () => {
        clearInterval(interval2);
        closeModal();
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
        location.reload(true);
      };
    };
  }

  function createFloatingNotifier(text) {
    // if already exists, reuse & update text
    let n = document.getElementById('ilf-floating-notif');
    if (!n) {
      n = document.createElement('div');
      n.id = 'ilf-floating-notif';
      n.setAttribute('role','status');
      n.style.position = 'fixed';
      n.style.top = '14px';
      n.style.right = '14px';
      n.style.background = 'linear-gradient(180deg,#ff5f5f,#d93f3f)';
      n.style.color = '#fff';
      n.style.padding = '10px 14px';
      n.style.borderRadius = '10px';
      n.style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)';
      n.style.zIndex = '2200';
      n.style.fontWeight = '700';
      n.style.fontSize = '13px';
      n.style.cursor = 'pointer';
      n.addEventListener('click', () => {
        const btn = document.getElementById(CHECK_BTN_ID);
        if (btn && typeof btn.onclick === 'function') btn.onclick();
      });
      document.body.appendChild(n);
    }
    n.textContent = text;
    n.style.display = 'block';
    // auto-hide after 10s but leave badge on refresh button
    setTimeout(() => { try { n.style.display = 'none'; } catch(e){} }, 10000);
  }

  function addBadgeToButton() {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    if (!btn.querySelector('.update-badge')) {
      const b = document.createElement('span');
      b.className = 'update-badge';
      b.textContent = 'new';
      b.style.marginLeft = '6px';
      btn.appendChild(b);
    }
  }

  // immediate click handler (always enabled)
  function bindImmediateClick() {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    // remove disabled class if present
    btn.classList.remove('btn-disabled');
    btn.onclick = async () => {
      try {
        const url = VERSION_JSON + '?t=' + Date.now();
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) { alert('Could not check updates'); return; }
        const j = await res.json();
        const latest = String(j.version || '').trim();
        const stored = localStorage.getItem(SITE_VERSION_KEY);
        if (!latest) { alert('No version info'); return; }
        // show latest in footer if present
        const curEl = document.getElementById('current-site-version');
        if (curEl) curEl.textContent = latest;
        if (!stored) {
          try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
          alert('Version recorded. No update required.');
          return;
        }
        if (stored !== latest) {
          runUpdateFlow(latest);
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
        // seed local version to server version to avoid false positive
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
        stored = latest;
      }

      if (stored !== latest) {
        // new version found
        addBadgeToButton();
        createFloatingNotifier('Update available — click Refresh to update');
      }
    } catch (err) {
      // ignore network errors silently
    }
  }

  // start
  (function start() {
    // bind click immediatly (button active)
    bindImmediateClick();
    // initial poll + periodic
    pollOnce();
    setInterval(pollOnce, POLL_INTERVAL_MS);
  })();
}
