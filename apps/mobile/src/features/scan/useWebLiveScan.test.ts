import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { api } from '../../lib/api';
import { useScanLookup } from './useScanLookup';
import { startLiveScan, useWebLiveScan } from './useWebLiveScan';

jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void | (() => void)) => jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]), useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));

type G = Record<string, unknown>;
const g = globalThis as unknown as G;

// Browser-like detector: detect() rejects anything that is not an image object (e.g. a URL string).
const detect = jest.fn(async (source: unknown): Promise<{ rawValue?: string }[]> => {
  if (typeof source === 'string' || source == null) throw new TypeError('detect: unsupported source');
  return nextHits.shift() ?? [];
});
let nextHits: { rawValue?: string }[][] = [];
function install(getUserMedia: unknown) {
  g.BarcodeDetector = jest.fn(function (_o: unknown) { return { detect }; });
  Object.defineProperty(globalThis.navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
}
const track = () => ({ stop: jest.fn() });
function stream(tracks = [track(), track()]) { return { getTracks: () => tracks, tracks }; }
function fakeVideo() { return { play: jest.fn(async () => undefined), srcObject: null as unknown } as unknown as HTMLVideoElement; }
const tick = () => act(async () => { await jest.advanceTimersByTimeAsync(250); });

describe('startLiveScan', () => {
  const saved = { BarcodeDetector: g.BarcodeDetector };
  beforeEach(() => { jest.useFakeTimers(); detect.mockClear(); nextHits = []; });
  afterEach(() => { jest.useRealTimers(); Object.assign(g, saved); });

  it('streams the camera into the video and reports a valid barcode read from the video element', async () => {
    const s = stream();
    install(jest.fn(async () => s));
    const video = fakeVideo();
    const onCode = jest.fn();
    nextHits = [[{ rawValue: '4840001000017' }], [{ rawValue: '036000291452' }]];
    const stop = await startLiveScan(video, onCode);
    expect(video.srcObject).toBe(s);
    expect(video.play).toHaveBeenCalled();
    await tick();
    expect(onCode).not.toHaveBeenCalled();
    await tick();
    expect(detect).toHaveBeenCalledWith(video);
    expect(onCode).toHaveBeenCalledWith('0036000291452');
    stop?.();
  });

  it('asks for the rear camera without audio', async () => {
    const getUserMedia = jest.fn(async (_constraints: unknown) => stream());
    install(getUserMedia);
    (await startLiveScan(fakeVideo(), jest.fn()))?.();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });
  });

  it('stops every track, detaches the stream and stops reading when stopped', async () => {
    const s = stream();
    install(jest.fn(async () => s));
    const video = fakeVideo();
    const stop = await startLiveScan(video, jest.fn());
    stop?.();
    expect(s.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
    expect(video.srcObject).toBeNull();
    detect.mockClear();
    await tick();
    expect(detect).not.toHaveBeenCalled();
  });

  it('does not overlap reads while a detection is still running', async () => {
    install(jest.fn(async () => stream()));
    let finish!: (v: { rawValue?: string }[]) => void;
    detect.mockReturnValueOnce(new Promise((r) => { finish = r; }));
    const stop = await startLiveScan(fakeVideo(), jest.fn());
    await tick();
    await tick();
    await tick();
    expect(detect).toHaveBeenCalledTimes(1);
    finish([]);
    stop?.();
  });

  it('suppresses an in-flight detection that resolves after stop() and makes stop() idempotent', async () => {
    const s = stream();
    install(jest.fn(async () => s));
    let finish!: (v: { rawValue?: string }[]) => void;
    detect.mockReturnValueOnce(new Promise((r) => { finish = r; }));
    const onCode = jest.fn();
    const stop = await startLiveScan(fakeVideo(), onCode);
    await tick();
    expect(detect).toHaveBeenCalledTimes(1);
    stop?.();
    stop?.();
    await act(async () => { finish([{ rawValue: '4840001000014' }]); });
    await tick();
    expect(onCode).not.toHaveBeenCalled();
    expect(s.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it('rejects when the camera is refused, without leaving anything running', async () => {
    install(jest.fn(async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); }));
    await expect(startLiveScan(fakeVideo(), jest.fn())).rejects.toThrow('denied');
    await tick();
    expect(detect).not.toHaveBeenCalled();
  });

  it('releases the tracks when the video cannot start playing', async () => {
    const s = stream();
    install(jest.fn(async () => s));
    const video = fakeVideo();
    (video.play as unknown as jest.Mock<() => Promise<void>>).mockRejectedValue(new Error('autoplay blocked'));
    await expect(startLiveScan(video, jest.fn())).rejects.toThrow('autoplay blocked');
    expect(s.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
  });

  it('resolves null and never opens the camera without BarcodeDetector', async () => {
    const getUserMedia = jest.fn(async () => stream());
    install(getUserMedia);
    delete g.BarcodeDetector;
    await expect(startLiveScan(fakeVideo(), jest.fn())).resolves.toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe('useWebLiveScan', () => {
  const saved = { BarcodeDetector: g.BarcodeDetector };
  beforeEach(() => { detect.mockClear(); nextHits = []; });
  afterEach(() => { Object.assign(g, saved); });

  it('is unsupported, and opens no camera, when the browser lacks BarcodeDetector', async () => {
    const getUserMedia = jest.fn();
    install(getUserMedia);
    delete g.BarcodeDetector;
    const { result } = await renderHook(() => useWebLiveScan(jest.fn()));
    await act(async () => { result.current.videoRef(fakeVideo()); });
    expect(result.current.status).toBe('unsupported');
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('goes live once the video is attached and releases the camera on unmount', async () => {
    const s = stream();
    install(jest.fn(async () => s));
    const { result, unmount } = await renderHook(() => useWebLiveScan(jest.fn()));
    expect(result.current.status).toBe('starting');
    await act(async () => { result.current.videoRef(fakeVideo()); });
    expect(result.current.status).toBe('live');
    await unmount();
    expect(s.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
  });

  it('does not deliver a barcode or trigger a lookup when a pending frame detection resolves after unmount', async () => {
    jest.useFakeTimers();
    try {
      const s = stream();
      install(jest.fn(async () => s));
      let finish!: (v: { rawValue?: string }[]) => void;
      detect.mockReturnValueOnce(new Promise((r) => { finish = r; }));
      const lookup = api.lookup as unknown as jest.Mock;
      lookup.mockClear();
      const { result: scan } = await renderHook(() => useScanLookup());
      const onCode = jest.fn((code: string) => { void scan.current.onCameraCode(code); });
      const { result, unmount } = await renderHook(() => useWebLiveScan(onCode));
      await act(async () => { result.current.videoRef(fakeVideo()); });
      await tick();
      expect(detect).toHaveBeenCalledTimes(1);
      await unmount();
      await act(async () => { finish([{ rawValue: '4840001000014' }]); });
      await tick();
      expect(onCode).not.toHaveBeenCalled();
      expect(lookup).not.toHaveBeenCalled();
      expect(s.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
      expect(detect).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('releases a camera that opens after the screen was already left', async () => {
    const s = stream();
    let open!: (v: unknown) => void;
    install(jest.fn(() => new Promise((r) => { open = r; })));
    const { result, unmount } = await renderHook(() => useWebLiveScan(jest.fn()));
    await act(async () => { result.current.videoRef(fakeVideo()); });
    await unmount();
    await act(async () => { open(s); });
    expect(s.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true);
  });

  it('reports unavailable when the camera is refused and starts again on retry', async () => {
    const s = stream();
    const getUserMedia = jest.fn<() => Promise<unknown>>().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(s);
    install(getUserMedia);
    const { result } = await renderHook(() => useWebLiveScan(jest.fn()));
    await act(async () => { result.current.videoRef(fakeVideo()); });
    expect(result.current.status).toBe('unavailable');
    await act(async () => { result.current.retry(); });
    expect(result.current.status).toBe('live');
  });
});
