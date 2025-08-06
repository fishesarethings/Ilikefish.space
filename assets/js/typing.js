window.addEventListener('load', () => {
  const TEXT = 'I like fishes ';     // Ensure there are no hidden or double spaces here
  const el   = document.getElementById('hero-title');
  let idx    = 0;

  el.textContent = ''; // start empty (underscore remains)

  function typeChar() {
    if (idx < TEXT.length) {
      el.textContent += TEXT.charAt(idx++);
      setTimeout(typeChar, 150);
    }
  }

  typeChar();
});
