export function sessionFromUrl(value: string | null, developmentCallback?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const callbacks = ['okbite://admin', 'https://okbite.md/admin', 'http://localhost:8081/admin'];
    if (developmentCallback) callbacks.push(developmentCallback);
    const callback = `${url.protocol}//${url.host}${url.pathname.replace(/\/$/, '')}`;
    if (url.username || url.password || url.search || !callbacks.includes(callback)) return null;
    const params = new URLSearchParams(url.hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    return access_token && refresh_token ? { access_token, refresh_token } : null;
  } catch {
    return null;
  }
}
