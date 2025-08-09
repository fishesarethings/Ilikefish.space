// Robust single-run typewriter.
// Adds html class "js-enabled" so you can provide a no-js fallback.
// Keeps deliberate flicker but avoids double-run / duplicate includes.

(function () {
  // If running multiple times, bail out.
  if (window.__ILF_TYPING_LOADED) return;
  window.__ILF_TYPING_LOADED = true;

  document.documentElement.classList.add('js-enabled');

  const TEXT = 'I like fishes '; // keep deliberate flicker text
  const el = document.getElementById('hero-title');
  if (!el) return;

  let idx = 0;
  el.textContent = ''; // start empty; underscore/cursor provided by CSS border-right

  function typeChar() {
    if (idx < TEXT.length) {
      el.textContent += TEXT.charAt(idx++);
      // random-ish tiny timing for a more organic (and deliberate) flicker
      const delay = 80 + Math.floor(Math.random() * 120);
      window.setTimeout(typeChar, delay);
    } else {
      // keep the final trailing underscore; you can optionally restart or keep static
      // Leave as final state (no restart) to avoid blinking that some browsers mis-handle.
    }
  }

  // Start once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', typeChar, { once: true });
  } else {
    typeChar();
  }
})();
