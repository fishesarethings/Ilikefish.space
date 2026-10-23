if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('SW registered:', reg.scope);
        const triggerPrefetch = () => {
          try {
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'PREFETCH_ALL' });
            } else if (reg.active) {
              reg.active.postMessage({ type: 'PREFETCH_ALL' });
            }
          } catch (e) { /* ignore */ }
        };
        if (navigator.serviceWorker.controller) {
          setTimeout(triggerPrefetch, 2000);
        } else {
          navigator.serviceWorker.ready.then(() => setTimeout(triggerPrefetch, 2000)).catch(() => {});
        }
      })
      .catch(err => console.error('SW registration failed:', err));
  });
}
