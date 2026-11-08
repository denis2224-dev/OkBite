import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';
import { startLiveScan, useWebLiveScan } from './useWebLiveScan';
import { createZxingReader } from '../capture/zxing.web';



// Mock module loading only; exercise the real reader factory.
jest.mock('../capture/zxing.web', () => ({
  createZxingReader: jest.fn(async () => jest.requireActual<typeof import('../capture/zxingReader.web')>('../capture/zxingReader.web').createZxingReader()),
}));
jest.mock('@zxing/browser', () => ({
  BarcodeFormat: { EAN_13: 7, EAN_8: 6, UPC_A: 14, UPC_E: 15 },
  BrowserMultiFormatReader: jest.fn().mockImplementation(function (this: object) {
    Object.assign(this, { decode: jest.fn(), decodeFromImageUrl: jest.fn(), reader: { reset: jest.fn() } });
  }),
}));
type ZxingReader = {
  decode: jest.Mock<(video: unknown) => { getText(): string; getBarcodeFormat(): number }>;
  decodeFromImageUrl: jest.Mock<(uri: string) => Promise<{ getText(): string; getBarcodeFormat(): number }>>;
  reader: { reset: jest.Mock };
  possibleFormats: number[];
};
const zxing = jest.requireMock<{ BrowserMultiFormatReader: jest.Mock<() => void> }>('@zxing/browser');
const currentReader = () => zxing.BrowserMultiFormatReader.mock.instances.at(-1) as unknown as ZxingReader;

type G = Record<string, unknown>;
const g = globalThis as unknown as G;

// Browser-like detector: detect() rejects anything that is not an image object (e.g. a URL string).
const detect = jest.fn(async (source: unknown): Promise<{ rawValue?: string }[]> => {
  if (typeof source === 'string' || source == null) throw new TypeError('detect: unsupported source');
  return [];
});
function install(getUserMedia: unknown) {
  g.BarcodeDetector = jest.fn(function (_o: unknown) { return { detect }; });
  Object.defineProperty(globalThis.navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
}
const track = () => ({ stop: jest.fn() });
function stream(tracks = [track(), track()]) { return { getTracks: () => tracks, tracks }; }
function fakeVideo() { return { play: jest.fn(async () => undefined), srcObject: null as unknown } as unknown as HTMLVideoElement; }
const tick = () => act(async () => { await jest.advanceTimersByTimeAsync(250); });

describe('ZXing live fallback', () => {
  beforeEach(() => { jest.useFakeTimers(); zxing.BrowserMultiFormatReader.mockClear(); });
  afterEach(() => { jest.useRealTimers(); });

  it('keeps native decoding when available without constructing ZXing', async () => {
    install(jest.fn(async () => stream()));
    const stop = await startLiveScan(fakeVideo(), jest.fn());
    expect(zxing.BrowserMultiFormatReader).not.toHaveBeenCalled();
    stop?.();
  });

  it('scans the existing video, skips NotFound and invalid codes, normalizes UPC, and resets on stop', async () => {
    const s = stream();
    install(jest.fn(async () => s));
    delete g.BarcodeDetector;
    const video = fakeVideo();
    const onCode = jest.fn();
    const stop = await startLiveScan(video, onCode);
    expect(stop).toEqual(expect.any(Function));
    const reader = currentReader();
    expect(currentReader().possibleFormats).toEqual([7, 6, 14, 15]);
    reader.decode.mockImplementationOnce(() => { throw Object.assign(new Error(), { name: 'NotFoundException' }); })
      .mockReturnValueOnce({ getText: () => '4840001000017', getBarcodeFormat: () => 7 })
      .mockReturnValueOnce({ getText: () => '036000291452', getBarcodeFormat: () => 14 });
    await tick();
    await tick();
    expect(onCode).not.toHaveBeenCalled();
    await tick();
    expect(reader.decode).toHaveBeenCalledWith(video);
    expect(onCode).toHaveBeenCalledWith('0036000291452');
    stop?.(); stop?.();
    await tick();
    expect(reader.decode).toHaveBeenCalledTimes(3);
    expect(reader.reader.reset).toHaveBeenCalledTimes(1);
    expect(s.tracks.every(t => t.stop.mock.calls.length === 1)).toBe(true);
    expect(video.srcObject).toBeNull();
  });

  it('goes live without BarcodeDetector and releases reader and camera on unmount', async () => {
    const s = stream();
    install(jest.fn(async () => s));
    delete g.BarcodeDetector;
    const onCode = jest.fn();
    const { result, unmount } = await renderHook(() => useWebLiveScan(onCode));
    expect(result.current.status).toBe('starting');
    await act(async () => { result.current.videoRef(fakeVideo()); });
    expect(result.current.status).toBe('live');
    const reader = currentReader();
    await unmount();
    await tick();
    expect(onCode).not.toHaveBeenCalled();
    expect(reader.reader.reset).toHaveBeenCalledTimes(1);
    expect(s.tracks.every(t => t.stop.mock.calls.length === 1)).toBe(true);
  });
});

describe('cancelled ZXing startup', () => {
  it('does not request the camera when the screen is left while ZXing is loading', async () => {
    const reader = await createZxingReader();
    let loaded!: (reader: Awaited<ReturnType<typeof createZxingReader>>) => void;
    jest.mocked(createZxingReader).mockReturnValueOnce(new Promise(resolve => { loaded = resolve; }));
    const getUserMedia = jest.fn(async () => stream());
    install(getUserMedia); delete g.BarcodeDetector;
    const { result, unmount } = await renderHook(() => useWebLiveScan(jest.fn()));
    await act(async () => { result.current.videoRef(fakeVideo()); });
    await unmount();
    await act(async () => { loaded(reader); });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(currentReader().reader.reset).toHaveBeenCalledTimes(1);
  });

  it('releases camera tracks immediately when unmounted during a pending video.play', async () => {
    const s = stream(); install(jest.fn(async () => s)); delete g.BarcodeDetector;
    const video = fakeVideo(); let playing!: () => void;
    (video.play as unknown as jest.Mock<() => Promise<void>>).mockReturnValueOnce(new Promise(resolve => { playing = resolve; }));
    const { result, unmount } = await renderHook(() => useWebLiveScan(jest.fn()));
    await act(async () => { result.current.videoRef(video); });
    expect(video.srcObject).toBe(s);
    await unmount();
    expect(s.tracks.every(t => t.stop.mock.calls.length === 1)).toBe(true);
    expect(currentReader().reader.reset).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
    await act(async () => { playing(); });
  });
});
