/*
 * AdSense placement loader for ilikefish.space.
 *
 * Consent lives in assets/js/consent.js (and, in the EEA/UK/CH, in Google's
 * certified consent message). This file never decides anything on its own:
 *
 *  - it asks ILF_CONSENT.adsAllowed() immediately before *every* request,
 *  - it stops requesting when a choice is withdrawn (suspend()),
 *  - it hides a placement again if the request comes back unfilled, so an
 *    unfilled or blocked slot never leaves an empty labelled box.
 */
(function () {
  'use strict';

  var config = window.ILF_ADS_CONFIG || {};
  if (!config.enabled) return;

  var CLIENT = config.client || 'ca-pub-9929753961924881';
  var started = false;
  var suspended = false;

  function allowed() {
    if (!window.ILF_CONSENT || typeof window.ILF_CONSENT.adsAllowed !== 'function') return false;
    return window.ILF_CONSENT.adsAllowed() === true;
  }

  function slotFor(key) {
    var perPlacement = config.slots && config.slots[key];
    var value = (perPlacement && String(perPlacement).trim()) ||
      (config.slot && String(config.slot).trim()) || '';
    return /^[0-9]{8,}$/.test(value) ? value : '';
  }

  function hideWhenUnfilled(ins, shell) {
    var hidden = false;

    function apply() {
      var status = ins.getAttribute('data-ad-status');
      if (status === 'unfilled') {
        hidden = true;
        shell.classList.add('is-unfilled');
      } else if (status === 'filled' || status === 'unfill-optimized') {
        hidden = false;
        shell.classList.remove('is-unfilled');
      }
    }

    if (window.MutationObserver) {
      new MutationObserver(apply).observe(ins, {
        attributes: true,
        attributeFilter: ['data-ad-status']
      });
    }

    // If the script never responds (ad blocker, network failure), close the
    // reserved space instead of leaving an empty box behind.
    setTimeout(function () {
      if (!hidden && !ins.getAttribute('data-ad-status')) {
        shell.classList.add('is-unfilled');
      }
    }, 10000);

    apply();
  }

  function requestAd(ins, shell) {
    // Final gate: consent can be withdrawn after a shell was prepared.
    if (suspended || !allowed()) {
      shell.classList.add('is-unfilled');
      return;
    }
    if (ins.getAttribute('data-ilf-requested')) return;
    ins.setAttribute('data-ilf-requested', '1');

    hideWhenUnfilled(ins, shell);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      shell.classList.add('is-unfilled');
    }
  }

  function requestIfVisible(shell) {
    if (suspended || !allowed()) return;
    var ins = shell.querySelector('ins.adsbygoogle');
    if (!ins || ins.getAttribute('data-ilf-requested') || shell.classList.contains('is-unfilled')) return;
    var rect = shell.getBoundingClientRect();
    if (rect.bottom < -300 || rect.top > window.innerHeight + 300) return;
    requestAd(ins, shell);
  }

  function checkVisible() {
    document.querySelectorAll('[data-ilf-ad][data-ilf-prepared]').forEach(requestIfVisible);
  }

  function prepare(shell) {
    if (!shell || shell.getAttribute('data-ilf-prepared')) return;
    if (shell.hasAttribute('data-requires-game') && !document.body.classList.contains('has-game')) return;
    shell.setAttribute('data-ilf-prepared', '1');

    var key = shell.getAttribute('data-slot-key') || '';
    var slot = slotFor(key);
    var slotHost = shell.querySelector('.ilf-ad-slot');
    if (!slotHost) {
      slotHost = document.createElement('div');
      slotHost.className = 'ilf-ad-slot';
      shell.appendChild(slotHost);
    }

    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', CLIENT);
    if (slot) ins.setAttribute('data-ad-slot', slot);
    ins.setAttribute('data-ad-format', shell.getAttribute('data-format') || 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    slotHost.appendChild(ins);

    shell.classList.add('is-active');

    // IntersectionObserver copes with custom scroll containers (the home page
    // moves its content with transforms), where a window scroll event may
    // never fire. The scroll listener below stays as a fallback.
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            requestIfVisible(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '300px 0px' });
      io.observe(shell);
    }

    requestIfVisible(shell);
  }

  function start() {
    suspended = false;
    if (!allowed()) return;
    if (started) {
      checkVisible();
      return;
    }
    started = true;
    // Google's tag is already in the page head; only the requests are gated.
    document.querySelectorAll('[data-ilf-ad]').forEach(prepare);
    window.addEventListener('scroll', checkVisible, { passive: true });
    window.addEventListener('resize', checkVisible, { passive: true });
    checkVisible();
  }

  function suspend() {
    suspended = true;
    // Collapse anything we prepared but never requested.
    document.querySelectorAll('[data-ilf-ad] ins.adsbygoogle').forEach(function (ins) {
      if (!ins.getAttribute('data-ilf-requested')) {
        var shell = ins.closest('[data-ilf-ad]');
        if (shell) shell.classList.add('is-unfilled');
      }
    });
  }

  window.ILF_ADS = {
    activate: start,
    suspend: suspend,
    refresh: function () {
      if (!started || suspended) return;
      document.querySelectorAll('[data-ilf-ad]').forEach(prepare);
      checkVisible();
    }
  };

  window.addEventListener('ilf:consent', function (event) {
    var detail = event.detail || {};
    if (detail.ads) start();
    else suspend();
  });
})();
