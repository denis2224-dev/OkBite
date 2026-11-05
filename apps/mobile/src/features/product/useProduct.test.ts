import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useProduct } from './useProduct';
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
