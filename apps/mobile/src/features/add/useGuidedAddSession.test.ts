import { act, renderHook } from '@testing-library/react-native';
import { useGuidedAddSession } from './useGuidedAddSession';
import { clearUnknownDraft, loadUnknownDraft, saveUnknownDraft } from './unknownDraft';
import { requestUnknownFlow } from './unknownFlowTransport';
import { api } from '../../lib/api';
import { NUTRIENT_KEYS } from '@okbite/shared';
import { removePhoto } from '../offline/photos';
const mockReplace = jest.fn();
let mockDelayFocus = false;
let mockFocus: (() => void | (() => void)) | undefined;
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }), useFocusEffect: (fn: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(() => {
  if (mockDelayFocus) { mockFocus = fn; return; }
  return fn();
}, [fn]) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'draft-id' }));
jest.mock('./unknownDraft', () => ({ ...jest.requireActual('./unknownDraftRepository'), loadUnknownDraft: jest.fn(), saveUnknownDraft: jest.fn(), saveUnknownDraftIfCurrent: jest.fn(async () => true), clearUnknownDraft: jest.fn() }));
jest.mock('./unknownFlowTransport', () => ({ requestUnknownFlow: jest.fn() }));
jest.mock('./completeUnknownDraft', () => ({ completeUnknownDraft: jest.fn() }));
jest.mock('../../lib/api', () => ({ api: { identifyOutcome: jest.fn() } }));
jest.mock('../capture/compressPhoto', () => ({ compressPhoto: async (uri: string) => ({ uri, base64: 'jpeg', bytes: 20 }) }));
jest.mock('../offline/photos', () => ({ keepPhoto: async (uri: string) => 'kept-' + uri, openPhoto: async (id: string) => ({ uri: id, release() {} }), removePhoto: jest.fn() }));
const initial = { code: '4840001000014', name: 'Test product', brand: null, quantity: null, photoPath: 'device/front.jpg' };
const label = { ingredientsText: 'ingredient test', unit: null, nutrients: Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])), unclear: [], ingredientsPhotoPath: 'device/ingredients.jpg', nutritionPhotoPath: null, reasons: Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(key => [key, key === 'ingredientsText' ? 'read' : 'not_printed'])) };
beforeEach(() => { jest.clearAllMocks(); mockDelayFocus = false; mockFocus = undefined; jest.mocked(loadUnknownDraft).mockResolvedValue(null); jest.mocked(requestUnknownFlow).mockResolvedValue(label); });

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
  let finish!: (value: typeof label) => void;
  jest.mocked(requestUnknownFlow).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  let reading!: Promise<void>;
  await act(async () => { reading = result.current.controller!.chooseNutrition('none'); });
  await act(async () => { blur!(); mockFocus!(); await result.current.controller!.retry(); finish(label); await reading; });
  expect(mockReplace).not.toHaveBeenCalled();
});

test('asks after ingredients and reads only after an explicit answer', async () => {
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.state?.stage).toBe('ingredients');
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  expect(result.current.state?.stage).toBe('nutrition_question');
  expect(requestUnknownFlow).not.toHaveBeenCalled();
  await act(async () => { await result.current.controller!.chooseNutrition('none'); });
  expect(requestUnknownFlow).toHaveBeenCalledTimes(1);
  expect(jest.mocked(requestUnknownFlow).mock.calls[0]?.[3]).toMatchObject({ nutrition: 'none' });
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'draft-id' } });
  expect(saveUnknownDraft).toHaveBeenCalled();
});
test('restores a pending read as interrupted without replay', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValue({ version: 1, id: 'pending', initial, stage: 'reading', nutritionMode: 'none', photos: { front: null, ingredients: 'stored-ingredients', nutrition: null }, label: null, readStatus: 'interrupted' });
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.state?.stage).toBe('interrupted');
  expect(requestUnknownFlow).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('requires choosing a saved draft when a different barcode starts a new product', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ version: 1, id: 'older-draft', initial: { ...initial, code: null },
    stage: 'ingredients', nutritionMode: null, photos: { front: 'old-front', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' });
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.draftConflict).toBe(true);
  expect(requestUnknownFlow).not.toHaveBeenCalled();
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
  let finish!: (value: unknown) => void;
  jest.mocked(requestUnknownFlow).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { result, unmount } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  await act(async () => { await result.current.controller!.capturePhoto('ingredients'); });
  let reading!: Promise<void>;
  await act(async () => { reading = result.current.controller!.chooseNutrition('skipped'); });
  await unmount();
  await act(async () => { finish(label); await reading; });
  expect(mockReplace).not.toHaveBeenCalled();
});
test('does not start a read when draft restoration fails', async () => {
  jest.mocked(loadUnknownDraft).mockRejectedValueOnce(new Error('storage unavailable'));
  const { result } = await renderHook(() => useGuidedAddSession(initial));
  await act(async () => {});
  expect(result.current.error).toBeTruthy();
  expect(result.current.controller).toBeNull();
  expect(requestUnknownFlow).not.toHaveBeenCalled();
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
    params: expect.objectContaining({
      source: 'photo',
      payload: expect.stringContaining('4840001000014'),
    }),
  }));
});
