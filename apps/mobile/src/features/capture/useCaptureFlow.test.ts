import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { ImageManipulator } from 'expo-image-manipulator';
import { scanFromURLAsync } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LookupResponse, IdentifyResponse } from '@okbite/shared';
import { api } from '../../lib/api';
import { setGuidedAddEnabled } from '../identify/routes';
import { enqueue } from '../offline/queue';
import { useCaptureFlow } from './useCaptureFlow';
import { CODE, PRODUCT_ID, completed, identifyCandidates, identifyFound, identifyNotFound, lookupFound, lookupNotFound, pendingOutcome } from './__fixtures__/responses';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }), useFocusEffect: (callback: () => void | (() => void)) => jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]) }));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: jest.fn() } }));
jest.mock('expo-camera', () => ({ scanFromURLAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'front-capture-uuid' }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  EncodingType: { Base64: 'base64' },
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async ({ from }: { from: string; to: string }) => {
    if (!from.startsWith('file://')) {
      throw new Error(`Refusing non-local URI in keepPhoto: ${from}`);
    }
  }),
  deleteAsync: jest.fn(async () => {}),
}));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identifyOutcome: jest.fn() } }));
jest.mock('../offline/queue', () => ({ enqueue: jest.fn() }));

type AsyncMock = jest.Mock<(...a: unknown[]) => Promise<unknown>>;
const scan = scanFromURLAsync as unknown as AsyncMock;
const pick = launchImageLibraryAsync as unknown as AsyncMock;
const lookup = api.lookup as unknown as AsyncMock;
const identifyOutcome = api.identifyOutcome as unknown as AsyncMock;
const offline = Object.assign(new Error('offline'), { code: 'offline' });
const photo = { takePictureAsync: jest.fn(async () => ({ uri: 'file:///shot.jpg' })) };

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((r, rej) => { resolve = r; reject = rej; });
  return { promise, resolve, reject };
}

describe('fixtures', () => {
  it('are accepted by the real C1 schemas', () => {
    expect(() => LookupResponse.parse(lookupFound)).not.toThrow();
    expect(() => LookupResponse.parse(lookupNotFound)).not.toThrow();
    for (const r of [identifyFound, identifyCandidates, identifyNotFound]) expect(() => IdentifyResponse.parse(r)).not.toThrow();
  });
});

describe('useCaptureFlow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setGuidedAddEnabled(false);
    jest.mocked(FileSystem.copyAsync).mockImplementation(async ({ from }: { from: string; to: string }) => {
      if (!from.startsWith('file://')) {
        throw new Error(`Refusing non-local URI in keepPhoto: ${from}`);
      }
    });
    jest.mocked(FileSystem.makeDirectoryAsync).mockResolvedValue(undefined);
    jest.mocked(FileSystem.deleteAsync).mockResolvedValue(undefined);
    jest.mocked(enqueue).mockRejectedValue(new Error('storage unavailable'));
    photo.takePictureAsync.mockResolvedValue({ uri: 'file:///shot.jpg' });
    const image = { width: 1200, height: 900, saveAsync: async () => ({ uri: 'file:///c.jpg', base64: Buffer.from('jpeg-bytes').toString('base64') }) };
    (ImageManipulator.manipulate as unknown as jest.Mock).mockReturnValue({ resize: jest.fn(), renderAsync: async () => image });
    scan.mockResolvedValue([]);
  });
  const gallery = (uri = 'file:///g.jpg') => pick.mockResolvedValue({ canceled: false, assets: [{ uri }] });
  async function capture() {
    const hook = await renderHook(() => useCaptureFlow());
    await act(async () => { await hook.result.current.takePhoto(photo); });
    return hook;
  }

  it('opens the product when the barcode in the photo is found', async () => {
    scan.mockResolvedValue([{ data: CODE }]);
    lookup.mockResolvedValue(lookupFound);
    await capture();
    expect(lookup).toHaveBeenCalledWith({ code: CODE });
    expect(identifyOutcome).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('still sends the photo to identify when the barcode lookup is not_found', async () => {
    scan.mockResolvedValue([{ data: CODE }]);
    lookup.mockResolvedValue(lookupNotFound);
    identifyOutcome.mockResolvedValue(completed(identifyNotFound));
    await capture();
    expect(identifyOutcome).toHaveBeenCalledWith(Buffer.from('jpeg-bytes').toString('base64'));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(identifyNotFound) } });
  });

  it('treats an unreadable barcode as "ask identify", never as product not found', async () => {
    identifyOutcome.mockResolvedValue(completed(identifyFound));
    await capture();
    expect(lookup).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('sends candidates to the identify screen with the full response', async () => {
    identifyOutcome.mockResolvedValue(completed(identifyCandidates));
    await capture();
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(identifyCandidates) } });
  });

  it('survives a detector failure and carries on to identify', async () => {
    scan.mockRejectedValue(new Error('detector crashed'));
    identifyOutcome.mockResolvedValue(completed(identifyFound));
    await capture();
    expect(identifyOutcome).toHaveBeenCalledTimes(1);
  });

  it('creates one request when the shutter is tapped twice', async () => {
    const shot = deferred<{ uri: string }>();
    photo.takePictureAsync.mockReturnValue(shot.promise);
    identifyOutcome.mockResolvedValue(completed(identifyFound));
    const { result } = await renderHook(() => useCaptureFlow());
    await act(async () => {
      const first = result.current.takePhoto(photo);
      const second = result.current.takePhoto(photo);
      shot.resolve({ uri: 'file:///shot.jpg' });
      await Promise.all([first, second]);
    });
    expect(photo.takePictureAsync).toHaveBeenCalledTimes(1);
    expect(identifyOutcome).toHaveBeenCalledTimes(1);
  });

  it('ignores a gallery pick while a photo is being processed', async () => {
    const pending = deferred<unknown>();
    identifyOutcome.mockReturnValue(pending.promise);
    gallery();
    const { result } = await renderHook(() => useCaptureFlow());
    await act(async () => {
      const first = result.current.pickFromGallery();
      const second = result.current.pickFromGallery();
      pending.resolve(completed(identifyFound));
      await Promise.all([first, second]);
    });
    expect(pick).toHaveBeenCalledTimes(1);
    expect(identifyOutcome).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when a photo match arrives after leaving capture', async () => {
    const pending = deferred<unknown>();
    identifyOutcome.mockReturnValue(pending.promise);
    const { result, unmount } = await renderHook(() => useCaptureFlow());
    let running!: Promise<void>;
    await act(async () => { running = result.current.takePhoto(photo); });
    expect(identifyOutcome).toHaveBeenCalledTimes(1);
    await unmount();
    await act(async () => { pending.resolve(completed(identifyFound)); await running; });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('reports working while the request runs', async () => {
    const pending = deferred<unknown>();
    identifyOutcome.mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useCaptureFlow());
    let run!: Promise<void>;
    await act(async () => { run = result.current.takePhoto(photo); });
    expect(result.current.state).toEqual({ status: 'working' });
    await act(async () => { pending.resolve(completed(identifyFound)); await run; });
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('goes offline when identify has no network, then retries the same photo', async () => {
    identifyOutcome.mockRejectedValueOnce(offline).mockResolvedValue(completed(identifyFound));
    const { result } = await capture();
    expect(result.current.state).toEqual({ status: 'offline' });
    expect(result.current.canRetry).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => { await result.current.retry(); });
    expect(photo.takePictureAsync).toHaveBeenCalledTimes(1);
    expect(identifyOutcome).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('goes offline when the barcode lookup has no network', async () => {
    scan.mockResolvedValue([{ data: CODE }]);
    lookup.mockRejectedValue(offline);
    expect((await capture()).result.current.state).toEqual({ status: 'offline' });
  });

  it.each(['identify', 'lookup'])('durably queues the compressed photo before leaving an offline %s', async (boundary) => {
    const saved = deferred<void>();
    jest.mocked(enqueue).mockReturnValue(saved.promise);
    if (boundary === 'lookup') {
      scan.mockResolvedValue([{ data: CODE }]);
      lookup.mockRejectedValue(offline);
    } else identifyOutcome.mockRejectedValue(offline);
    const { result } = await renderHook(() => useCaptureFlow());
    let pending!: Promise<void>;
    await act(async () => { pending = result.current.takePhoto(photo); });
    expect(enqueue).toHaveBeenCalledWith({ kind: 'photo', uri: 'file:///c.jpg' });
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => { saved.resolve(); await pending; });
    expect(mockReplace).toHaveBeenCalledWith('/offline');
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(result.current.canRetry).toBe(false);
  });

  it.each([
    ['server error', () => identifyOutcome.mockRejectedValue(Object.assign(new Error('x'), { code: 'upstream_failed' })), 'upstream_failed'],
    ['camera failure', () => photo.takePictureAsync.mockRejectedValue(new Error('camera gone')), undefined],
  ])('shows an error on %s and recovers for the next capture', async (_name, arrange, code) => {
    arrange();
    const { result } = await capture();
    expect(result.current.state).toEqual({ status: 'error', code });
    photo.takePictureAsync.mockResolvedValue({ uri: 'file:///again.jpg' });
    identifyOutcome.mockResolvedValue(completed(identifyFound));
    await act(async () => { await result.current.takePhoto(photo); });
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('returns to idle when the gallery is cancelled, and reports a gallery failure', async () => {
    pick.mockResolvedValueOnce({ canceled: true, assets: null });
    const { result } = await renderHook(() => useCaptureFlow());
    await act(async () => { await result.current.pickFromGallery(); });
    expect(result.current.state).toEqual({ status: 'idle' });
    expect(identifyOutcome).not.toHaveBeenCalled();
    pick.mockRejectedValueOnce(new Error('picker crashed'));
    await act(async () => { await result.current.pickFromGallery(); });
    expect(result.current.state).toEqual({ status: 'error', code: undefined });
  });

  it('does nothing when the camera is not mounted yet', async () => {
    const { result } = await renderHook(() => useCaptureFlow());
    await act(async () => { await result.current.takePhoto(null); });
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('shows an error instead of crashing when the photo is too big to compress', async () => {
    const huge = Buffer.alloc(1_600_000).toString('base64');
    const image = { width: 1600, height: 1200, saveAsync: async () => ({ uri: 'file:///h.jpg', base64: huge }) };
    (ImageManipulator.manipulate as unknown as jest.Mock).mockReturnValue({ resize: jest.fn(), renderAsync: async () => image });
    expect((await capture()).result.current.state.status).toBe('error');
    expect(identifyOutcome).not.toHaveBeenCalled();
  });

  it('recompresses a 1.5 MB JPEG so identify JSON fits the 2 MB HTTP body limit', async () => {
    const saveAsync = jest.fn<() => Promise<{ uri: string; base64: string }>>()
      .mockResolvedValueOnce({ uri: 'file:///large.jpg', base64: Buffer.alloc(1_500_000).toString('base64') })
      .mockResolvedValueOnce({ uri: 'file:///smaller.jpg', base64: Buffer.alloc(1_440_000).toString('base64') });
    (ImageManipulator.manipulate as unknown as jest.Mock).mockReturnValue({
      renderAsync: async () => ({ width: 1600, height: 1200, saveAsync }),
    });
    identifyOutcome.mockResolvedValue(completed(identifyFound));
    await capture();
    const sent = identifyOutcome.mock.calls[0]?.[0];
    expect(typeof sent).toBe('string');
    expect(Buffer.byteLength(JSON.stringify({ photo: sent }), 'utf8')).toBeLessThanOrEqual(2_000_000);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it.each([null, undefined])('shows a recoverable error when an IO boundary rejects with %s', async (reason) => {
    identifyOutcome.mockRejectedValue(reason);
    const { result } = await capture();
    expect(result.current.state).toEqual({ status: 'error', code: undefined });
    expect(result.current.canRetry).toBe(true);
    identifyOutcome.mockResolvedValue(completed(identifyFound));
    await act(async () => { await result.current.retry(); });
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('keeps the compressed front photo locally before upload and passes frontPhotoId to /identify when guided add is enabled', async () => {
    setGuidedAddEnabled(true);
    const callOrder: string[] = [];
    jest.mocked(FileSystem.copyAsync).mockImplementation(async ({ from }: { from: string; to: string }) => {
      if (!from.startsWith('file://')) {
        throw new Error(`Refusing non-local URI in keepPhoto: ${from}`);
      }
      callOrder.push(`keepPhoto:${from}`);
    });
    identifyOutcome.mockImplementation(async () => {
      callOrder.push('identify');
      return completed(identifyNotFound);
    });

    await capture();

    expect(callOrder).toEqual(['keepPhoto:file:///c.jpg', 'identify']);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/identify',
      params: {
        source: 'photo',
        payload: JSON.stringify(identifyNotFound),
        frontPhotoId: 'file:///doc/okbite-queue/front-capture-uuid.jpg',
      },
    });
  });

  it('waits on the same completion promise after >55 s, blocks duplicate requests, and navigates once on late resolution', async () => {
    const delayed = deferred<typeof identifyFound>();
    identifyOutcome.mockResolvedValueOnce(pendingOutcome(delayed.promise));
    const { result } = await renderHook(() => useCaptureFlow());
    let run!: Promise<void>;
    await act(async () => { run = result.current.takePhoto(photo); });
    expect(result.current.state).toEqual({ status: 'pending' });
    expect(result.current.canRetry).toBe(false);
    await act(async () => {
      await result.current.takePhoto(photo);
      await result.current.pickFromGallery();
      await result.current.retry();
    });
    expect(identifyOutcome).toHaveBeenCalledTimes(1);
    await act(async () => { delayed.resolve(identifyFound); await run; });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('cleans up stored front photo and skips navigation if unmounted while analysis is pending', async () => {
    setGuidedAddEnabled(true);
    const delayed = deferred<typeof identifyFound>();
    identifyOutcome.mockResolvedValueOnce(pendingOutcome(delayed.promise));
    const { result, unmount } = await renderHook(() => useCaptureFlow());
    let run!: Promise<void>;
    await act(async () => { run = result.current.takePhoto(photo); });
    expect(result.current.state).toEqual({ status: 'pending' });
    await unmount();
    await act(async () => { delayed.resolve(identifyFound); await run; });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///doc/okbite-queue/front-capture-uuid.jpg', { idempotent: true });
  });

  it('re-enables retry after a late rejection on a pending analysis', async () => {
    const delayed = deferred<typeof identifyFound>();
    identifyOutcome
      .mockResolvedValueOnce(pendingOutcome(delayed.promise))
      .mockResolvedValueOnce(completed(identifyFound));
    const { result } = await renderHook(() => useCaptureFlow());
    let run!: Promise<void>;
    await act(async () => { run = result.current.takePhoto(photo); });
    expect(result.current.canRetry).toBe(false);
    await act(async () => {
      delayed.reject(Object.assign(new Error('upstream'), { code: 'upstream_failed' }));
      await run;
    });
    expect(result.current.state).toEqual({ status: 'error', code: 'upstream_failed', afterPending: true });
    expect(result.current.canRetry).toBe(true);
    await act(async () => { await result.current.retry(); });
    expect(identifyOutcome).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });
});
