/*
 * Shared consent manager for ILikeFish.Space.
 *
 * Rules it implements:
 *  - Google Consent Mode v2 is set to "denied" by default (inline, before any
 *    Google tag loads) and updated only after a choice is made.
 *  - Inside the EEA/UK/CH, Google's certified consent message (AdSense >
 *    Privacy & messaging) is the source of truth. When it is present, this
 *    banner stays hidden and Google handles the ad/analytics consent state.
 *  - Elsewhere, this banner is the consent UI and nothing but essential
 *    storage happens until a choice is made.
 *
 * Exposes window.ILF_CONSENT for other scripts.
 */
(function () {
  'use strict';

  var KEY = 'ilf_consent_v2';
  var GA_ID = 'G-ZV53VVVSK3';
  var GTM_ID = 'GTM-53BRKJPX';

  var state = { analytics: false, ads: false, saved: false, googleCmp: false };
  var panel;
  var banner;
  var toggleAnalytics;
  var toggleAds;

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

  function injectScript(src, attrs) {
    if (Array.from(document.scripts).some(function (s) { return s.src === src; })) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
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

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  function showBanner() {
    if (banner) banner.hidden = false;
  }

  function closePanel() {
    if (!panel) return;
    panel.setAttribute('aria-hidden', 'true');
  }

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
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.hidden = true;
    banner.innerHTML =
      '<div class="text">We use essential local storage to run the games, and optional analytics and ad ' +
      'cookies to keep the site free. Choose <strong>Accept all</strong>, <strong>Reject all</strong>, or pick ' +
      'categories in <strong>Cookie settings</strong>. See our ' +
      '<a href="/privacy.html">Privacy Policy</a> and <a href="/terms.html">Terms</a>. Visitors in the EEA, UK ' +
      'and Switzerland get Google\'s certified consent message instead.</div>' +
      '<div class="actions">' +
      '<button id="ilf-accept-all" class="btn-accept" type="button">Accept all</button>' +
      '<button id="ilf-reject-all" class="btn-reject" type="button">Reject all</button>' +
      '<button id="ilf-open-settings" class="btn-settings" type="button">Cookie settings</button>' +
      '</div>';

    panel = document.createElement('div');
    panel.id = 'ilf-cookie-panel';
    panel.className = 'cookie-settings-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<h3>Cookie settings</h3>' +
      '<p style="margin:0 0 8px 0;color:#444">Choose which categories you allow. Necessary storage is ' +
      'required for the site to function.</p>' +
      '<div class="cookie-row"><div><strong>Necessary</strong>' +
      '<div class="muted" style="font-size:.9rem">Essential site storage (localStorage / IndexedDB). Required.</div></div>' +
      '<div><span style="opacity:.6">Always on</span></div></div>' +
      '<div class="cookie-row"><div><strong>Analytics</strong>' +
      '<div class="muted" style="font-size:.9rem">Anonymous usage statistics (Google Analytics).</div></div>' +
      '<div class="toggle"><input id="ilf-toggle-analytics" type="checkbox" aria-label="Allow analytics"></div></div>' +
      '<div class="cookie-row"><div><strong>Ads</strong>' +
      '<div class="muted" style="font-size:.9rem">Allow ad cookies for relevant ads. Ads show either way, but ' +
      'without this they are non-personalized.</div></div>' +
      '<div class="toggle"><input id="ilf-toggle-ads" type="checkbox" aria-label="Allow ad cookies"></div></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
      '<button id="ilf-save-settings" class="btn-primary" type="button">Save choices</button>' +
      '<button id="ilf-cancel-settings" class="btn-settings" type="button" style="color:#111;border-color:#d0d5dd">Cancel</button>' +
      '</div>';

    document.body.appendChild(banner);
    document.body.appendChild(panel);

    toggleAnalytics = panel.querySelector('#ilf-toggle-analytics');
    toggleAds = panel.querySelector('#ilf-toggle-ads');

    banner.querySelector('#ilf-accept-all').addEventListener('click', function () {
      apply({ analytics: true, ads: true }, true);
    });
    banner.querySelector('#ilf-reject-all').addEventListener('click', function () {
      apply({ analytics: false, ads: false }, true);
    });
    banner.querySelector('#ilf-open-settings').addEventListener('click', openPanel);
    panel.querySelector('#ilf-save-settings').addEventListener('click', function () {
      apply({ analytics: !!(toggleAnalytics && toggleAnalytics.checked), ads: !!(toggleAds && toggleAds.checked) }, true);
    });
    panel.querySelector('#ilf-cancel-settings').addEventListener('click', function () {
      hideBanner();
      closePanel();
    });

    // Any link pointing at #cookie-settings (footer, policy pages) opens the panel.
    document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[href$="#cookie-settings"], #cookie-settings-link') : null;
      if (!link) return;
      event.preventDefault();
      openPanel();
    });
  }

  function boot() {
    buildUi();

    // Already accepted? Apply immediately so tags load as early as possible.
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
