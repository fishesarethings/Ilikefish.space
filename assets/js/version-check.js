// Centralized version check (updated behavior):
// - Edit /version.json only
// - Do NOT auto-show modal. Only enable the "check-update" button if a newer version exists.
// - The user must click the button to start the two-step modal confirmation.
// - Preserves localStorage (no clear).

(function () {
  if (window.__ILF_VERSION_CHECK_LOADED) return;
  window.__ILF_VERSION_CHECK_LOADED = true;

  const VERSION_JSON = '/version.json';
  const CHECK_BTN_ID = 'check-update';
  const SITE_VERSION_KEY = 'siteVersion';

  // ensure modal exists (same as before)
  function ensureModal() {
    let backdrop = document.getElementById('modal-backdrop');
    if (backdrop) return backdrop;
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
    return backdrop;
  }

  function showModal(title, htmlMessage, buttonsHtml) {
    const backdrop = ensureModal();
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-message');
    const btnEl = document.getElementById('modal-buttons');
    titleEl.textContent = title;
    msgEl.innerHTML = htmlMessage;
    btnEl.innerHTML = buttonsHtml;
    backdrop.style.display = 'flex';
    backdrop.removeAttribute('aria-hidden');
  }

  // Two-step confirm flow (called when user clicks update)
  function runUpdateFlow(latest) {
    // Step 1
    let countdown = 5;
    showModal('Confirm Refresh', `Warning: proceeding will reload the site.<br>Confirm in <span class="countdown" id="cd1">${countdown}</span>s.`,
      `<button id="confirm1" class="primary">Confirm</button> <button id="cancel1">Cancel</button>`
    );

    const confirm1 = document.getElementById('confirm1');
    const cancel1 = document.getElementById('cancel1');
    confirm1.disabled = true;

    const t1 = setInterval(() => {
      countdown--;
      const el = document.getElementById('cd1');
      if (el) el.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(t1);
        confirm1.disabled = false;
      }
    }, 1000);

    cancel1.onclick = () => {
      clearInterval(t1);
      document.getElementById('modal-backdrop').style.display = 'none';
    };

    confirm1.onclick = () => {
      clearInterval(t1);
      let cd2 = 15;
      showModal('Are you sure?', `Are you sure you want to update? Proceed in <span class="countdown" id="cd2">${cd2}</span>s.`,
        `<button id="confirm2" class="primary">Yes, proceed</button> <button id="cancel2">Cancel</button>`
      );

      const confirm2 = document.getElementById('confirm2');
      const cancel2 = document.getElementById('cancel2');
      confirm2.disabled = true;

      const t2 = setInterval(() => {
        cd2--;
        const el = document.getElementById('cd2');
        if (el) el.textContent = cd2;
        if (cd2 <= 0) {
          clearInterval(t2);
          confirm2.disabled = false;
        }
      }, 1000);

      cancel2.onclick = () => {
        clearInterval(t2);
        document.getElementById('modal-backdrop').style.display = 'none';
      };

      confirm2.onclick = () => {
        clearInterval(t2);
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
        location.reload(true);
      };
    };
  }

  // Bind the check button to manual update flow
  function bindCheckButton(latest) {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    // ensure initial disabled state handled by CSS/class from HTML
    btn.addEventListener('click', async () => {
      // If there is no latest provided (call fetch now)
      let latestVer = latest;
      if (!latestVer) {
        try {
          const res = await fetch(VERSION_JSON, { cache: 'no-store' });
          const j = await res.json();
          latestVer = String(j.version || '').trim();
        } catch (e) {
          alert('Could not fetch version info.');
          return;
        }
      }
      if (!latestVer) { alert('No version info found.'); return; }
      const stored = localStorage.getItem(SITE_VERSION_KEY);
      if (stored === latestVer) {
        alert('No updates available.');
        return;
      }
      // run the two-step flow
      runUpdateFlow(latestVer);
    });
  }

  // Show small badge next to the check-update button when new version exists
  function markUpdateAvailable(btn, latest) {
    if (!btn) return;
    btn.classList.remove('btn-disabled');
    // add small badge if not already present
    if (!btn.querySelector('.update-badge')) {
      const badge = document.createElement('span');
      badge.className = 'update-badge';
      badge.textContent = 'new';
      btn.appendChild(badge);
    }
  }

  // Main check (non-intrusive)
  async function checkVersion() {
    try {
      const res = await fetch(VERSION_JSON, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      const latest = String(json.version || '').trim();
      if (!latest) return null;

      const stored = localStorage.getItem(SITE_VERSION_KEY);
      // seed stored version if missing (do NOT clear data)
      if (!stored) {
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){}
      }

      // show version in footer if present
      const currentVersionEl = document.getElementById('current-site-version');
      if (currentVersionEl) currentVersionEl.textContent = latest;

      // enable check button only when newer version exists
      const btn = document.getElementById(CHECK_BTN_ID);
      if (btn && stored && stored !== latest) {
        markUpdateAvailable(btn, latest);
      }
      // bind button so click will fetch/run flow if needed
      bindCheckButton(latest);
      return { stored, latest };
    } catch (err) {
      // ignore silently - do not interrupt UX
      bindCheckButton(null);
      return null;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkVersion);
  } else {
    checkVersion();
  }
})();
