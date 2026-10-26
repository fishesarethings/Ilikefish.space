/*
 * Shared consent manager for ilikefish.space.
 *
 * Behaviour (and the reasoning, because this is the part that has to be right):
 *
 *  - Google Consent Mode v2 defaults are set to "denied" inline in each page
 *    head, *before* any Google tag loads.
 *  - Inside the EEA/UK/CH, Google's certified consent message is the authority.
 *    We detect it by its callbacks actually firing - never by the mere presence
 *    of window.googlefc, which says nothing about what the visitor chose.
 *  - Ads are only ever requested when we hold an actual "yes":
 *      outside the EEA: the visitor pressed Accept, or enabled Ad cookies in
 *        the panel;
 *      inside the EEA: the CMP reported consentStatus === true.
 *    Declining means no ad request is made at all, and consent.js tells ads.js
 *    to stop when a choice is withdrawn.
 *  - Our own analytics tag is only loaded when analytics consent is known.
 *    In the EEA that is left to Google's message and Consent Mode.
 *
 * Exposes window.ILF_CONSENT for other scripts.
 */
(function () {
  'use strict';

  var KEY = 'ilf_consent_v2';
  var GA_ID = 'G-ZV53VVVSK3';
  var GTM_ID = 'GTM-53BRKJPX';
  var CMP_WAIT_MS = 6000;

  var state = {
    analytics: false,     // our own opt-in (non-EEA)
    ads: false,           // our own opt-in (non-EEA)
    saved: false,         // visitor has chosen in our banner
    cmpActive: false,     // Google's certified message is handling consent
    cmpAdsConsent: null   // true / false / null while unknown
  };

  var banner, panel, pill, toggleAnalytics, toggleAds;
  var cmpCallbacksSeen = false;

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

  function announce() {
    var allowed = adsAllowed();
    if (window.ILF_ADS) {
      if (allowed && window.ILF_ADS.activate) window.ILF_ADS.activate();
      // Withdrawal has to stop future requests, not just hide the box.
      if (!allowed && window.ILF_ADS.suspend) window.ILF_ADS.suspend();
    }
    window.dispatchEvent(new CustomEvent('ilf:consent', {
      detail: {
        analytics: analyticsAllowed(),
        ads: allowed,
        googleCmp: state.cmpActive
      }
    }));
  }

  function adsAllowed() {
    if (state.cmpActive) return state.cmpAdsConsent === true;
    return state.ads === true;
  }

  function analyticsAllowed() {
    if (state.cmpActive) return false; // handled by Google's message + Consent Mode
    return state.analytics === true;
  }

  function showPill(show) { if (pill) pill.setAttribute('data-visible', show ? '1' : '0'); }
  function hideBanner() { if (banner) banner.hidden = true; }
  function showBanner() { if (banner) banner.hidden = false; showPill(false); }
  function closePanel() { if (panel) panel.setAttribute('aria-hidden', 'true'); }

  function openGoogleMessage() {
    if (window.googlefc && typeof window.googlefc.showRevocationMessage === 'function') {
      try { window.googlefc.showRevocationMessage(); return true; } catch (e) { /* ignore */ }
    }
    return false;
  }

  function openPanel() {
    if (!panel) return;
    var saved = read() || {};
    if (toggleAnalytics) {
      toggleAnalytics.checked = !!saved.analytics;
      toggleAnalytics.disabled = state.cmpActive;
    }
    if (toggleAds) {
      toggleAds.checked = !!saved.ads;
      toggleAds.disabled = state.cmpActive;
    }
    var cmpNote = panel.querySelector('#ilf-cmp-note');
    if (cmpNote) cmpNote.hidden = !state.cmpActive;
    panel.setAttribute('aria-hidden', 'false');
    hideBanner();
  }

  function apply(consent, persist, delay) {
    state.analytics = !!consent.analytics;
    state.ads = !!consent.ads;
    state.saved = true;
    if (persist) write({ necessary: true, analytics: state.analytics, ads: state.ads, timestamp: Date.now() });
    updateConsentMode(state.analytics, state.ads);
    if (state.analytics) loadAnalytics();
    announce();
    closePanel();
    if (delay) {
      setTimeout(function () { hideBanner(); showPill(true); }, delay);
    } else {
      hideBanner();
      showPill(true);
    }
  }

  function celebrate(button) {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !button || typeof button.animate !== 'function') return 0;

    var rect = button.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var emojis = ['\uD83D\uDC1F', '\uD83D\uDC20', '\uD83E\uDEE7', '\uD83D\uDC21', '\u2728'];

    for (var i = 0; i < 14; i++) {
      var part = document.createElement('span');
      part.className = 'ilfc-particle';
      part.setAttribute('aria-hidden', 'true');
      part.textContent = emojis[i % emojis.length];
      part.style.left = cx + 'px';
      part.style.top = cy + 'px';
      document.body.appendChild(part);

      var dx = Math.round((Math.random() - 0.5) * 280);
      var dy = Math.round(-80 - Math.random() * 170);
      var rot = Math.round((Math.random() - 0.5) * 200);
      var anim = part.animate([
        { transform: 'translate(-50%, -50%) scale(.6)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) rotate(' + rot + 'deg) scale(1.15)', opacity: 0 }
      ], {
        duration: 760 + Math.random() * 340,
        easing: 'cubic-bezier(.22,.61,.36,1)',
        fill: 'forwards'
      });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(part);
    }

    button.classList.add('is-pop');
    setTimeout(function () { button.classList.remove('is-pop'); }, 460);
    return 820;
  }

  /*
   * Google's certified consent message (EEA/UK/CH).
   * The queue has to exist before the message script loads, and the only
   * trustworthy signal is a callback arriving - not window.googlefc existing.
   */
  function watchGoogleCmp(onEvent) {
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    if (typeof window.googlefc.callbackQueue.push !== 'function') return;

    window.googlefc.callbackQueue.push({
      CONSENT_DATA_READY: function () {
        cmpCallbacksSeen = true;
        onEvent();
      }
    });
    window.googlefc.callbackQueue.push({
      ADS_CONSENT_DATA: function (data) {
        cmpCallbacksSeen = true;
        var status = data && typeof data.consentStatus === 'boolean' ? data.consentStatus : null;
        onEvent(status);
      }
    });
  }

  function enterCmpMode(status) {
    var first = !state.cmpActive;
    state.cmpActive = true;
    if (typeof status === 'boolean') state.cmpAdsConsent = status;
    hideBanner();
    showPill(true);
    // Google's certified message updates Consent Mode itself for this visitor.
    // Pushing our own values here would overwrite its decision (for example
    // flipping an analytics grant back to denied), so we deliberately do not.
    announce();
    if (first) closePanel();
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
      'games get played and what is broken. Leave it off and no analytics script is loaded at all.</div></div>' +
      '<label class="ilfc-switch"><input id="ilf-toggle-analytics" type="checkbox" aria-label="Allow analytics"><span class="ilfc-knob"></span></label>' +
      '</div>' +
      '<div class="ilfc-row">' +
      '<div><div class="ilfc-name">Ad cookies</div><div class="ilfc-why">Allows Google to show ads in the labelled ' +
      'boxes outside the game area. Leave it off and we make no ad requests - the games work exactly ' +
      'the same. (In the EEA, the UK and Switzerland Google\u2019s message below decides instead.)</div></div>' +
      '<label class="ilfc-switch"><input id="ilf-toggle-ads" type="checkbox" aria-label="Allow ad cookies"><span class="ilfc-knob"></span></label>' +
      '</div>' +
      '<p class="ilfc-note">Visitors in the EEA, the UK and Switzerland see Google\'s own certified consent message ' +
      'instead. In those regions Google decides whether an ad may be requested, and this banner stays out of the way.</p>' +
      '<p class="ilfc-note" id="ilf-cmp-note" hidden>Your region uses Google\u2019s certified consent message, so these switches are managed there. Choose <em>Save choices</em> to reopen that message and change your answer.</p>' +
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

    banner.querySelector('#ilf-accept-all').addEventListener('click', function (event) {
      var ms = celebrate(event.currentTarget);
      apply({ analytics: true, ads: true }, true, ms);
    });
    banner.querySelector('#ilf-reject-all').addEventListener('click', function () {
      apply({ analytics: false, ads: false }, true);
    });
    banner.querySelector('#ilf-open-settings').addEventListener('click', openPanel);
    pill.addEventListener('click', openPanel);
    panel.querySelector('#ilf-save-settings').addEventListener('click', function () {
      if (state.cmpActive) {
        closePanel();
        showPill(true);
        openGoogleMessage();
        return;
      }
      apply({ analytics: !!(toggleAnalytics && toggleAnalytics.checked), ads: !!(toggleAds && toggleAds.checked) }, true);
    });
    panel.querySelector('#ilf-cancel-settings').addEventListener('click', function () {
      closePanel();
      showPill(state.saved || state.cmpActive);
    });

    document.addEventListener('click', function (event) {
      var target = event.target;
      var link = target && target.closest ? target.closest('a[href$="#cookie-settings"], #cookie-settings-link') : null;
      if (!link) return;
      event.preventDefault();
      openPanel();
    });
  }

  /*
   * Best-effort check for the regions where Google's certified message applies.
   * Timezone is not proof of location, so it is only used to decide whether to
   * wait briefly for Google's message. If we guess wrong, Google's callbacks
   * still take over and hide our banner.
   */
  function likelyEea() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return /^Europe\//.test(tz) ||
        tz === 'Atlantic/Canary' || tz === 'Atlantic/Madeira' || tz === 'Atlantic/Azores' ||
        tz === 'America/Guadeloupe' || tz === 'America/Martinique' || tz === 'America/Cayenne' ||
        tz === 'Indian/Reunion' || tz === 'Indian/Mayotte';
    } catch (e) {
      return false;
    }
  }

  function boot() {
    buildUi();

    // Any footer or policy link to /#cookie-settings should open the panel,
    // including when the link navigates to this page from somewhere else.
    function openFromHash() {
      if (location.hash === '#cookie-settings') {
        openPanel();
        showPill(true);
      }
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    watchGoogleCmp(function (status) {
      enterCmpMode(status);
    });

    var saved = read();
    if (saved) apply(saved, false);

    // Google's message only loads inside the EEA, the UK and Switzerland, and
    // it arrives a moment after the AdSense tag. In those regions we give it
    // first refusal so two consent interfaces never appear together. Elsewhere
    // there is nothing to wait for, so the banner appears straight away.
    function maybeShowBanner() {
      if (!saved && !cmpCallbacksSeen) showBanner();
    }

    if (likelyEea()) {
      setTimeout(maybeShowBanner, CMP_WAIT_MS);
    } else {
      maybeShowBanner();
    }
  }

  window.ILF_CONSENT = {
    get: function () {
      return {
        analytics: analyticsAllowed(),
        ads: adsAllowed(),
        googleCmp: state.cmpActive,
        cmpAdsConsent: state.cmpAdsConsent
      };
    },
    adsAllowed: adsAllowed,
    analyticsAllowed: analyticsAllowed,
    openSettings: openPanel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
