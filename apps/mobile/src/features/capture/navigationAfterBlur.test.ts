// Audit R5-01: a response that arrives after the shopper left the screen must not navigate or replace a draft.
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../offline/photos', () => ({ keepPhoto: async (uri: string) => `kept:${uri}`, removePhoto: async () => {} }));
import { act, renderHook } from '@testing-library/react-native';
import { api } from '../../lib/api';
import { getAddReviewDraft } from '../add/draftStore';
import { useAddFlow } from '../add/useAddFlow';
import { useScanLookup } from '../scan/useScanLookup';
import { useCaptureFlow } from './useCaptureFlow';
import { CODE, completed, identifyFound, lookupFound, pendingOutcome } from './__fixtures__/responses';

const mockReplace = jest.fn();
let mockLeave: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (callback: () => void | (() => void)) => {
    jest.requireActual<typeof import('react')>('react').useEffect(() => {
      mockLeave = callback() || undefined;
      return () => mockLeave?.();
    }, [callback]);
  },
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('./compressPhoto', () => ({ compressPhoto: async (uri: string) => ({ uri, base64: 'aGVsbG8=' }) }));
jest.mock('./findBarcode', () => ({ findBarcode: async () => null }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identifyOutcome: jest.fn(), readLabelOutcome: jest.fn() } }));
jest.mock('../offline/queue', () => ({ enqueue: jest.fn() }));

type AsyncMock = jest.Mock<(...a: unknown[]) => Promise<unknown>>;
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
const camera = { takePictureAsync: async () => ({ uri: 'file:///shot.jpg' }) };
const label = {
  ingredientsText: 'lapte', unit: 'g', unclear: [], ingredientsPhotoPath: 'd/i.jpg', nutritionPhotoPath: null,
  nutrients: { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: 0, fruitVegPct: null },
};

describe('responses after leaving the screen', () => {
  beforeEach(() => { mockReplace.mockReset(); mockLeave = undefined; });

  it('capture does not replace the route the shopper moved to', async () => {
    const pending = deferred<unknown>();
    (api.identifyOutcome as unknown as AsyncMock).mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useCaptureFlow());
    let run!: Promise<void>;
    await act(async () => { run = result.current.takePhoto(camera); });
    await act(async () => { mockLeave?.(); pending.resolve(completed(identifyFound)); await run; });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle'); // no stuck spinner when the shopper returns
  });

  it('capture ignores late completion after blur from a pending >55 s analysis', async () => {
    const delayed = deferred<typeof identifyFound>();
    (api.identifyOutcome as unknown as AsyncMock).mockResolvedValueOnce(pendingOutcome(delayed.promise));
    const { result } = await renderHook(() => useCaptureFlow());
    let run!: Promise<void>;
    await act(async () => { run = result.current.takePhoto(camera); });
    expect(result.current.state.status).toBe('pending');
    await act(async () => { mockLeave?.(); delayed.resolve(identifyFound); await run; });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');
  });

  it('a label read still opens review while the screen stays focused (control)', async () => {
    (api.readLabelOutcome as unknown as AsyncMock).mockResolvedValue(completed(label));
    const { result } = await renderHook(() => useAddFlow());
    await act(async () => { await result.current.takePhoto(camera); });
    await act(async () => { await result.current.submitSamePhoto(); });
    expect(mockReplace).toHaveBeenCalledWith('/add/review');
  });

  it('a label read does not replace the draft or route after blur', async () => {
    const pending = deferred<unknown>();
    (api.readLabelOutcome as unknown as AsyncMock).mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useAddFlow());
    await act(async () => { await result.current.takePhoto(camera); });
    let run!: Promise<void>;
    await act(async () => { run = result.current.submitSamePhoto(); });
    const before = getAddReviewDraft();
    await act(async () => { mockLeave?.(); pending.resolve(completed(label)); await run; });
    expect(getAddReviewDraft()).toBe(before);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');
  });

  it('label capture ignores late completion after blur from a pending >55 s analysis', async () => {
    const delayed = deferred<typeof label>();
    (api.readLabelOutcome as unknown as AsyncMock).mockResolvedValueOnce(pendingOutcome(delayed.promise));
    const { result } = await renderHook(() => useAddFlow());
    await act(async () => { await result.current.takePhoto(camera); });
    let run!: Promise<void>;
    await act(async () => { run = result.current.submitSamePhoto(); });
    expect(result.current.state.status).toBe('pending');
    const before = getAddReviewDraft();
    await act(async () => { mockLeave?.(); delayed.resolve(label); await run; });
    expect(getAddReviewDraft()).toBe(before);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');
  });

  it('a manual lookup does not navigate after unmount', async () => {
    const pending = deferred<unknown>();
    (api.lookup as unknown as AsyncMock).mockReturnValue(pending.promise);
    const view = await renderHook(() => useScanLookup());
    let run!: Promise<void> | undefined;
    await act(async () => { run = view.result.current.onManualCode(CODE); });
    await view.unmount();
    await act(async () => { pending.resolve(lookupFound); await run; });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
