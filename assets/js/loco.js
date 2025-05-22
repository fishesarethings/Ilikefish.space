// assets/js/loco.js

// LocomotiveScroll must be loaded by the CDN script tag before this runs
window.addEventListener('load', () => {
  new LocomotiveScroll({
    el: document.querySelector('[data-scroll-container]'),
    smooth: true,
    multiplier: 1.2
  });
});
