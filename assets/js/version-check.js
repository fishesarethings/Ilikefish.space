// version-check.js
// - Seeds localStorage.siteVersion if missing (no clearing).
// - Polls /version.json every 30s to detect new versions while page is open.
// - When a newer version is found, enables the footer Refresh button and adds badge.
// - Clicking the Refresh button fetches /version.json immediately and runs the centered modal if new.

// Defensive single-load
if (window.__ILF_VERSION_CHECK_LOADED) {
  // already loaded
} else {
  window.__ILF_VERSION_CHECK_LOADED = true;

  const VERSION_JSON = '/version.json';
  const CHECK_BTN_ID = 'check-update';
  const SITE_VERSION_KEY = 'siteVersion';
  const POLL_INTERVAL_MS = 30000; // 30s

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

  // two-step confirm flow
  function runUpdateFlow(latest) {
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

  // mark button enabled + badge + bind click
  function enableCheckButton(latest) {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    btn.classList.remove('btn-disabled');
    // add badge only once
    if (!btn.querySelector('.update-badge')) {
      const badge = document.createElement('span');
      badge.className = 'update-badge';
      badge.textContent = 'new';
      btn.appendChild(badge);
    }
    // click should double-check latest and then run flow
    btn.onclick = async () => {
      try {
        const res = await fetch(VERSION_JSON, { cache: 'no-store' });
        if (!res.ok) { alert('Could not check updates'); return; }
        const j = await res.json();
        const l = String(j.version || '').trim();
        const storedNow = localStorage.getItem(SITE_VERSION_KEY);
        if (!l || l === storedNow) { alert('No updates available.'); return; }
        runUpdateFlow(l);
      } catch (err) {
        alert('Could not check updates.');
      }
    };
  }

  // check /version.json and seed if missing
  async function checkVersion() {
    try {
      const resp = await fetch(VERSION_JSON, { cache: 'no-store' });
      if (!resp.ok) return;
      const json = await resp.json();
      const latest = String(json.version || '').trim();
      if (!latest) return;

      // display current version element if exists
      const cv = document.getElementById('current-site-version');
      if (cv) cv.textContent = latest;

      const stored = localStorage.getItem(SITE_VERSION_KEY);
      if (!stored) {
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
        return;
      }

      if (stored !== latest) {
        enableCheckButton(latest);
      } else {
        const btn = document.getElementById(CHECK_BTN_ID);
        if (btn) btn.classList.add('btn-disabled');
      }
    } catch (err) {
      // silently ignore
      console.warn('version-check error', err);
    }
  }

  // initial check + periodic poll
  (async function start() {
    await checkVersion();
    setInterval(checkVersion, POLL_INTERVAL_MS);
  })();
}
