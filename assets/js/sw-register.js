if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/service-worker.js')  <!-- :contentReference[oaicite:8]{index=8} -->
      .then(()=>console.log('SW registered'))
      .catch(console.error)
  );
}
