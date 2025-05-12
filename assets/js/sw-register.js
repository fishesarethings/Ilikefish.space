if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/assets/js/service-worker.js')
      .then(() => console.log('SW registered'))
      .catch(console.error);
  });
}
