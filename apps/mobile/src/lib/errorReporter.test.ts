import { reportClientError, setErrorScreen } from './errorReporter.shared';
import { installErrorReporter } from './errorReporter';

jest.mock('./device', () => ({ getDeviceId: async () => '10000000-0000-4000-8000-000000000001' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));

const requests: { url: string; init: RequestInit }[] = [];
beforeEach(() => {
  requests.length = 0;
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-key';
  global.fetch = jest.fn(async (url, init) => {
    requests.push({ url: String(url), init: init! });
    return { ok: true, json: async () => ({ status: 'ok' }) } as Response;
  });
});

test('sends bounded diagnostics and excludes screen query/fragment', async () => {
  const error = new Error('first error'); error.stack = 'x'.repeat(3000);
  setErrorScreen('/product/test?token=secret#access_token=secret');
  await reportClientError(error, 'ios', '1.0.0');
  expect(requests).toHaveLength(1);
  expect(requests[0]!.url).toBe('https://example.supabase.co/functions/v1/client-error');
  expect(JSON.parse(requests[0]!.init.body as string)).toEqual({
    message: 'first error', stack: 'x'.repeat(2000), screen: '/product/test',
    appVersion: '1.0.0', platform: 'ios',
  });
  expect(requests[0]!.init.headers).toMatchObject({ 'x-device-id': '10000000-0000-4000-8000-000000000001', apikey: 'public-key' });
});

test('deduplicates in-flight errors for 60 seconds and permits the next report', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
  const error = new Error('duplicate');
  await Promise.all([reportClientError(error, 'ios', '1'), reportClientError(error, 'ios', '1')]);
  expect(requests).toHaveLength(1);
  clock.mockReturnValue(61000);
  await reportClientError(error, 'ios', '1');
  expect(requests).toHaveLength(2);
  clock.mockRestore();
});

test('reporting failures are best effort and absent configuration sends nothing', async () => {
  global.fetch = jest.fn(async () => { throw new Error('network'); });
  await expect(reportClientError(new Error('offline'), 'android', '1')).resolves.toBeUndefined();
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  await reportClientError(new Error('unconfigured'), 'android', '1');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('reports the screen where the error occurred even if navigation changes during device lookup', async () => {
  setErrorScreen('/capture');
  const pending = reportClientError(new Error('navigation race'), 'ios', '1');
  setErrorScreen('/history');
  await pending;
  expect(JSON.parse(requests[0]!.init.body as string).screen).toBe('/capture');
});

test('installs once and preserves the original fatal error handler', async () => {
  const previous = jest.fn();
  let handler = previous;
  const utils = { getGlobalHandler: () => handler, setGlobalHandler: jest.fn(next => { handler = next; }) };
  Object.assign(globalThis, { ErrorUtils: utils });
  installErrorReporter(); installErrorReporter();
  const error = new Error('fatal');
  handler(error, true);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(utils.setGlobalHandler).toHaveBeenCalledTimes(1);
  expect(previous).toHaveBeenCalledWith(error, true);
  expect(requests).toHaveLength(1);
});
