window.addEventListener('load', () => {
  const text = 'I like fishes _';      // includes the underscore
  const el   = document.getElementById('hero-title');
  let idx    = 0;

  function typeChar() {
    if (idx < text.length) {
      el.textContent += text.charAt(idx++);
      setTimeout(typeChar, 150);
    }
  }

  // initialize: clear any existing text
  el.textContent = '';
  typeChar();
});
