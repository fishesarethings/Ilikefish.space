// assets/js/loco.js
window.addEventListener('load', () => {
  new LocomotiveScroll({
    el: document.querySelector('[data-scroll-container]'),
    smooth: true,
    multiplier: 1.2
  });
});
