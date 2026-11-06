import { ClientErrorRequest, ClientErrorResponse } from '@okbite/shared';
import { getDeviceId } from './device';

let screen = '/';
const recent = new Map<string, number>();

export function setErrorScreen(path: string): void {
  screen = path.replace(/[?#].*$/, '').slice(0, 200);
}

export async function reportClientError(error: Error, platform: string, appVersion: string): Promise<void> {
  try {
    const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !key) return;
    const now = Date.now();
    for (const [key, expires] of recent) if (expires <= now) recent.delete(key);
    const message = (error.message || error.name || 'Error').slice(0, 1000);
    const stack = error.stack?.slice(0, 2000) ?? null;
    const report = ClientErrorRequest.parse({
      message, stack, screen, appVersion: appVersion.slice(0, 50), platform,
    });
    const signature = `${message}\n${stack}`;
    if (recent.has(signature) || recent.size >= 100) return;
    recent.set(signature, now + 60_000);
    const body = JSON.stringify(report);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${base}/functions/v1/client-error`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, 'x-device-id': await getDeviceId() },
        body,
      });
      if (response.ok) ClientErrorResponse.parse(await response.json());
    } finally { clearTimeout(timeout); }
  } catch {
    // Reporting must never replace the original error or trigger another report.
  }
}
