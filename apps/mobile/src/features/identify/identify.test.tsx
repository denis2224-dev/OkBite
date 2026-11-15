import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { IdentifyResponse } from '@okbite/shared';
import * as FileSystem from 'expo-file-system/legacy';
import { ro } from '../../copy/ro';
import { clearUnknownDraft, loadUnknownDraft } from '../add/unknownDraft';
import { resolveQueued } from '../offline/queue';
import { getIdentifyDraft, setIdentifyDraft } from '../add/draftStore';
import AddScreen from '../../../app/add/index';
import IdentifyScreen from '../../../app/identify';
import {
  GUIDED_ADD_ENABLED,
  addProductRoute,
  identifyCodeRoute,
  identifyPhotoRoute,
  parseAddParams,
  parseIdentifyParams,
  setGuidedAddEnabled,
} from './routes';

type ReplaceArg = string | { pathname: string; params: Record<string, string | undefined> };
const mockReplace = jest.fn<(href: ReplaceArg) => void>();
const mockParams: { value: Record<string, string | string[] | undefined> } = { value: {} };

function requireReplacedParams(callIndex = 0): Record<string, string | undefined> {
  const call = mockReplace.mock.calls[callIndex];
  if (!call) throw new Error(`Expected router.replace call at index ${callIndex}`);
  const [arg] = call;
  if (typeof arg === 'string') throw new Error(`Expected object route, got ${arg}`);
  return arg.params;
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams.value,
  useFocusEffect: (callback: () => void | (() => void)) => jest.requireActual<typeof React>('react').useEffect(callback, [callback]),
}));

const CAND_1 = {
  id: '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f',
  name: 'Iaurt cu căpșuni 2%',
  brand: 'Zorel',
  quantity: '400 g',
  imageUrl: 'https://okbite.md/img/zorel-400.jpg',
  similarity: 0.71,
};
const CAND_2 = {
  id: '1c7a4d2f-3e5b-4d9f-8a21-2b3c4d5e6f7a',
  name: 'Iaurt clasic 2,5%',
  brand: 'Zorel',
  quantity: '350 g',
  imageUrl: null,
  similarity: 0.52,
};
const ORIGINAL_READ = {
  brand: 'Zorel',
  name: 'Iaurt căpșuni',
  quantity: '400g',
  code: null,
};
const PHOTO_PATH = 'uploads/dev-1/front-1.jpg';
jest.mock('../offline/queue', () => ({ resolveQueued: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'front-uuid-1' }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  EncodingType: { Base64: 'base64' },
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async ({ from }: { from: string; to: string }) => {
    if (!from.startsWith('file://')) {
      throw new Error(`Refusing server storage path in keepPhoto: ${from}`);
    }
  }),
  getInfoAsync: jest.fn(async (uri: string) => ({ exists: uri.startsWith('file://') })),
  readAsStringAsync: jest.fn(async () => 'base64'),
  deleteAsync: jest.fn(async () => {}),
}));
jest.mock('../add/unknownDraft', () => ({
  ...jest.requireActual<typeof import('../add/unknownDraftRepository')>('../add/unknownDraftRepository'),
  loadUnknownDraft: jest.fn(async () => null),
  saveUnknownDraft: jest.fn(async () => {}),
  clearUnknownDraft: jest.fn(async () => {}),
}));

describe('IdentifyScreen and B3 flow', () => {
  beforeAll(() => {
    void [View, Text, Pressable, Image, ScrollView];
  }, 15_000);

  beforeEach(() => {
    jest.resetAllMocks();
    setGuidedAddEnabled(false);
    jest.mocked(FileSystem.copyAsync).mockImplementation(async ({ from }: { from: string; to: string }) => {
      if (!from.startsWith('file://')) {
        throw new Error(`Refusing server storage path in keepPhoto: ${from}`);
      }
    });
    jest.mocked(loadUnknownDraft).mockResolvedValue(null);
    mockParams.value = {};
  });
  it('keeps queued work until a shopper confirms a candidate', async () => {
    const response = IdentifyResponse.parse({ status: 'candidates', photoPath: PHOTO_PATH, read: ORIGINAL_READ, candidates: [CAND_1] });
    if (response.status === 'found') throw new Error('unexpected');
    mockParams.value = { ...identifyPhotoRoute(response).params, queueId: 'queued-id' };
    jest.mocked(resolveQueued).mockResolvedValue();
    const first = await render(<IdentifyScreen />);
    expect(resolveQueued).not.toHaveBeenCalled();
    await first.unmount();
    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));
    expect(resolveQueued).toHaveBeenCalledWith('queued-id');
  });
  it.each([false, true])('clears a confirmed draft while protecting newer shared photos: %s', async sharesPhoto => {
    jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ version: 1, id: 'confirmed-draft',
      initial: { ...ORIGINAL_READ, photoPath: PHOTO_PATH }, stage: 'ingredients', nutritionMode: null,
      photos: { front: 'kept-front', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' });
    jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ version: 1, id: 'newer-draft',
      initial: { ...ORIGINAL_READ, photoPath: PHOTO_PATH }, stage: 'ingredients', nutritionMode: null,
      photos: { front: sharesPhoto ? 'kept-front' : 'new-front', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' });
    const response = { status: 'candidates' as const, read: ORIGINAL_READ, photoPath: PHOTO_PATH, candidates: [CAND_1] };
    setIdentifyDraft('confirmed-draft', response);
    mockParams.value = identifyPhotoRoute(response, undefined, 'confirmed-draft').params;
    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));
    expect(clearUnknownDraft).toHaveBeenCalledWith('confirmed-draft');
    if (sharesPhoto) expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    else expect(FileSystem.deleteAsync).toHaveBeenCalledWith('kept-front', { idempotent: true });
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_1.id}`);
  });
  it('keeps unremoved photo IDs across a failed confirmation cleanup and retries deletion', async () => {
    const draft = { version: 1, id: 'cleanup-retry',
      initial: { ...ORIGINAL_READ, photoPath: PHOTO_PATH }, stage: 'ingredients', nutritionMode: null,
      photos: { front: 'retry-front', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' } as const;
    jest.mocked(loadUnknownDraft).mockResolvedValueOnce(draft).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    jest.mocked(FileSystem.deleteAsync).mockRejectedValueOnce(new Error('disk busy')).mockResolvedValue();
    const response = { status: 'candidates' as const, read: ORIGINAL_READ, photoPath: PHOTO_PATH, candidates: [CAND_1] };
    setIdentifyDraft(draft.id, response);
    mockParams.value = identifyPhotoRoute(response, undefined, draft.id).params;

    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));

    expect(screen.getByText(ro.review.savedPendingCleanup)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_1.id}`);
  });
  it('keeps the cleanup snapshot when reading the newer draft fails after clearing', async () => {
    const draft = { version: 1, id: 'cleanup-read-retry',
      initial: { ...ORIGINAL_READ, photoPath: PHOTO_PATH }, stage: 'ingredients', nutritionMode: null,
      photos: { front: 'read-retry-front', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' } as const;
    jest.mocked(loadUnknownDraft).mockResolvedValueOnce(draft).mockRejectedValueOnce(new Error('storage busy'))
      .mockResolvedValueOnce(null);
    const response = { status: 'candidates' as const, read: ORIGINAL_READ, photoPath: PHOTO_PATH, candidates: [CAND_1] };
    setIdentifyDraft(draft.id, response);
    mockParams.value = identifyPhotoRoute(response, undefined, draft.id).params;

    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));

    expect(screen.getByText(ro.review.savedPendingCleanup)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));

    expect(loadUnknownDraft).toHaveBeenCalledTimes(3);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('read-retry-front', { idempotent: true });
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_1.id}`);
  });
  it('does not delete a photo that a newer draft claims before cleanup retry', async () => {
    const draft = { version: 1, id: 'cleanup-reused',
      initial: { ...ORIGINAL_READ, photoPath: PHOTO_PATH }, stage: 'ingredients', nutritionMode: null,
      photos: { front: 'old-front', ingredients: 'shared-photo', nutrition: null }, label: null, readStatus: 'idle' } as const;
    const newer = { ...draft, id: 'newer-draft', photos: { front: 'new-front', ingredients: null, nutrition: null } };
    const newerUsingShared = { ...newer, photos: { ...newer.photos, ingredients: 'shared-photo' } };
    jest.mocked(loadUnknownDraft).mockResolvedValueOnce(draft).mockResolvedValueOnce(newer);
    jest.mocked(FileSystem.deleteAsync).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('disk busy'));
    const response = { status: 'candidates' as const, read: ORIGINAL_READ, photoPath: PHOTO_PATH, candidates: [CAND_1] };
    setIdentifyDraft(draft.id, response);
    mockParams.value = identifyPhotoRoute(response, undefined, draft.id).params;

    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));
    expect(screen.getByText(ro.review.savedPendingCleanup)).toBeTruthy();
    jest.mocked(loadUnknownDraft).mockResolvedValueOnce(newerUsingShared);
    await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
    expect(FileSystem.deleteAsync).toHaveBeenNthCalledWith(1, 'old-front', { idempotent: true });
    expect(FileSystem.deleteAsync).toHaveBeenNthCalledWith(2, 'shared-photo', { idempotent: true });
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_1.id}`);
  });
  it('leaves queue-owned photos intact while clearing a confirmed draft', async () => {
    const draft = { version: 1, id: 'queued-draft',
      initial: { ...ORIGINAL_READ, photoPath: PHOTO_PATH, queueId: 'queued-photo' }, stage: 'ingredients', nutritionMode: null,
      photos: { front: 'queue-photo', ingredients: null, nutrition: null }, label: null, readStatus: 'idle' } as const;
    jest.mocked(loadUnknownDraft).mockResolvedValueOnce(draft);
    jest.mocked(resolveQueued).mockResolvedValue();
    const response = { status: 'candidates' as const, read: ORIGINAL_READ, photoPath: PHOTO_PATH, candidates: [CAND_1] };
    setIdentifyDraft(draft.id, response);
    mockParams.value = { ...identifyPhotoRoute(response, undefined, draft.id).params, queueId: 'queued-photo' };

    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));

    expect(resolveQueued).toHaveBeenCalledWith('queued-photo');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_1.id}`);
  });
  it('retains the chosen product and retries local acknowledgement when storage fails', async () => {
    const response = IdentifyResponse.parse({ status: 'candidates', photoPath: PHOTO_PATH, read: ORIGINAL_READ, candidates: [CAND_1] });
    if (response.status === 'found') throw new Error('unexpected');
    mockParams.value = { ...identifyPhotoRoute(response).params, queueId: 'ack-failed' };
    jest.mocked(resolveQueued).mockRejectedValueOnce(new Error('database busy')).mockResolvedValueOnce();
    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));
    expect(screen.getByText(ro.review.savedPendingCleanup)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.review.finishSave }));
    expect(resolveQueued).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_1.id}`);
  });

  it('shows ConfirmMatch when there is 1 candidate with similarity >= 0.6 and navigates to product on confirm', async () => {
    const response = IdentifyResponse.parse({
      status: 'candidates',
      photoPath: PHOTO_PATH,
      read: ORIGINAL_READ,
      candidates: [{ ...CAND_1, similarity: 0.6 }],
    });
    if (response.status === 'found') throw new Error('unexpected');
    mockParams.value = identifyPhotoRoute(response).params;

    await render(<IdentifyScreen />);

    expect(screen.getByText(ro.identify.confirmTitle)).toBeTruthy();
    expect(screen.getByText(CAND_1.name)).toBeTruthy();
    expect(screen.getByText(`${CAND_1.brand}, ${CAND_1.quantity}`)).toBeTruthy();
    expect(screen.getByText(ro.identify.confirmHint)).toBeTruthy();
    expect(screen.getByLabelText(CAND_1.name)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_1.id}`);
  });

  it('preserves the original AI read (not the rejected candidate) and photoPath when rejecting ConfirmMatch', async () => {
    const response = IdentifyResponse.parse({
      status: 'candidates',
      photoPath: PHOTO_PATH,
      read: ORIGINAL_READ,
      candidates: [CAND_1],
    });
    if (response.status === 'found') throw new Error('unexpected');
    mockParams.value = identifyPhotoRoute(response).params;

    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmNo }));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add',
      params: {
        brand: ORIGINAL_READ.brand,
        name: ORIGINAL_READ.name,
        quantity: ORIGINAL_READ.quantity,
        photoPath: PHOTO_PATH,
      },
    });
    const sentParams = requireReplacedParams();
    expect('code' in sentParams).toBe(false);
    expect(Object.values(sentParams)).not.toContain('null');
    expect(Object.values(sentParams)).not.toContain('undefined');
  });

  it('shows CandidateList when a single candidate has similarity < 0.6', async () => {
    const response = IdentifyResponse.parse({
      status: 'candidates',
      photoPath: PHOTO_PATH,
      read: ORIGINAL_READ,
      candidates: [{ ...CAND_1, similarity: 0.59 }],
    });
    if (response.status === 'found') throw new Error('unexpected');
    mockParams.value = identifyPhotoRoute(response).params;

    await render(<IdentifyScreen />);

    expect(screen.getByText(ro.identify.pickTitle)).toBeTruthy();
    expect(screen.queryByText(ro.identify.confirmTitle)).toBeNull();
    expect(screen.getByRole('button', { name: ro.identify.noneOfThem })).toBeTruthy();
  });

  it('shows CandidateList for multiple candidates, opens the chosen product, or goes to /add on "Nu e niciunul"', async () => {
    const response = IdentifyResponse.parse({
      status: 'candidates',
      photoPath: PHOTO_PATH,
      read: { ...ORIGINAL_READ, code: '4840001000014' },
      candidates: [CAND_1, CAND_2],
    });
    if (response.status === 'found') throw new Error('unexpected');
    mockParams.value = identifyPhotoRoute(response).params;

    await render(<IdentifyScreen />);

    expect(screen.getByText(ro.identify.pickTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: `${CAND_2.name}, ${CAND_2.brand}, ${CAND_2.quantity}` }));
    expect(mockReplace).toHaveBeenCalledWith(`/product/${CAND_2.id}`);

    mockReplace.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.noneOfThem }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add',
      params: {
        code: '4840001000014',
        brand: ORIGINAL_READ.brand,
        name: ORIGINAL_READ.name,
        quantity: ORIGINAL_READ.quantity,
        photoPath: PHOTO_PATH,
      },
    });
  });

  it('shows NotFound in photo mode with all next steps and pre-fills /add with extracted details and photoPath', async () => {
    const response = IdentifyResponse.parse({
      status: 'not_found',
      photoPath: PHOTO_PATH,
      read: { brand: 'Bucuria', name: null, quantity: '100 g', code: null },
    });
    if (response.status === 'found') throw new Error('unexpected');
    mockParams.value = identifyPhotoRoute(response).params;

    await render(<IdentifyScreen />);

    expect(screen.getByText(ro.identify.notFoundTitle)).toBeTruthy();
    expect(screen.getByText(ro.identify.notFoundText)).toBeTruthy();
    for (const [index, step] of ro.identify.nextSteps.entries()) {
      expect(screen.getByText(String(index + 1))).toBeTruthy();
      expect(screen.getByText(step)).toBeTruthy();
    }

    await fireEvent.press(screen.getByRole('button', { name: ro.identify.addButton }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add',
      params: {
        brand: 'Bucuria',
        quantity: '100 g',
        photoPath: PHOTO_PATH,
      },
    });
  });

  it('shows NotFound in code mode with ro.identify.codeNotFound, sends no photoPath to /add, and allows rescanning', async () => {
    mockParams.value = identifyCodeRoute('036000291452').params; // UPC-A normalized to EAN-13

    await render(<IdentifyScreen />);

    expect(screen.getByText(ro.identify.notFoundTitle)).toBeTruthy();
    expect(screen.getByText(ro.identify.codeNotFound('0036000291452'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.identify.addButton }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add',
      params: { code: '0036000291452' },
    });
    const sentParams = requireReplacedParams();
    expect('photoPath' in sentParams).toBe(false);
    expect(parseAddParams(sentParams)).toEqual({
      code: '0036000291452',
      brand: null,
      name: null,
      quantity: null,
      photoPath: null,
    });

    await fireEvent.press(screen.getByRole('button', { name: ro.identify.checkCodeAgain }));
    expect(mockReplace).toHaveBeenLastCalledWith('/scan');
  });

  it.each([
    ['missing params', {}],
    ['malformed JSON', { source: 'photo', payload: '{bad-json' }],
    ['schema violation (empty candidates)', { source: 'photo', payload: JSON.stringify({ status: 'candidates', candidates: [], read: ORIGINAL_READ, photoPath: PHOTO_PATH }) }],
    ['candidates with empty photoPath', { source: 'photo', payload: JSON.stringify({ status: 'candidates', candidates: [CAND_1], read: ORIGINAL_READ, photoPath: '' }) }],
    ['candidates with whitespace photoPath', { source: 'photo', payload: JSON.stringify({ status: 'candidates', candidates: [CAND_1, CAND_2], read: ORIGINAL_READ, photoPath: '   ' }) }],
    ['candidates with sentinel "null" photoPath', { source: 'photo', payload: JSON.stringify({ status: 'candidates', candidates: [CAND_1], read: ORIGINAL_READ, photoPath: 'null' }) }],
    ['not_found with empty photoPath', { source: 'photo', payload: JSON.stringify({ status: 'not_found', read: ORIGINAL_READ, photoPath: '' }) }],
    ['not_found with whitespace photoPath', { source: 'photo', payload: JSON.stringify({ status: 'not_found', read: ORIGINAL_READ, photoPath: ' \t ' }) }],
    ['not_found with sentinel "undefined" photoPath', { source: 'photo', payload: JSON.stringify({ status: 'not_found', read: ORIGINAL_READ, photoPath: 'undefined' }) }],
    ['invalid barcode checksum', { source: 'code', code: '4840001000017' }],
  ])('handles %s safely without crashing or inventing product data', async (_case, badParams) => {
    mockParams.value = badParams;
    expect(parseIdentifyParams(badParams)).toEqual({ kind: 'invalid' });

    await render(<IdentifyScreen />);

    expect(screen.getByText(ro.errors.generic)).toBeTruthy();
    expect(screen.queryByText(ro.identify.confirmTitle)).toBeNull();
    expect(screen.queryByText(ro.identify.pickTitle)).toBeNull();
    expect(screen.queryByText(ro.identify.notFoundTitle)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: ro.capture.title }));
    expect(mockReplace).toHaveBeenCalledWith('/capture');
  });

  it('returns to the saved guided add draft when an identify draft is missing after reload', async () => {
    setGuidedAddEnabled(true);
    mockParams.value = { source: 'photo', unknownDraftId: 'reloaded-draft' };

    await render(<IdentifyScreen />);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add',
      params: { unknownDraftId: 'reloaded-draft', retake: 'front' },
    });
  });

  it.each([
    ['generic identify', { source: 'photo', identifyDraftId: 'missing-generic' }, '/capture'],
    ['queued identify', { source: 'photo', identifyDraftId: 'missing-queued', queueId: 'queued-photo' }, '/offline'],
  ])('restarts %s at its safe entry when the response draft is missing', async (_label, params, route) => {
    mockParams.value = params;

    await render(<IdentifyScreen />);

    expect(mockReplace).toHaveBeenCalledWith(route);
  });

  it('clears the cached identify response when the screen blurs or unmounts', async () => {
    const id = 'clear-on-blur';
    const response = { status: 'candidates' as const, read: ORIGINAL_READ, photoPath: PHOTO_PATH, candidates: [CAND_1] };
    setIdentifyDraft(id, response);
    mockParams.value = { ...identifyPhotoRoute(response).params, identifyDraftId: id };

    const view = await render(<IdentifyScreen />);
    expect(getIdentifyDraft(id)).toEqual(response);
    await view.unmount();

    expect(getIdentifyDraft(id)).toBeUndefined();
  });

  it.each(['unmount', 'reject'])('does not override the next destination after %s during confirmation', async mode => {
    mockParams.value = { source: 'photo', queueId: 'pending-confirmation', payload: JSON.stringify({ status: 'candidates', candidates: [CAND_1], read: ORIGINAL_READ, photoPath: PHOTO_PATH }) };
    let finish!: () => void;
    jest.mocked(resolveQueued).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    const view = await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmYes }));
    if (mode === 'unmount') await view.unmount();
    else await fireEvent.press(screen.getByRole('button', { name: ro.identify.confirmNo }));
    const callsBeforeCompletion = mockReplace.mock.calls.length;
    await act(() => finish());
    expect(mockReplace).toHaveBeenCalledTimes(callsBeforeCompletion);
  });

  it('round-trips addProductRoute and parseAddParams cleanly for B7', () => {
    const withPhoto = addProductRoute({
      read: { code: '4840001000014', brand: 'Zorel', name: null, quantity: '400 g' },
      photoPath: PHOTO_PATH,
    });
    expect(parseAddParams(withPhoto.params)).toEqual({
      code: '4840001000014',
      brand: 'Zorel',
      name: null,
      quantity: '400 g',
      photoPath: PHOTO_PATH,
    });
    expect(
      parseAddParams({ code: 'invalid', brand: 'null', name: 'undefined', quantity: '  ', photoPath: '' }),
    ).toEqual({
      code: null,
      brand: null,
      name: null,
      quantity: null,
      photoPath: null,
    });
  });

  it('preserves frontPhotoId, unknownDraftId, and scanned code when "Nu e niciunul" returns to /add', async () => {
    mockParams.value = {
      source: 'photo',
      frontPhotoId: 'kept-front-1',
      unknownDraftId: 'draft-123',
      payload: JSON.stringify({
        status: 'candidates',
        candidates: [CAND_1, CAND_2],
        read: { ...ORIGINAL_READ, code: '4840001000014' },
        photoPath: PHOTO_PATH,
      }),
    };
    await render(<IdentifyScreen />);
    await fireEvent.press(screen.getByRole('button', { name: ro.identify.noneOfThem }));
    const sentParams = requireReplacedParams();
    expect(sentParams).toMatchObject({
      code: '4840001000014',
      photoPath: PHOTO_PATH,
      frontPhotoId: 'kept-front-1',
      unknownDraftId: 'draft-123',
    });
    expect(parseAddParams(sentParams)).toMatchObject({
      code: '4840001000014',
      photoPath: PHOTO_PATH,
      frontPhotoId: 'kept-front-1',
      unknownDraftId: 'draft-123',
    });
  });

  it('uses the real offline/photos module without calling keepPhoto on server photoPath and reaches GuidedAddScreen at the ingredients step for identify not_found and "Nu e niciunul"', async () => {
    expect(GUIDED_ADD_ENABLED).toBe(true);
    setGuidedAddEnabled(null);
    const keptFrontId = 'file:///doc/okbite-queue/front-uuid-1.jpg';

    const notFound = IdentifyResponse.parse({
      status: 'not_found',
      photoPath: PHOTO_PATH,
      read: ORIGINAL_READ,
    });
    if (notFound.status === 'found') throw new Error('unexpected');
    mockParams.value = identifyPhotoRoute(notFound, keptFrontId).params;

    const first = await render(<IdentifyScreen />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: ro.identify.addButton }));
    });
    expect(FileSystem.copyAsync).not.toHaveBeenCalled();
    const notFoundParams = requireReplacedParams();
    expect(notFoundParams).toEqual({
      brand: ORIGINAL_READ.brand,
      name: ORIGINAL_READ.name,
      quantity: ORIGINAL_READ.quantity,
      photoPath: PHOTO_PATH,
      frontPhotoId: keptFrontId,
      flow: 'guided',
    });
    await first.unmount();

    // Server-path case without frontPhotoId: openAdd still must not pass server photoPath to keepPhoto.
    mockReplace.mockClear();
    const candidates = IdentifyResponse.parse({
      status: 'candidates',
      photoPath: PHOTO_PATH,
      read: { ...ORIGINAL_READ, code: '4840001000014' },
      candidates: [CAND_1, CAND_2],
    });
    if (candidates.status === 'found') throw new Error('unexpected');
    mockParams.value = identifyPhotoRoute(candidates).params;

    const second = await render(<IdentifyScreen />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: ro.identify.noneOfThem }));
    });
    expect(FileSystem.copyAsync).not.toHaveBeenCalled();
    const noneParams = requireReplacedParams();
    expect(noneParams).toEqual({
      code: '4840001000014',
      brand: ORIGINAL_READ.brand,
      name: ORIGINAL_READ.name,
      quantity: ORIGINAL_READ.quantity,
      photoPath: PHOTO_PATH,
      flow: 'guided',
    });
    await second.unmount();

    mockParams.value = notFoundParams;
    await render(<AddScreen />);
    await act(async () => {});
    expect(screen.getByText(ro.add.ingredientsTitle)).toBeTruthy();
    expect(screen.getByText(ro.add.stepOf(2, 4))).toBeTruthy();
  });

  it('shows an error StatusPanel instead of a dead button when openAdd fails, and recovers on retry', async () => {
    setGuidedAddEnabled(true);
    const notFound = IdentifyResponse.parse({
      status: 'not_found',
      photoPath: PHOTO_PATH,
      read: ORIGINAL_READ,
    });
    if (notFound.status === 'found') throw new Error('unexpected');
    setIdentifyDraft('retry-draft', notFound);
    mockParams.value = identifyPhotoRoute(notFound, 'file:///doc/okbite-queue/front-uuid-1.jpg', 'retry-draft').params;
    mockReplace
      .mockImplementationOnce(() => {
        throw new Error('navigation failed');
      })
      .mockImplementation(() => {});

    await render(<IdentifyScreen />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: ro.identify.addButton }));
    });

    expect(screen.getByText(ro.errors.generic)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
    });
    expect(mockReplace).toHaveBeenCalledTimes(2);
  });
});

it('opens the guided flow when an unknown barcode has no front photo or draft', () => {
  expect(addProductRoute({ read: { code: '4840001000014', brand: null, name: null, quantity: null }, photoPath: null, flow: 'guided' }))
    .toMatchObject({ pathname: '/add', params: { flow: 'guided', code: '4840001000014' } });
});
