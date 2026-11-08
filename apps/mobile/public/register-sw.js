if ('serviceWorker' in navigator) {
  // Bridge for the app's UpdateBanner: announce a waiting worker, activate it only on explicit request.
  const announce = registration => {
    // No controller means first install, not an update.
    if (registration.waiting && navigator.serviceWorker.controller) window.dispatchEvent(new Event('okbite:sw-update'));
  };
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then(registration => {
      announce(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') announce(registration); });
      });
    }).catch(() => {});
  });
  window.addEventListener('okbite:sw-apply', () => {
    void navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration?.waiting) return;
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
      // Workbox generateSW (skipWaiting off) listens for this message.
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }).catch(() => {});
  });
}
