export function sessionFromUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname !== 'admin' && !url.pathname.replace(/\/$/, '').endsWith('/admin'))
      return null;
    const params = new URLSearchParams(url.hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    return access_token && refresh_token ? { access_token, refresh_token } : null;
  } catch {
    return null;
  }
}
