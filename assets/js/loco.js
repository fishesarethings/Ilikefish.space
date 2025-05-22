// assets/js/loco.js
import LocomotiveScroll from 'locomotive-scroll';

new LocomotiveScroll({
  el: document.querySelector('[data-scroll-container]'),
  smooth: true,
  multiplier: 1.2
});
