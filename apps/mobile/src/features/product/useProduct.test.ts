import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useProduct } from './useProduct';
import { rememberLookup, freshLookup } from './freshLookup';
import { api, ApiError } from '../../lib/api';
import { foundYogurt } from '../../test/fixtures';
import { saveToHistory, getFromHistory } from '../history/store';

jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { lookup: jest.fn() } }));
jest.mock('../history/store', () => ({ saveToHistory: jest.fn(), getFromHistory: jest.fn() }));
beforeEach(() => { jest.resetAllMocks(); });
it('loads a product and saves the validated lookup response', async () => {
  jest.mocked(api.lookup).mockResolvedValue(foundYogurt);
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.data?.product.id).toBe(foundYogurt.product.id));
  expect(saveToHistory).toHaveBeenCalledWith(foundYogurt);
});
it('falls back to saved history only for offline errors', async () => {
  jest.mocked(api.lookup).mockRejectedValue(new ApiError('offline'));
  jest.mocked(getFromHistory).mockResolvedValue({ ...foundYogurt, savedAt: '2026-11-05T00:00:00.000Z' });
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.data?.product.id).toBe(foundYogurt.product.id));
  expect(result.current.error).toBeUndefined();
});
it('does not resurrect a server-hidden or missing product from the cache', async () => {
  jest.mocked(api.lookup).mockResolvedValue({ status: 'not_found' });
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.error?.code).toBe('not_found'));
  expect(getFromHistory).not.toHaveBeenCalled();
});
it('prevents a slow old request replacing the newly selected product', async () => {
  let resolveOld!: (value: typeof foundYogurt) => void;
  jest.mocked(api.lookup).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ ...foundYogurt, product: { ...foundYogurt.product, id: '00000000-0000-4000-8000-000000000002' } });
  const { result, rerender } = await renderHook(({ id }: { id: string }) => useProduct(id), { initialProps: { id: foundYogurt.product.id } });
  await rerender({ id: '00000000-0000-4000-8000-000000000002' });
  await waitFor(() => expect(result.current.data?.product.id).toBe('00000000-0000-4000-8000-000000000002'));
  await act(async () => resolveOld(foundYogurt));
  expect(result.current.data?.product.id).toBe('00000000-0000-4000-8000-000000000002');
});
it('opens an explicitly selected saved result without calling the backend', async () => {
  jest.mocked(getFromHistory).mockResolvedValue({ ...foundYogurt, savedAt: '2026-11-05T00:00:00.000Z' });
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id, true));
  await waitFor(() => expect(result.current.data?.product.id).toBe(foundYogurt.product.id));
  expect(result.current.cached).toBe(true);
  expect(api.lookup).not.toHaveBeenCalled();
});
it('retries a failed lookup for the same product without changing the route', async () => {
  jest.mocked(api.lookup).mockRejectedValueOnce(new ApiError('offline')).mockResolvedValueOnce(foundYogurt);
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.error?.code).toBe('offline'));
  await act(() => result.current.retry());
  await waitFor(() => expect(result.current.data?.product.id).toBe(foundYogurt.product.id));
  expect(api.lookup).toHaveBeenCalledTimes(2);
});
it('shows a result the scan just looked up without a second request, and still saves it', async () => {
  rememberLookup(foundYogurt);
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  expect(result.current.data?.product.id).toBe(foundYogurt.product.id);
  expect(result.current.loading).toBe(false);
  expect(result.current.cached).toBeUndefined();
  await waitFor(() => expect(saveToHistory).toHaveBeenCalledWith(foundYogurt));
  expect(api.lookup).not.toHaveBeenCalled();
  expect(freshLookup(foundYogurt.product.id)).toBeUndefined(); // a later visit fetches the current product
});
it('uses a fresh handoff for each of two scans of the same product, with no id lookup and a history save each time', async () => {
  for (let scan = 1; scan <= 2; scan++) {
    rememberLookup(foundYogurt);
    const { result, unmount } = await renderHook(() => useProduct(foundYogurt.product.id));
    expect(result.current.data?.product.id).toBe(foundYogurt.product.id);
    await waitFor(() => expect(saveToHistory).toHaveBeenCalledTimes(scan));
    expect(freshLookup(foundYogurt.product.id)).toBeUndefined();
    await unmount();
  }
  expect(saveToHistory).toHaveBeenNthCalledWith(2, foundYogurt);
  expect(api.lookup).not.toHaveBeenCalled();
});
it('fetches the current product when it is reopened after its handoff was used', async () => {
  rememberLookup(foundYogurt);
  const first = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(saveToHistory).toHaveBeenCalledTimes(1));
  await first.unmount();
  const updated = { ...foundYogurt, product: { ...foundYogurt.product, name: 'Iaurt actualizat' } };
  jest.mocked(api.lookup).mockResolvedValue(updated);
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.data?.product.name).toBe('Iaurt actualizat'));
  expect(api.lookup).toHaveBeenCalledTimes(1);
  expect(api.lookup).toHaveBeenCalledWith({ id: foundYogurt.product.id });
});
