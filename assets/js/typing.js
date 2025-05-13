window.addEventListener('load', () => {
  const TEXT = 'I like fishes ';     // letters + space; underscore is in HTML
  const el   = document.getElementById('hero-title');
  let idx    = 0;

  el.textContent = '';                // start empty (underscore remains)

  function typeChar() {
    if (idx < TEXT.length) {
      el.textContent += TEXT.charAt(idx++);
      setTimeout(typeChar, 150);
    }
  }

  typeChar();
});
