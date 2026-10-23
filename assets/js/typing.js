// typing.js — single-run typewriter, preserves trailing space, faster initial display
(function () {
  if (window.__ILF_TYPING_LOADED) return;
  window.__ILF_TYPING_LOADED = true;

  const TEXT = 'I like fishes '; // trailing space preserved
  const el = document.getElementById('hero-title');
  if (!el) return;
  let idx = 0;
  el.textContent = '';

  function typeChar() {
    if (idx < TEXT.length) {
      el.textContent += TEXT.charAt(idx++);
      const delay = 40 + Math.floor(Math.random() * 60); // quicker initial display
      window.setTimeout(typeChar, delay);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', typeChar, { once: true });
  } else {
    typeChar();
  }
})();
