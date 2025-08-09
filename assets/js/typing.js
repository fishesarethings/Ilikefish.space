// assets/js/typing.js — single-run typewriter, preserves trailing space
(function () {
  if (window.__ILF_TYPING_LOADED) return;
  window.__ILF_TYPING_LOADED = true;

  try { document.documentElement.classList.add('js-enabled'); } catch (e) {}

  const TEXT = 'I like fishes '; // trailing space intentionally
  const el = document.getElementById('hero-title');
  if (!el) return;

  let idx = 0;
  el.textContent = '';

  function typeChar() {
    if (idx < TEXT.length) {
      el.textContent += TEXT.charAt(idx++);
      const delay = 70 + Math.floor(Math.random() * 110);
      window.setTimeout(typeChar, delay);
    } else {
      // done; keep final state
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', typeChar, { once: true });
  } else {
    typeChar();
  }
})();
