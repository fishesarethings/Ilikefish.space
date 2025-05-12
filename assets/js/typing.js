const text = 'I like fishes ';
const cursor = '_';
let i = 0;
function type() {
  if (i < text.length) {
    document.getElementById('hero-title').textContent += text.charAt(i++);
    setTimeout(type, 150);
  } else { blink(); }
}
function blink() {
  let show = true;
  setInterval(() => {
    document.getElementById('hero-title').textContent = text + (show ? cursor : '');
    show = !show;
  }, 500);
}
window.addEventListener('load', type);
