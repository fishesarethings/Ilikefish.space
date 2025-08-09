// Robust typewriter — single-run and preserves trailing space.
// Adds class "js-enabled" on html for no-js fallbacks.

(function () {
  if (window.__ILF_TYPING_LOADED) return;
  window.__ILF_TYPING_LOADED = true;

  try { document.documentElement.classList.add('js-enabled'); } catch(e){}

  const TEXT = 'I like fishes '; // trailing space preserved intentionally
  const el = document.getElementById('hero-title');
  if (!el) return;

  let idx = 0;
  el.textContent = ''; // start empty

  function typeChar() {
    if (idx < TEXT.length) {
      el.textContent += TEXT.charAt(idx++);
      const delay = 70 + Math.floor(Math.random() * 110); // organic timing
      window.setTimeout(typeChar, delay);
    } else {
      // final state — keep trailing space and cursor
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', typeChar, { once: true });
  } else {
    typeChar();
  }
})();
