export async function consumeInitialAuthUrl(): Promise<string | null> {
  const value = window.location.href;
  if (window.location.hash.includes('access_token=')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return value;
}
