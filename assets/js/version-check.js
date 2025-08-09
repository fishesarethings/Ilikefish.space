// assets/js/version-check.js
// Centralized version check with polling, floating notifier, small floating nav.
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
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').innerHTML = messageHtml;
    document.getElementById('modal-buttons').innerHTML = buttonsHtml;
    backdrop.style.display = 'flex';
    backdrop.removeAttribute('aria-hidden');
  }

  function closeModal() {
    const b = document.getElementById('modal-backdrop');
    if (b) { b.style.display = 'none'; b.setAttribute('aria-hidden','true'); }
  }

  function runUpdateFlow(latest) {
    // Step 1 (5s countdown)
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

    document.getElementById('cancel1').onclick = () => { clearInterval(interval1); closeModal(); };

    document.getElementById('confirm1').onclick = () => {
      clearInterval(interval1);
      // Step 2 (15s)
      let cd2 = 15;
      showModal('Are you sure?', `Are you sure you want to update? Proceed in <span class="countdown" id="cd2">${cd2}</span>s.`,
        `<button id="confirm2" disabled>Yes, proceed</button> <button id="cancel2">Cancel</button>`
      );

      const interval2 = setInterval(() => {
        cd2--;
        const el = document.getElementById('cd2');
        if (el) el.textContent = cd2;
        if (cd2 <= 0) {
          clearInterval(interval2);
          const c2 = document.getElementById('confirm2');
          if (c2) c2.disabled = false;
        }
      }, 1000);

      document.getElementById('cancel2').onclick = () => { clearInterval(interval2); closeModal(); };

      document.getElementById('confirm2').onclick = () => {
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
        // clicking the notifier opens the refresh modal flow (which will re-check and show flow)
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

  function createFloatingNav() {
    if (document.getElementById('ilf-floating-nav')) return;
    const wrap = document.createElement('nav');
    wrap.id = 'ilf-floating-nav';
    wrap.style.position = 'fixed';
    wrap.style.right = '12px';
    wrap.style.top = '50%';
    wrap.style.transform = 'translateY(-50%)';
    wrap.style.zIndex = '1500';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';
    wrap.style.alignItems = 'center';
    // small buttons for sections
    const items = [
      { href:'#hero-title', label:'Home' },
      { href:'#featured-games', label:'Featured' },
      { href:'#all-games', label:'Games' },
      { href:'#address', label:'Server' }
    ];
    items.forEach(it => {
      const a = document.createElement('a');
      a.href = it.href;
      a.textContent = it.label[0]; // single char label (keeps it small)
      a.title = it.label;
      a.style.background = 'rgba(255,255,255,0.92)';
      a.style.border = '1px solid rgba(0,0,0,0.06)';
      a.style.width = '36px';
      a.style.height = '36px';
      a.style.display = 'flex';
      a.style.alignItems = 'center';
      a.style.justifyContent = 'center';
      a.style.borderRadius = '8px';
      a.style.boxShadow = '0 8px 20px rgba(2,6,23,0.06)';
      a.style.color = '#123';
      a.style.textDecoration = 'none';
      a.style.fontWeight = '700';
      a.style.fontSize = '14px';
      a.style.cursor = 'pointer';
      a.addEventListener('mouseover', () => a.style.transform = 'translateY(-3px)');
      a.addEventListener('mouseout', () => a.style.transform = 'translateY(0)');
      wrap.appendChild(a);
    });
    document.body.appendChild(wrap);
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
          // seed (so future diffs make sense)
          try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
          alert('Version stored. No update required.');
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
      // console.warn('version poll failed', err);
    }
  }

  // start
  (function start() {
    // create small floating nav (non-invasive)
    createFloatingNav();
    // bind click immediatly (button active)
    bindImmediateClick();
    // initial poll + periodic
    pollOnce();
    setInterval(pollOnce, POLL_INTERVAL_MS);
  })();
}
