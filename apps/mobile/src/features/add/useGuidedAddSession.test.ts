import { act, renderHook } from '@testing-library/react-native';
import { useGuidedAddSession } from './useGuidedAddSession';
import { clearUnknownDraft, loadUnknownDraft, saveUnknownDraft, saveUnknownDraftIfCurrent } from './unknownDraft';
import { completeUnknownDraft } from './completeUnknownDraft';
import { api } from '../../lib/api';
import type { AnalysisOutcome } from '../../lib/analysisOutcome';
import { NUTRIENT_KEYS, ReadLabelResponse } from '@okbite/shared';
import { removePhoto } from '../offline/photos';
import { getIdentifyDraft } from './draftStore';
import { PRODUCT_ID, identifyFound, identifyNotFound } from '../capture/__fixtures__/responses';

const completed = <T,>(result: T): AnalysisOutcome<T> => ({ status: 'completed', result });
const pendingOutcome = <T,>(completion: Promise<T>): AnalysisOutcome<T> => ({ status: 'pending', retryAllowed: false, completion });
const mockReplace = jest.fn();
let mockDelayFocus = false;
let mockFocus: (() => void | (() => void)) | undefined;
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }), useFocusEffect: (fn: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(() => {
  if (mockDelayFocus) { mockFocus = fn; return; }
  return fn();
}, [fn]) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'draft-id' }));
jest.mock('./unknownDraft', () => ({ ...jest.requireActual('./unknownDraftRepository'), loadUnknownDraft: jest.fn(), saveUnknownDraft: jest.fn(), saveUnknownDraftIfCurrent: jest.fn(async () => true), clearUnknownDraft: jest.fn() }));
jest.mock('./completeUnknownDraft', () => ({ completeUnknownDraft: jest.fn() }));
jest.mock('../../lib/api', () => ({ api: { identifyOutcome: jest.fn(), readLabelOutcome: jest.fn() } }));
jest.mock('../capture/compressPhoto', () => ({ compressPhoto: async (uri: string) => ({ uri, base64: 'jpeg', bytes: 20 }) }));
jest.mock('../offline/photos', () => ({ keepPhoto: async (uri: string) => 'kept-' + uri, openPhoto: async (id: string) => ({ uri: id, release() {} }), removePhoto: jest.fn() }));
const initial = { code: '4840001000014', name: 'Test product', brand: null, quantity: null, photoPath: 'device/front.jpg' };
const label = { ingredientsText: 'ingredient test', unit: null, nutrients: Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])), unclear: [], ingredientsPhotoPath: 'device/ingredients.jpg', nutritionPhotoPath: null, reasons: Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(key => [key, key === 'ingredientsText' ? 'read' : 'not_printed'])) };
beforeEach(() => { jest.clearAllMocks(); mockDelayFocus = false; mockFocus = undefined; jest.mocked(loadUnknownDraft).mockResolvedValue(null); jest.mocked(api.readLabelOutcome).mockResolvedValue(completed(label) as never); jest.mocked(completeUnknownDraft).mockResolvedValue(undefined); jest.mocked(api.identifyOutcome).mockReset(); });

test.each(['before', 'after'])('opens confirmation when first focus arrives %s draft restoration', async ordering => {
  mockDelayFocus = true;
  let finish!: (draft: null) => void;
  jest.mocked(loadUnknownDraft).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  if (ordering === 'before') await act(async () => { mockFocus!(); finish(null); });
  else { await act(async () => { finish(null); }); await act(async () => { mockFocus!(); }); }
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  await act(async () => { await result.current.controller!.chooseNutrition('none'); });
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'draft-id' } });
});

test('does not navigate when a read finishes after blur and refocus', async () => {
  mockDelayFocus = true;
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  let finish!: (value: AnalysisOutcome<typeof label>) => void;
  jest.mocked(api.readLabelOutcome).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }) as never);
  let reading!: Promise<void>;
  await act(async () => { reading = result.current.controller!.chooseNutrition('none'); });
  await act(async () => { blur!(); mockFocus!(); await result.current.controller!.retry(); finish(completed(label)); await reading; });
  expect(mockReplace).not.toHaveBeenCalled();
});

test('asks after ingredients and reads only after an explicit answer', async () => {
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.state?.stage).toBe('ingredients');
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  expect(result.current.state?.stage).toBe('nutrition_question');
  expect(api.readLabelOutcome).not.toHaveBeenCalled();
  await act(async () => { await result.current.controller!.chooseNutrition('none'); });
  expect(api.readLabelOutcome).toHaveBeenCalledTimes(1);
  expect(jest.mocked(api.readLabelOutcome).mock.calls[0]?.[0]).toMatchObject({ nutrition: 'none' });
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'draft-id' } });
  expect(saveUnknownDraft).toHaveBeenCalled();
});
test('restores a pending read as interrupted without replay', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValue({ version: 1, id: 'pending', initial, stage: 'reading', nutritionMode: 'none', photos: { front: null, ingredients: 'stored-ingredients', nutrition: null }, label: null, readStatus: 'interrupted' });
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.state?.stage).toBe('interrupted');
  expect(api.readLabelOutcome).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('requires choosing a saved draft when a different barcode starts a new product', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ version: 1, id: 'older-draft', initial: { ...initial, code: null },
    stage: 'ingredients', nutritionMode: null, photos: { front: 'old-front', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' });
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.draftConflict).toBe(true);
  expect(api.readLabelOutcome).not.toHaveBeenCalled();
});

test('discarding a saved draft restarts a usable session for the incoming product', async () => {
  jest.mocked(removePhoto).mockResolvedValue();
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ version: 1, id: 'older-draft', initial,
    stage: 'ingredients', nutritionMode: null, photos: { front: 'old-front', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' });
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  await act(async () => { await result.current.discardDraft(); });
  expect(result.current.state?.initial).toMatchObject(initial);
  await act(async () => { await result.current.controller!.capturePhoto('new-ingredients'); });
  expect(result.current.state?.stage).toBe('nutrition_question');
  expect(result.current.restoredFromDraft).toBe(false);
});

test('a failed draft deletion keeps the flow usable and reports the storage error', async () => {
  jest.mocked(clearUnknownDraft).mockRejectedValueOnce(new Error('storage failed'));
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  await act(async () => { await result.current.discardDraft(); });
  expect(result.current.discardError).toBe(true);
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  expect(result.current.state?.stage).toBe('nutrition_question');
});
test('suppresses navigation when a read finishes after unmount', async () => {
  let finish!: (value: AnalysisOutcome<typeof label>) => void;
  jest.mocked(api.readLabelOutcome).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }) as never);
  const { result, unmount } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  let reading!: Promise<void>;
  await act(async () => { reading = result.current.controller!.chooseNutrition('skipped'); });
  await unmount();
  await act(async () => { finish(completed(label)); await reading; });
  expect(mockReplace).not.toHaveBeenCalled();
});
test('does not start a read when draft restoration fails', async () => {
  jest.mocked(loadUnknownDraft).mockRejectedValueOnce(new Error('storage unavailable'));
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.error).toBeTruthy();
  expect(result.current.controller).toBeNull();
  expect(api.readLabelOutcome).not.toHaveBeenCalled();
});
test('sends front photo for barcode-only entry and shows identify candidates while keeping scanned code', async () => {
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce({
    status: 'completed',
    result: {
      status: 'candidates',
      candidates: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Candidat', brand: 'Brand', quantity: '100 g', imageUrl: null, similarity: 0.7 }],
      read: { brand: 'Brand', name: 'Candidat', quantity: '100 g', code: null },
      photoPath: 'device/front.jpg',
    },
  });
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => {});
  expect(result.current.state?.stage).toBe('front');
  await act(async () => { await result.current.controller!.capturePhoto('front-shot'); });
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({
    pathname: '/identify',
    params: { source: 'photo', frontPhotoId: 'kept-front-shot', unknownDraftId: 'draft-id' },
  }));
  expect(getIdentifyDraft('draft-id')).toMatchObject({ read: { code: '4840001000014' } });
  expect(getIdentifyDraft('another-draft')).toBeUndefined();
});

test('waits on front identify completion after >55 s, blocks duplicate calls, and advances on late resolution', async () => {
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => {});
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(result.current.state?.stage).toBe('working');
  await act(async () => {
    await result.current.controller!.capturePhoto('front-shot-2');
    await result.current.controller!.retry();
  });
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish({ status: 'not_found', read: { brand: 'Brand', name: null, quantity: null, code: null }, photoPath: 'device/front.jpg' });
    await running;
  });
  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).toBe('ingredients');
});

test('surfaces pending retry state and allows explicit retry when late front identify rejects', async () => {
  let rejectLate!: (err: unknown) => void;
  jest.mocked(api.identifyOutcome)
    .mockResolvedValueOnce(pendingOutcome(new Promise((_r, reject) => { rejectLate = reject; })) as never)
    .mockResolvedValueOnce(completed({ status: 'not_found', read: { brand: null, name: null, quantity: null, code: null }, photoPath: 'device/front.jpg' }) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => {});
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  await act(async () => {
    rejectLate(Object.assign(new Error('upstream'), { code: 'upstream_failed' }));
    await running;
  });
  expect(result.current.state?.stage).toBe('error');
  expect(result.current.frontPending).toBe('retry');
  await act(async () => { await result.current.controller!.retry(); });
  expect(api.identifyOutcome).toHaveBeenCalledTimes(2);
  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).toBe('ingredients');
});

test('suppresses front identify navigation when unmounted while pending', async () => {
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result, unmount } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => {});
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  await unmount();
  await act(async () => {
    finish({ status: 'candidates', candidates: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Candidat', brand: 'Brand', quantity: '100 g', imageUrl: null, similarity: 0.7 }], read: { brand: 'Brand', name: 'Candidat', quantity: '100 g', code: null }, photoPath: 'device/front.jpg' });
    await running;
  });
  expect(mockReplace).not.toHaveBeenCalled();
});

test('completes draft and navigates when pending front identify resolves found while focused', async () => {
  mockDelayFocus = true;
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => { mockFocus!(); });
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  await act(async () => { finish(identifyFound); await running; });
  expect(completeUnknownDraft).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
});

test('does not persist ingredients draft or navigate when pending front not_found arrives after blur without unmount', async () => {
  mockDelayFocus = true;
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  expect(saveUnknownDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    stage: 'front',
    readStatus: 'pending',
    photos: expect.objectContaining({ front: 'kept-front-shot' }),
  }));
  jest.mocked(saveUnknownDraft).mockClear();
  jest.mocked(saveUnknownDraftIfCurrent).mockClear();
  jest.mocked(completeUnknownDraft).mockClear();
  jest.mocked(clearUnknownDraft).mockClear();
  jest.mocked(removePhoto).mockClear();
  mockReplace.mockClear();

  await act(async () => { blur!(); });
  await act(async () => { finish(identifyNotFound); await running; });

  expect(mockReplace).not.toHaveBeenCalled();
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(saveUnknownDraftIfCurrent).not.toHaveBeenCalled();
  expect(completeUnknownDraft).not.toHaveBeenCalled();
  expect(clearUnknownDraft).not.toHaveBeenCalled();
  expect(removePhoto).not.toHaveBeenCalled();
  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).not.toBe('ingredients');
  expect(result.current.state?.stage).not.toBe('error');
  expect(result.current.state?.photos.front).toBe('kept-front-shot');
});

test('does not complete draft, clear photos, or navigate when pending front found arrives after blur without unmount', async () => {
  mockDelayFocus = true;
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  jest.mocked(saveUnknownDraft).mockClear();
  jest.mocked(saveUnknownDraftIfCurrent).mockClear();
  jest.mocked(completeUnknownDraft).mockClear();
  jest.mocked(clearUnknownDraft).mockClear();
  jest.mocked(removePhoto).mockClear();
  mockReplace.mockClear();

  await act(async () => { blur!(); });
  await act(async () => { finish(identifyFound); await running; });

  expect(completeUnknownDraft).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(saveUnknownDraftIfCurrent).not.toHaveBeenCalled();
  expect(clearUnknownDraft).not.toHaveBeenCalled();
  expect(removePhoto).not.toHaveBeenCalled();
  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).not.toBe('ingredients');
  expect(result.current.state?.photos.front).toBe('kept-front-shot');
});

test('ignores stale front completion after blur followed by refocus and allows manual retry', async () => {
  mockDelayFocus = true;
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome)
    .mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never)
    .mockResolvedValueOnce(completed(identifyNotFound) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  jest.mocked(saveUnknownDraft).mockClear();

  await act(async () => { blur!(); mockFocus!(); });
  await act(async () => { finish(identifyFound); await running; });

  expect(completeUnknownDraft).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(clearUnknownDraft).not.toHaveBeenCalled();
  expect(removePhoto).not.toHaveBeenCalled();
  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).not.toBe('ingredients');

  await act(async () => { await result.current.controller!.retry(); });
  expect(api.identifyOutcome).toHaveBeenCalledTimes(2);
  expect(result.current.state?.stage).toBe('ingredients');
});

test('ignores late front rejection after blur without stale error state or draft mutation and recovers on refocus', async () => {
  mockDelayFocus = true;
  let rejectLate!: (err: unknown) => void;
  jest.mocked(api.identifyOutcome)
    .mockResolvedValueOnce(pendingOutcome(new Promise((_r, reject) => { rejectLate = reject; })) as never)
    .mockResolvedValueOnce(completed(identifyNotFound) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  jest.mocked(saveUnknownDraft).mockClear();

  await act(async () => { blur!(); });
  await act(async () => {
    rejectLate(Object.assign(new Error('upstream'), { code: 'upstream_failed' }));
    await running;
  });

  expect(mockReplace).not.toHaveBeenCalled();
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).not.toBe('error');
  expect(result.current.state?.photos.front).toBe('kept-front-shot');

  await act(async () => { mockFocus!(); });
  await act(async () => { await result.current.controller!.retry(); });
  expect(api.identifyOutcome).toHaveBeenCalledTimes(2);
  expect(result.current.state?.stage).toBe('ingredients');
});

test.each([
  ['found', identifyFound],
  ['not_found', identifyNotFound],
] as const)('stale front %s completion cannot overwrite or clear a newer draft', async (_kind, outcomeResult) => {
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => {});
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  jest.mocked(saveUnknownDraft).mockClear();
  jest.mocked(loadUnknownDraft).mockResolvedValue({
    version: 1,
    id: 'newer-draft',
    initial,
    stage: 'ingredients',
    nutritionMode: null,
    photos: { front: 'newer-front', ingredients: null, nutrition: null },
    label: null,
    readStatus: 'idle',
  });

  await act(async () => { finish(outcomeResult); await running; });

  expect(completeUnknownDraft).not.toHaveBeenCalled();
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(saveUnknownDraftIfCurrent).not.toHaveBeenCalled();
  expect(clearUnknownDraft).not.toHaveBeenCalled();
  expect(removePhoto).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('discarding the draft prevents a pending front found result from writing or deleting the new draft', async () => {
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => {});
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  await act(async () => { await result.current.discardDraft(); });
  jest.mocked(saveUnknownDraft).mockClear();
  jest.mocked(clearUnknownDraft).mockClear();
  jest.mocked(removePhoto).mockClear();
  mockReplace.mockClear();

  await act(async () => { finish(identifyFound); await running; });

  expect(completeUnknownDraft).not.toHaveBeenCalled();
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(clearUnknownDraft).not.toHaveBeenCalled();
  expect(removePhoto).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(result.current.state?.stage).toBe('front');
});

test('persists completed label read across blur and refocus without navigating', async () => {
  mockDelayFocus = true;
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  let finishRead!: (value: AnalysisOutcome<typeof label>) => void;
  jest.mocked(api.readLabelOutcome).mockReturnValueOnce(new Promise(resolve => { finishRead = resolve; }) as never);
  let reading!: Promise<void>;
  await act(async () => { reading = result.current.controller!.chooseNutrition('none'); });
  jest.mocked(saveUnknownDraft).mockClear();
  mockReplace.mockClear();

  await act(async () => {
    blur!();
    mockFocus!();
    finishRead(completed(label));
    await reading;
  });

  expect(mockReplace).not.toHaveBeenCalled();
  expect(result.current.state?.stage).toBe('review');
  expect(saveUnknownDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    stage: 'review',
    readStatus: 'complete',
    label: expect.objectContaining({ ingredientsText: 'ingredient test' }),
  }));
});

test('retries front identification rather than readLabel after front retake blurs while pending', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({
    version: 1,
    id: 'review-draft',
    initial: { ...initial, photoPath: 'old/front.jpg' },
    stage: 'review',
    nutritionMode: 'none',
    photos: { front: 'old-front', ingredients: 'kept-ingredients', nutrition: null },
    label: ReadLabelResponse.parse(label),
    readStatus: 'complete',
  });
  mockDelayFocus = true;
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome)
    .mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never)
    .mockResolvedValueOnce(completed(identifyNotFound) as never);
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });
  await act(async () => { result.current.controller!.retake('front'); });
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('new-front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  jest.mocked(api.readLabelOutcome).mockClear();

  await act(async () => { blur!(); });
  await act(async () => { finish(identifyFound); await running; });
  await act(async () => { mockFocus!(); });
  await act(async () => { await result.current.controller!.retry(); });

  expect(api.identifyOutcome).toHaveBeenCalledTimes(2);
  expect(api.readLabelOutcome).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'review-draft' } });
});

test('abandons stale front identification when blur happens while awaiting post-completion draft lookup', async () => {
  mockDelayFocus = true;
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });

  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(api.identifyOutcome).toHaveBeenCalledTimes(1);
  jest.mocked(saveUnknownDraft).mockClear();
  mockReplace.mockClear();

  let resolvePostLookup!: (value: null) => void;
  jest.mocked(loadUnknownDraft).mockReturnValueOnce(new Promise(resolve => { resolvePostLookup = resolve; }));

  await act(async () => {
    finish(identifyNotFound);
    await Promise.resolve();
  });
  await act(async () => { blur!(); });
  await act(async () => {
    resolvePostLookup(null);
    await running;
  });

  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).not.toBe('ingredients');
  expect(result.current.state?.stage).not.toBe('error');
  expect(saveUnknownDraft).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('abandons pending front identify immediately without awaiting completion if blurred before 55 s', async () => {
  mockDelayFocus = true;
  let resolveOutcome!: (outcome: unknown) => void;
  jest.mocked(api.identifyOutcome)
    .mockReturnValueOnce(new Promise(resolve => { resolveOutcome = resolve; }) as never)
    .mockResolvedValueOnce(completed(identifyNotFound) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  let blur: void | (() => void);
  await act(async () => { blur = mockFocus!(); });

  let settled = false;
  let running!: Promise<void>;
  await act(async () => {
    running = result.current.controller!.capturePhoto('front-shot').finally(() => { settled = true; });
    await Promise.resolve();
  });
  await act(async () => { blur!(); mockFocus!(); });

  let finishCompletion!: (res: unknown) => void;
  await act(async () => {
    resolveOutcome(pendingOutcome(new Promise(resolve => { finishCompletion = resolve; })));
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });

  expect(settled).toBe(true);
  expect(result.current.frontPending).toBe('none');
  expect(result.current.state?.stage).toBe('interrupted');

  await act(async () => { await result.current.controller!.retry(); });
  expect(api.identifyOutcome).toHaveBeenCalledTimes(2);
  expect(result.current.state?.stage).toBe('ingredients');

  await act(async () => {
    finishCompletion(identifyFound);
    await running;
  });
});

test('waits on >55 s label read completion, surfaces retry guidance on late failure, and allows retry', async () => {
  let rejectLate!: (err: unknown) => void;
  jest.mocked(api.readLabelOutcome)
    .mockResolvedValueOnce(pendingOutcome(new Promise((_r, reject) => { rejectLate = reject; })) as never)
    .mockResolvedValueOnce(completed(label) as never);
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });

  let reading!: Promise<void>;
  await act(async () => { reading = result.current.controller!.chooseNutrition('none'); });
  expect(result.current.frontPending).toBe('waiting');
  expect(result.current.state?.stage).toBe('working');

  await act(async () => {
    rejectLate(Object.assign(new Error('upstream'), { code: 'upstream_failed' }));
    await reading;
  });
  expect(result.current.state?.stage).toBe('error');
  expect(result.current.frontPending).toBe('retry');

  await act(async () => { await result.current.controller!.retry(); });
  expect(api.readLabelOutcome).toHaveBeenCalledTimes(2);
  expect(result.current.frontPending).toBe('none');
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'draft-id' } });
});

test('surfaces pending retry guidance when a >55 s front identify completes with a blank photoPath', async () => {
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);
  const { result } = await renderHook(() => useGuidedAddSession({ ...initial, photoPath: null }));
  await act(async () => {});
  let running!: Promise<void>;
  await act(async () => { running = result.current.controller!.capturePhoto('front-shot'); });
  expect(result.current.frontPending).toBe('waiting');

  await act(async () => {
    finish({ status: 'not_found', read: { brand: null, name: null, quantity: null, code: null }, photoPath: '   ' });
    await running;
  });

  expect(result.current.state?.stage).toBe('error');
  expect(result.current.frontPending).toBe('retry');
});
