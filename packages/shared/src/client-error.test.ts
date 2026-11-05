import { expect, it } from 'vitest';
import { ClientErrorRequest, ClientErrorResponse } from './contract';

const report = { message: 'Test', stack: null, screen: '/capture', appVersion: '1.0', platform: 'web' };
it('validates the bounded private diagnostic request and acknowledgement', () => {
  expect(ClientErrorRequest.parse(report)).toEqual(report);
  expect(ClientErrorResponse.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  for (const patch of [
    { message: '' }, { message: 'x'.repeat(1001) }, { stack: 'x'.repeat(2001) },
    { screen: '/admin#access_token=test' }, { screen: '/product?id=test' },
    { screen: 'x'.repeat(201) }, { appVersion: '' }, { appVersion: 'x'.repeat(51) },
    { platform: 'desktop' }, { deviceId: 'untrusted' },
  ]) expect(ClientErrorRequest.safeParse({ ...report, ...patch }).success).toBe(false);
  expect(ClientErrorResponse.safeParse({ status: 'failed' }).success).toBe(false);
});
