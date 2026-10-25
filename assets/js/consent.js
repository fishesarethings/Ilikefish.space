/*
 * Shared consent manager for ILikeFish.Space.
 *
 *  - Google Consent Mode v2 is set to "denied" by default (inline, before any
 *    Google tag loads) and updated only after a choice is made.
 *  - Inside the EEA/UK/CH, Google's certified consent message (AdSense >
 *    Privacy & messaging) is the source of truth. When it is present this
 *    banner stays hidden and Google handles the ad/analytics consent state.
 *  - Elsewhere this banner is the consent UI, and a small "Privacy choices"
 *    button stays on the page so consent is as easy to withdraw as to give.
 *
 * Exposes window.ILF_CONSENT for other scripts.
 */
(function () {
  'use strict';

  var KEY = 'ilf_consent_v2';
  var GA_ID = 'G-ZV53VVVSK3';
  var GTM_ID = 'GTM-53BRKJPX';

  var state = { analytics: false, ads: false, saved: false, googleCmp: false };
  var banner, panel, pill, toggleAnalytics, toggleAds;

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  function write(consent) {
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch (e) { /* ignore */ }
  }

  function updateConsentMode(analytics, ads) {
    gtag('consent', 'update', {
      ad_storage: ads ? 'granted' : 'denied',
      ad_user_data: ads ? 'granted' : 'denied',
      ad_personalization: ads ? 'granted' : 'denied',
      analytics_storage: analytics ? 'granted' : 'denied'
    });
  }

  function injectScript(src) {
    if (Array.from(document.scripts).some(function (s) { return s.src === src; })) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function loadAnalytics() {
    if (state._analyticsLoaded) return;
    state._analyticsLoaded = true;
    injectScript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID);
    injectScript('https://www.googletagmanager.com/gtm.js?id=' + GTM_ID);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function activateAds() {
    if (window.ILF_ADS && window.ILF_ADS.activate) window.ILF_ADS.activate();
    window.dispatchEvent(new CustomEvent('ilf:consent', {
      detail: { analytics: state.analytics, ads: state.ads, googleCmp: state.googleCmp }
    }));
  }

  function showPill(show) {
    if (pill) pill.setAttribute('data-visible', show ? '1' : '0');
  }

  function hideBanner() { if (banner) banner.hidden = true; }
  function showBanner() { if (banner) banner.hidden = false; showPill(false); }
  function closePanel() { if (panel) panel.setAttribute('aria-hidden', 'true'); }

  function openPanel() {
    if (!panel) return;
    var saved = read() || {};
    if (toggleAnalytics) toggleAnalytics.checked = !!saved.analytics;
    if (toggleAds) toggleAds.checked = !!saved.ads;
    panel.setAttribute('aria-hidden', 'false');
    hideBanner();
  }

  function apply(consent, persist) {
    state.analytics = !!consent.analytics;
    state.ads = !!consent.ads;
    state.saved = true;
    if (persist) write({ necessary: true, analytics: state.analytics, ads: state.ads, timestamp: Date.now() });
    updateConsentMode(state.analytics, state.ads);
    if (state.analytics) loadAnalytics();
    if (state.ads) activateAds();
    hideBanner();
    closePanel();
    showPill(true);
  }

  function detectGoogleCmp() {
    return new Promise(function (resolve) {
      var tries = 0;
      (function poll() {
        if (window.googlefc) { resolve(true); return; }
        if (++tries > 12) { resolve(false); return; }
        setTimeout(poll, 250);
      })();
    });
  }

  function buildUi() {
    banner = document.createElement('div');
    banner.id = 'ilf-cookie-banner';
    banner.className = 'cookie-banner ilf-consent-root';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.hidden = true;
    banner.innerHTML =
      '<div class="ilfc-icon" aria-hidden="true">🛡️</div>' +
      '<div class="ilfc-text"><strong>Can we use cookies?</strong> Essential storage runs the games and keeps your ' +
      'progress - that always works, no choice needed. With your OK we would also use analytics and ad cookies, ' +
      'which is what keeps the arcade free. There are never ads inside the games themselves. ' +
      'Read the <a href="/privacy.html">Privacy Policy</a>.</div>' +
      '<div class="ilfc-actions">' +
      '<button id="ilf-accept-all" class="ilfc-btn ilfc-accept" type="button">Accept all</button>' +
      '<button id="ilf-reject-all" class="ilfc-btn ilfc-reject" type="button">Reject all</button>' +
      '<button id="ilf-open-settings" class="ilfc-btn ilfc-manage" type="button">Manage choices</button>' +
      '</div>';

    panel = document.createElement('div');
    panel.id = 'ilf-cookie-panel';
    panel.className = 'cookie-settings-panel ilf-consent-root';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Privacy choices');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<h3 class="ilfc-title"><span aria-hidden="true">🛡️</span> Privacy choices</h3>' +
      '<p class="ilfc-sub">You can change these whenever you like - this button stays on every page, and there is a ' +
      'link in the footer too. Details in the <a href="/privacy.html">Privacy Policy</a>.</p>' +
      '<div class="ilfc-row">' +
      '<div><div class="ilfc-name">Essential</div><div class="ilfc-why">Game progress, streaks, unlocked colours and ' +
      'settings. Stored in your own browser, never uploaded.</div></div>' +
      '<div class="ilfc-state">Always on</div>' +
      '</div>' +
      '<div class="ilfc-row">' +
      '<div><div class="ilfc-name">Analytics</div><div class="ilfc-why">Anonymous Google Analytics so we can see which ' +
      'games get played and what is broken.</div></div>' +
      '<label class="ilfc-switch"><input id="ilf-toggle-analytics" type="checkbox" aria-label="Allow analytics"><span class="ilfc-knob"></span></label>' +
      '</div>' +
      '<div class="ilfc-row">' +
      '<div><div class="ilfc-name">Ad cookies</div><div class="ilfc-why">Lets Google show relevant ads in the labelled ' +
      'boxes outside the game area. Say no and ads may still appear, but they will not be personalised.</div></div>' +
      '<label class="ilfc-switch"><input id="ilf-toggle-ads" type="checkbox" aria-label="Allow ad cookies"><span class="ilfc-knob"></span></label>' +
      '</div>' +
      '<p class="ilfc-note">Visitors in the EEA, the UK and Switzerland see Google\'s own certified consent message ' +
      'instead, because advertising consent in those regions is handled by Google rather than by this banner.</p>' +
      '<div class="ilfc-panel-actions">' +
      '<button id="ilf-cancel-settings" class="ilfc-btn ilfc-reject" type="button">Cancel</button>' +
      '<button id="ilf-save-settings" class="ilfc-btn ilfc-save" type="button">Save choices</button>' +
      '</div>';

    pill = document.createElement('button');
    pill.id = 'ilf-privacy-pill';
    pill.className = 'privacy-pill ilf-consent-root';
    pill.type = 'button';
    pill.setAttribute('aria-label', 'Open privacy choices');
    pill.setAttribute('data-visible', '0');
    pill.innerHTML = '<span aria-hidden="true">🛡️</span> Privacy choices';

    document.body.appendChild(banner);
    document.body.appendChild(panel);
    document.body.appendChild(pill);

    toggleAnalytics = panel.querySelector('#ilf-toggle-analytics');
    toggleAds = panel.querySelector('#ilf-toggle-ads');

    banner.querySelector('#ilf-accept-all').addEventListener('click', function () {
      apply({ analytics: true, ads: true }, true);
    });
    banner.querySelector('#ilf-reject-all').addEventListener('click', function () {
      apply({ analytics: false, ads: false }, true);
    });
    banner.querySelector('#ilf-open-settings').addEventListener('click', openPanel);
    pill.addEventListener('click', openPanel);
    panel.querySelector('#ilf-save-settings').addEventListener('click', function () {
      apply({ analytics: !!(toggleAnalytics && toggleAnalytics.checked), ads: !!(toggleAds && toggleAds.checked) }, true);
    });
    panel.querySelector('#ilf-cancel-settings').addEventListener('click', function () {
      closePanel();
      showPill(state.saved || state.googleCmp);
    });

    // Any link pointing at #cookie-settings (footers, policy pages) opens the panel.
    document.addEventListener('click', function (event) {
      var target = event.target;
      var link = target && target.closest ? target.closest('a[href$="#cookie-settings"], #cookie-settings-link') : null;
      if (!link) return;
      event.preventDefault();
      openPanel();
    });
  }

  function boot() {
    buildUi();

    var saved = read();
    if (saved) apply(saved, false);

    detectGoogleCmp().then(function (hasCmp) {
      state.googleCmp = hasCmp;
      if (hasCmp) {
        // Google's certified CMP owns consent for EEA/UK/CH visitors.
        hideBanner();
        state.analytics = true;
        state.ads = true;
        loadAnalytics();
        activateAds();
        showPill(true);
        return;
      }
      if (!saved) showBanner();
    });
  }

  window.ILF_CONSENT = {
    get: function () { return { analytics: state.analytics, ads: state.ads, googleCmp: state.googleCmp }; },
    adsAllowed: function () { return state.ads || state.googleCmp; },
    analyticsAllowed: function () { return state.analytics || state.googleCmp; },
    openSettings: openPanel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
