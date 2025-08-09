// Centralized version-check + old-style centered modal.
// - Edit /version.json only to bump version.
// - The script seeds localStorage.siteVersion if missing.
// - If a newer version exists, the small "Refresh" button is enabled and gets a red "new" badge.
// - Modal only appears after the user clicks the button. Modal is centered (uses existing modal markup).
// - Preserves localStorage/sessionStorage (does NOT clear them).
// - On final confirmation it sets localStorage.siteVersion to latest and reloads (force reload).

(function () {
  if (window.__ILF_VERSION_CHECK_LOADED) return;
  window.__ILF_VERSION_CHECK_LOADED = true;

  const VERSION_JSON = '/version.json';
  const CHECK_BTN_ID = 'check-update';
  const SITE_VERSION_KEY = 'siteVersion';

  // ensure modal markup exists (we rely on pages including #modal-backdrop)
  function ensureModalExists() {
    const backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) {
      // if a page didn't include modal, create one (defensive)
      const d = document.createElement('div');
      d.id = 'modal-backdrop';
      d.className = 'modal-backdrop';
      d.style.display = 'none';
      d.innerHTML = `
        <div class="modal" id="modal">
          <button class="close" id="modal-close" aria-label="Close">&times;</button>
          <h2 id="modal-title"></h2>
          <p id="modal-message"></p>
          <div id="modal-buttons"></div>
        </div>
      `;
      document.body.appendChild(d);
      document.getElementById('modal-close').addEventListener('click', () => { d.style.display = 'none'; d.setAttribute('aria-hidden','true'); });
      return d;
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

  // run two-step confirm flow (centered modal)
  function runUpdateFlow(latest) {
    // Step 1: 5s countdown
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
      // Step 2: 15s countdown
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
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch (e) { /* ignore */ }
        location.reload(true);
      };
    };
  }

  // enable check button and add a small badge
  function enableCheckButton(latest) {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    btn.classList.remove('btn-disabled');
    btn.setAttribute('aria-pressed','false');
    // add small badge if not present
    if (!btn.querySelector('.update-badge')) {
      const b = document.createElement('span');
      b.className = 'update-badge';
      b.textContent = 'new';
      btn.appendChild(b);
    }
    // bind click to run update flow (use latest captured closure)
    btn.onclick = () => runUpdateFlow(latest);
  }

  // main check function
  async function checkVersion() {
    try {
      const res = await fetch(VERSION_JSON, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const latest = String(json.version || '').trim();
      if (!latest) return;

      // show latest in footer if element present
      const currentEl = document.getElementById('current-site-version');
      if (currentEl) currentEl.textContent = latest;

      const stored = localStorage.getItem(SITE_VERSION_KEY);
      if (!stored) {
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){ /* ignore */ }
        // seeded; no further action
        // also bind click handler so it still works if user manually clicks (it will fetch again)
        const btn = document.getElementById(CHECK_BTN_ID);
        if (btn) btn.onclick = async () => {
          // manual check -> run flow if different
          const r = await fetch(VERSION_JSON, { cache: 'no-store' });
          const j = await r.json();
          const l = String(j.version || '').trim();
          if (l && l !== localStorage.getItem(SITE_VERSION_KEY)) runUpdateFlow(l);
          else alert('No updates available.');
        };
        return;
      }

      if (stored !== latest) {
        // enable the small refresh button (do not auto-show the modal)
        enableCheckButton(latest);
      } else {
        // same version: ensure button is disabled
        const btn = document.getElementById(CHECK_BTN_ID);
        if (btn) btn.classList.add('btn-disabled');
      }
    } catch (err) {
      // ignore silently - do not break UX
      console.warn('version-check failed', err);
    }
  }

  // run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkVersion);
  } else {
    checkVersion();
  }
})();
