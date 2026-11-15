import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { api, ApiError } from '../../src/lib/api';
import { ro } from '../../src/copy/ro';
import ProductPage from '../product/[id]/index';

jest.mock('../../src/lib/api', () => ({ ...jest.requireActual('../../src/lib/api'), api: { lookup: jest.fn() } }));
jest.mock('../../src/features/history/store', () => ({ saveToHistory: jest.fn(), getFromHistory: jest.fn() }));

it('offers scan and history when a product id cannot be found', async () => {
  jest.mocked(api.lookup).mockRejectedValue(new ApiError('bad_request'));
  await renderRouter({ 'product/[id]': ProductPage, scan: () => null, history: () => null }, { initialUrl: '/product/does-not-exist' });

  expect(await screen.findByText(ro.errors.not_found)).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.offline.history })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.scan.title }));
  expect(screen).toHavePathname('/scan');
});

it('opens history from a missing product result', async () => {
  jest.mocked(api.lookup).mockRejectedValue(new ApiError('bad_request'));
  await renderRouter({ 'product/[id]': ProductPage, scan: () => null, history: () => null }, { initialUrl: '/product/does-not-exist' });
  await screen.findByText(ro.errors.not_found);
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.history }));
  expect(screen).toHavePathname('/history');
});

it('keeps retry and history recovery for offline lookup errors', async () => {
  jest.mocked(api.lookup).mockRejectedValue(new ApiError('offline'));
  await renderRouter({ 'product/[id]': ProductPage, scan: () => null, history: () => null }, { initialUrl: '/product/00000000-0000-4000-8000-000000000001' });

  expect(await screen.findByRole('button', { name: ro.app.retry })).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.offline.history })).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.scan.title })).toBeNull();
});
