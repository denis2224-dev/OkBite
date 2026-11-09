import { z } from 'zod';
import { requestUnknownFlow } from './unknownFlowTransport';
jest.mock('../../lib/device', () => ({ getDeviceId: async () => 'test-device' }));
const request = z.object({ nutrition: z.enum(['none', 'skipped']), ingredientsImage: z.string().min(1) });
const response = z.object({ status: z.literal('ok') });
const saved = { fetch: global.fetch, url: process.env.EXPO_PUBLIC_SUPABASE_URL, key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY };
let fetchMock: jest.Mock;
beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-test-anon';
  fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });
  global.fetch = fetchMock;
});
afterEach(() => {
  global.fetch = saved.fetch;
  if (saved.url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL; else process.env.EXPO_PUBLIC_SUPABASE_URL = saved.url;
  if (saved.key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = saved.key;
});
test.each(['none', 'skipped'] as const)('retains explicit %s mode in the validated request', async nutrition => {
  await expect(requestUnknownFlow('read-label', request, response, { nutrition, ingredientsImage: 'jpeg' })).resolves.toEqual({ status: 'ok' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('https://example.supabase.co/functions/v1/read-label');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ nutrition, ingredientsImage: 'jpeg' });
  expect(fetchMock.mock.calls[0][1].headers['x-device-id']).toBe('test-device');
});
test('rejects an invalid payload without uploading it', async () => {
  await expect(requestUnknownFlow('read-label', request, response, { nutrition: 'none' })).rejects.toMatchObject({ code: 'bad_request' });
  expect(fetchMock).not.toHaveBeenCalled();
});
test('fails closed on an invalid response', async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'invented' }) });
  await expect(requestUnknownFlow('read-label', request, response, { nutrition: 'none', ingredientsImage: 'jpeg' })).rejects.toMatchObject({ code: 'invalid_response' });
});
test('retains a validated service error and does not retry it', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'rate_limited', message: 'limit' }) });
  await expect(requestUnknownFlow('read-label', request, response, { nutrition: 'none', ingredientsImage: 'jpeg' })).rejects.toMatchObject({ code: 'rate_limited' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test('reports missing configuration without a request', async () => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  await expect(requestUnknownFlow('read-label', request, response, { nutrition: 'none', ingredientsImage: 'jpeg' })).rejects.toMatchObject({ code: 'configuration' });
  expect(fetchMock).not.toHaveBeenCalled();
});
