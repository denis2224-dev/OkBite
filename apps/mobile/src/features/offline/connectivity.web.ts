export function subscribeReconnect(retry: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const visible = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) retry();
  };
  window.addEventListener('online', retry);
  document.addEventListener('visibilitychange', visible);
  if (navigator.onLine) retry();
  return () => {
    window.removeEventListener('online', retry);
    document.removeEventListener('visibilitychange', visible);
  };
}
