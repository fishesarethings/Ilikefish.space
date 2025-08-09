// Centralized version check and modal flow.
// Edit /version.json (single file) to bump version across the site.
// This script will:
//  - fetch /version.json on load (no-store cache)
//  - if stored version missing -> seed it
//  - if fetched version differs from stored one -> show a two-step modal + countdown;
//    on final confirm it sets siteVersion to the fetched value and reloads the page.
//  - preserves all localStorage/sessionStorage (does NOT clear them).
//  - binds to an element with id="check-update" if present.

(function () {
  if (window.__ILF_VERSION_CHECK_LOADED) return;
  window.__ILF_VERSION_CHECK_LOADED = true;

  const VERSION_JSON = '/version.json';
  const CHECK_BTN_ID = 'check-update';
  const SITE_VERSION_KEY = 'siteVersion';

  // create modal if not present (keeps markup minimal)
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

  // two-step confirm flow similar to original
  async function runUpdateFlow(latest) {
    try {
      // Step 1: short countdown
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
        // Step 2: longer countdown & final confirmation
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
          // Finalize: set version and reload. Preserve localStorage content!
          try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){ /* ignore storage errors */ }
          location.reload(true);
        };
      };
    } catch (err) {
      console.error('version-check flow error', err);
      alert('Update flow failed — check console.');
    }
  }

  // Show a small unobtrusive banner if new version detected (optional)
  function showBanner(latest) {
    // create only if not present
    if (document.getElementById('ilf-update-banner')) return;
    const b = document.createElement('div');
    b.id = 'ilf-update-banner';
    b.style.position = 'fixed';
    b.style.left = '50%';
    b.style.transform = 'translateX(-50%)';
    b.style.bottom = '1rem';
    b.style.background = '#111';
    b.style.color = '#fff';
    b.style.padding = '.6rem 1rem';
    b.style.borderRadius = '8px';
    b.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
    b.style.zIndex = '1500';
    b.innerHTML = `A new site version is available (${latest}). <button id="ilf-update-now" style="margin-left:.6rem;padding:.35rem .6rem;border-radius:6px;border:none;cursor:pointer;background:#007aff;color:#fff">Update</button>`;
    document.body.appendChild(b);
    document.getElementById('ilf-update-now').addEventListener('click', () => runUpdateFlow(latest));
  }

  // Main check logic
  async function checkVersion(onClickOnly = false) {
    try {
      const res = await fetch(VERSION_JSON, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      const latest = String(json.version || '').trim();
      if (!latest) return null;

      // show current version in footer if present
      const currentVersionEl = document.getElementById('current-site-version');
      if (currentVersionEl) currentVersionEl.textContent = latest;

      const stored = localStorage.getItem(SITE_VERSION_KEY);
      // If no stored version, seed it (do not force reload)
      if (!stored) {
        try { localStorage.setItem(SITE_VERSION_KEY, latest); } catch(e){ /* ignore */ }
        return { stored: latest, latest };
      }

      if (stored !== latest) {
        // show banner and, if not onClickOnly, open the modal automatically
        showBanner(latest);
        if (!onClickOnly) {
          // Wait a little to avoid interrupting page rendering
          setTimeout(() => runUpdateFlow(latest), 800);
        }
      }
      return { stored, latest };
    } catch (err) {
      // silently ignore network errors
      return null;
    }
  }

  // Bind check-update button (if present)
  function bindCheckButton() {
    const btn = document.getElementById(CHECK_BTN_ID);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const result = await checkVersion(true);
      if (!result) {
        alert('Could not fetch version info.');
        return;
      }
      if (result.latest === localStorage.getItem(SITE_VERSION_KEY)) {
        alert('No updates available.');
      } else {
        // show manual update flow
        runUpdateFlow(result.latest);
      }
    });
  }

  // Start (on load)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bindCheckButton(); checkVersion(false); });
  } else {
    bindCheckButton(); checkVersion(false);
  }
})();
