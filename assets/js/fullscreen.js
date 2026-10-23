document.getElementById('enter-fullscreen')
  .addEventListener('click', () => {
    const elem = document.getElementById('activityChart').parentNode;
    (elem.requestFullscreen || elem.webkitRequestFullscreen).call(elem);
  });
