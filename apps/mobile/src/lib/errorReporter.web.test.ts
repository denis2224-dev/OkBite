import { installErrorReporter } from './errorReporter.web';
jest.mock('./device', () => ({ getDeviceId: async () => '10000000-0000-4000-8000-000000000001' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));

test('browser errors and unhandled rejections report once without suppressing default handling', async () => {
  const reports: Record<string, unknown>[] = [];
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-key';
  global.fetch = jest.fn(async (_url, init) => {
    reports.push(JSON.parse(init!.body as string));
    return { ok: true, json: async () => ({ status: 'ok' }) } as Response;
  });
  const events = new EventTarget();
  Object.assign(window, { location: { pathname: '/scan', search: '?token=secret' },
    addEventListener: events.addEventListener.bind(events) });
  installErrorReporter(); installErrorReporter();
  const event = new Event('error', { cancelable: true });
  Object.defineProperty(event, 'error', { value: new Error('browser failure') });
  events.dispatchEvent(event);
  const rejection = new Event('unhandledrejection', { cancelable: true });
  Object.defineProperty(rejection, 'reason', { value: new Error('promise failure') });
  events.dispatchEvent(rejection);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(reports).toHaveLength(2);
  expect(reports.every(report => report.platform === 'web' && report.screen === '/scan')).toBe(true);
  expect(event.defaultPrevented).toBe(false);
  expect(rejection.defaultPrevented).toBe(false);
});
