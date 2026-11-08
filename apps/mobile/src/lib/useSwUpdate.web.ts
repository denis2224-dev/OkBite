import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** R1 owns the registration bridge; this hook never reloads or messages workers. */
export function useSwUpdate(allowApply = true) {
  const [pending, setPending] = useState(false);
  const state = useRef({ active: false, pending: false, applied: false, allowApply });
  useLayoutEffect(() => { state.current.allowApply = allowApply; }, [allowApply]);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    const browser = window;
    const current = state.current;
    current.active = true;
    let disposed = false;
    const ready = () => {
      if (disposed) return;
      current.pending = true;
      setPending(true);
    };
    browser.addEventListener('okbite:sw-update', ready);
    // The ready event may precede mounting (fonts/startup/navigation remount).
    try {
      if (typeof navigator !== 'undefined') {
        void navigator.serviceWorker?.getRegistration?.().then(registration => {
          if (!disposed && !current.applied && registration?.waiting) ready();
        }).catch(() => {});
      }
    } catch { /* Browser policy can make the API inaccessible. */ }
    return () => {
      disposed = true;
      current.active = false;
      browser.removeEventListener('okbite:sw-update', ready);
    };
  }, []);
  const apply = () => {
    const current = state.current;
    if (!current.active || !current.pending || !current.allowApply) return;
    current.pending = false;
    current.applied = true;
    setPending(false);
    window.dispatchEvent(new Event('okbite:sw-apply'));
  };
  return { pending, apply };
}
