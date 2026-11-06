import { renderHook, waitFor } from '@testing-library/react-native';
import { useProduct } from './useProduct';
import { api, ApiError } from '../../lib/api';
import { foundYogurt } from '../../test/fixtures';
import { saveToHistory, getFromHistory } from '../history/store';

let mockPreview = true;
jest.mock('../../lib/preview', () => ({ get isPreview() { return mockPreview; } }));
jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { lookup: jest.fn() } }));
jest.mock('../history/store', () => ({ saveToHistory: jest.fn(), getFromHistory: jest.fn() }));
beforeEach(() => { jest.resetAllMocks(); mockPreview = true; });

it('opens the displayed demo yogurt without a backend or a history write', async () => {
  jest.mocked(api.lookup).mockRejectedValue(new ApiError('configuration'));
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data?.product.id).toBe(foundYogurt.product.id);
  expect(result.current.error).toBeUndefined();
  expect(api.lookup).not.toHaveBeenCalled();
  expect(saveToHistory).not.toHaveBeenCalled();
});
it('never sends an unknown demo ID to the backend', async () => {
  const { result } = await renderHook(() => useProduct('00000000-0000-4000-8000-000000000099'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error?.code).toBe('not_found');
  expect(api.lookup).not.toHaveBeenCalled();
  expect(saveToHistory).not.toHaveBeenCalled();
});
it('uses the real backend in real mode, even for the demo ID', async () => {
  mockPreview = false;
  jest.mocked(api.lookup).mockResolvedValue({ status: 'not_found' });
  const { result } = await renderHook(() => useProduct(foundYogurt.product.id));
  await waitFor(() => expect(result.current.error?.code).toBe('not_found'));
  expect(api.lookup).toHaveBeenCalledWith({ id: foundYogurt.product.id });
  expect(result.current.data).toBeUndefined();
  expect(getFromHistory).not.toHaveBeenCalled();
});
