window.addEventListener('load', () => {
  const text = 'I like fishes ';
  const el = document.getElementById('hero-title');
  let idx = 0;
  function type() {
    if (idx < text.length) {
      el.textContent += text[idx++];
      setTimeout(type, 150);
    }
  }
  type();
});
