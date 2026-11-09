export async function consumeInitialAuthUrl(): Promise<string | null> {
  const value = window.location.href;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (fragment.has('access_token') || fragment.has('refresh_token')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return value;
}
