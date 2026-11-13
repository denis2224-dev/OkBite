import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../offline/photos', () => ({ keepPhoto: async (uri: string) => `kept:${uri}`, removePhoto: async () => {} }));
import { useCaptureFlow } from './useCaptureFlow';
import { useAddFlow } from '../add/useAddFlow';
import { useScanLookup } from '../scan/useScanLookup';
import { api } from '../../lib/api';
import { setAddReviewDraft } from '../add/draftStore';
import { enqueue } from '../offline/queue';
import { CODE, completed, identifyFound, lookupFound } from './__fixtures__/responses';

const mockRouter = { replace: jest.fn() };
let mockLeave: (() => void) | undefined;
let mockEnter: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  useFocusEffect: (callback: () => void | (() => void)) => {
    jest.requireActual<typeof import('react')>('react').useEffect(() => {
      let cleanup: (() => void) | undefined;
      mockEnter = () => { cleanup = callback() || undefined; };
      mockLeave = () => cleanup?.();
      mockEnter();
      return () => cleanup?.();
    }, [callback]);
  },
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('./compressPhoto', () => ({ compressPhoto: jest.fn(async () => ({ uri: 'file:///compressed.jpg', base64: 'anBlZw==', bytes: 4 })) }));
jest.mock('./findBarcode', () => ({ findBarcode: jest.fn(async () => null) }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identifyOutcome: jest.fn(), readLabelOutcome: jest.fn() } }));
jest.mock('../offline/queue', () => ({ enqueue: jest.fn() }));
jest.mock('../add/draftStore', () => ({
  setAddReviewDraft: jest.fn(),
  getAvailableCategories: () => [],
  initializeAvailableCategories: jest.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(finish => { resolve = finish; });
  return { promise, resolve };
}
const camera = { takePictureAsync: async () => ({ uri: 'file:///shot.jpg' }) };
beforeEach(() => { jest.clearAllMocks(); mockLeave = undefined; mockEnter = undefined; });

it.each([false, true])('does not navigate after capture blur, including refocus=%s', async refocus => {
  const pending = deferred<Awaited<ReturnType<typeof api.identifyOutcome>>>();
  jest.mocked(api.identifyOutcome).mockReturnValue(pending.promise);
  const view = await renderHook(useCaptureFlow);
  let task!: Promise<void>;
  await act(() => { task = view.result.current.takePhoto(camera); });
  await waitFor(() => expect(api.identifyOutcome).toHaveBeenCalledTimes(1));
  await act(() => { mockLeave?.(); if (refocus) mockEnter?.(); });
  await act(async () => { pending.resolve(completed(identifyFound)); await task; });
  expect(mockRouter.replace).not.toHaveBeenCalled();
  if (refocus) expect(view.result.current.state.status).toBe('idle');
});

it('does not replace the review draft or navigate after leaving label capture', async () => {
  const pending = deferred<Awaited<ReturnType<typeof api.readLabelOutcome>>>();
  jest.mocked(api.readLabelOutcome).mockReturnValue(pending.promise);
  const view = await renderHook(useAddFlow);
  await act(async () => { await view.result.current.takePhoto(camera); });
  let task!: Promise<void>;
  await act(() => { task = view.result.current.submitSamePhoto(); });
  await waitFor(() => expect(api.readLabelOutcome).toHaveBeenCalledTimes(1));
  await act(() => mockLeave?.());
  await act(async () => {
    pending.resolve(completed({ ingredientsText: 'lapte', unit: 'g', nutrients: lookupFound.status === 'found' ? lookupFound.product.nutrients : {}, unclear: [], ingredientsPhotoPath: 'private/ingredients.jpg', nutritionPhotoPath: null } as Awaited<ReturnType<typeof api.readLabel>>));
    await task;
  });
  expect(setAddReviewDraft).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it('does not navigate when a manual lookup resolves after unmount', async () => {
  const pending = deferred<typeof lookupFound>();
  jest.mocked(api.lookup).mockReturnValue(pending.promise);
  const view = await renderHook(useScanLookup);
  let task!: Promise<void> | undefined;
  await act(() => { task = view.result.current.onManualCode(CODE); });
  await waitFor(() => expect(api.lookup).toHaveBeenCalledTimes(1));
  await view.unmount();
  await act(async () => { pending.resolve(lookupFound); await task; });
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it('returns to idle when capture finished while the screen was away', async () => {
  const pending = deferred<Awaited<ReturnType<typeof api.identifyOutcome>>>();
  jest.mocked(api.identifyOutcome).mockReturnValue(pending.promise);
  const view = await renderHook(useCaptureFlow);
  let task!: Promise<void>;
  await act(() => { task = view.result.current.takePhoto(camera); });
  await waitFor(() => expect(api.identifyOutcome).toHaveBeenCalledTimes(1));
  await act(() => mockLeave?.());
  await act(async () => { pending.resolve(completed(identifyFound)); await task; });
  await act(() => mockEnter?.());
  expect(view.result.current.state.status).toBe('idle');
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it('allows camera scanning again after an offline response while away', async () => {
  let reject!: (error: unknown) => void;
  jest.mocked(api.lookup).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; })).mockResolvedValue(lookupFound);
  const view = await renderHook(useScanLookup);
  let task!: Promise<void> | undefined;
  await act(() => { task = view.result.current.onCameraCode(CODE); });
  await act(() => mockLeave?.());
  await act(async () => { reject(Object.assign(new Error('offline'), { code: 'offline' })); await task; });
  await act(() => mockEnter?.());
  expect(view.result.current.state.status).toBe('idle');
  await act(async () => { await view.result.current.onCameraCode(CODE); });
  expect(api.lookup).toHaveBeenCalledTimes(2);
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
});

it.each(['photo', 'code'] as const)('still queues offline %s work after leaving, without navigation', async kind => {
  let reject!: (error: unknown) => void;
  const pending = new Promise<never>((_resolve, fail) => { reject = fail; });
  jest.mocked(api.identifyOutcome).mockReturnValue(pending);
  jest.mocked(api.lookup).mockReturnValue(pending);
  const view = await renderHook(() => ({ capture: useCaptureFlow(), scan: useScanLookup() }));
  let task!: Promise<void> | undefined;
  await act(() => { task = kind === 'photo' ? view.result.current.capture.takePhoto(camera) : view.result.current.scan.onManualCode(CODE); });
  await waitFor(() => expect(kind === 'photo' ? api.identifyOutcome : api.lookup).toHaveBeenCalledTimes(1));
  await view.unmount();
  await act(async () => { reject(Object.assign(new Error('offline'), { code: 'offline' })); await task; });
  expect(enqueue).toHaveBeenCalledTimes(1);
  expect(enqueue).toHaveBeenCalledWith(kind === 'photo' ? { kind: 'photo', uri: 'file:///compressed.jpg' } : { kind: 'code', code: CODE });
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
