/*
 * Small loader for the site's AdSense placements.
 *
 * Consent is handled by assets/js/consent.js (and, inside the EEA/UK/CH, by
 * Google's certified consent message). This file only renders the placements
 * once it is told that ads are allowed, and hides a placement again if the
 * request comes back unfilled so no empty box is left in the layout.
 */
(function () {
  'use strict';

  var config = window.ILF_ADS_CONFIG || {};
  if (!config.enabled) return;

  var CLIENT = config.client || 'ca-pub-9929753961924881';
  var started = false;

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
    // reserved space instead of leaving an empty labelled box.
    setTimeout(function () {
      if (!hidden && !ins.getAttribute('data-ad-status')) {
        shell.classList.add('is-unfilled');
      }
    }, 10000);

    apply();
  }

  function requestAd(ins, shell) {
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
    requestIfVisible(shell);
  }

  function start() {
    if (started) return;
    started = true;
    // Google's tag is already in the page head; only the requests are gated.
    document.querySelectorAll('[data-ilf-ad]').forEach(prepare);
    window.addEventListener('scroll', checkVisible, { passive: true });
    window.addEventListener('resize', checkVisible, { passive: true });
    checkVisible();
  }

  window.ILF_ADS = {
    activate: start,
    refresh: function () {
      if (!started) return;
      document.querySelectorAll('[data-ilf-ad]').forEach(prepare);
      checkVisible();
    }
  };

  window.addEventListener('ilf:consent', function (event) {
    var detail = event.detail || {};
    if (detail.ads || detail.googleCmp) start();
  });
})();
