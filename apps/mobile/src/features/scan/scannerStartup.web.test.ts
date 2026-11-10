import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  SCANNER_FORMATS,
  ZXING_READER_WASM_PATH,
  createNativeBarcodeDetector,
  createWasmBarcodeDetector,
  preloadScannerWasm,
  resetScannerWasmForTests,
  scheduleScannerPreload,
} from './scannerStartup.web';

jest.mock('barcode-detector/ponyfill', () => ({
  BarcodeDetector: jest.fn(),
  prepareZXingModule: jest.fn(),
  purgeZXingModule: jest.fn(),
}));

const ponyfillMock = jest.requireMock<{
  BarcodeDetector: jest.Mock<(options?: unknown) => void>;
  prepareZXingModule: jest.Mock<
    (options?: { overrides?: { locateFile?: (path: string, prefix: string) => string }; fireImmediately?: boolean }) => Promise<object>
  >;
  purgeZXingModule: jest.Mock<() => void>;
}>('barcode-detector/ponyfill');

type G = Record<string, unknown>;
const g = globalThis as unknown as G;

describe('scannerStartup (WASM preload and detector initialization)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    ponyfillMock.prepareZXingModule.mockReset();
    ponyfillMock.prepareZXingModule.mockResolvedValue({});
    ponyfillMock.purgeZXingModule.mockReset();
    ponyfillMock.BarcodeDetector.mockReset();
    resetScannerWasmForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete g.BarcodeDetector;
    delete g.requestIdleCallback;
    delete g.cancelIdleCallback;
  });

  it('exposes the agreed same-origin WASM path and formats', () => {
    expect(ZXING_READER_WASM_PATH).toBe('/zxing_reader.wasm');
    expect(SCANNER_FORMATS).toEqual(['ean_13', 'ean_8', 'upc_a']);
  });

  it('passes the same-origin locateFile override to prepareZXingModule', async () => {
    await preloadScannerWasm();
    expect(ponyfillMock.prepareZXingModule).toHaveBeenCalledTimes(1);
    const options = ponyfillMock.prepareZXingModule.mock.calls[0]?.[0];
    expect(options?.fireImmediately).toBe(true);
    expect(options?.overrides?.locateFile?.('zxing_reader.wasm', '/assets/')).toBe('/zxing_reader.wasm');
    expect(options?.overrides?.locateFile?.('other.js', '/assets/')).toBe('/assets/other.js');
  });

  it('shares a single in-flight promise across concurrent preload calls', async () => {
    const [p1, p2] = await Promise.all([preloadScannerWasm(), preloadScannerWasm()]);
    expect(p1).toBeUndefined();
    expect(p2).toBeUndefined();
    expect(ponyfillMock.prepareZXingModule).toHaveBeenCalledTimes(1);
  });

  it('purges the module and clears the cache promise on preload failure, allowing retry', async () => {
    ponyfillMock.prepareZXingModule.mockRejectedValueOnce(new Error('Network error'));
    await expect(preloadScannerWasm()).rejects.toThrow('Network error');
    expect(ponyfillMock.purgeZXingModule).toHaveBeenCalledTimes(1);

    ponyfillMock.prepareZXingModule.mockResolvedValueOnce({});
    await expect(preloadScannerWasm()).resolves.toBeUndefined();
    expect(ponyfillMock.prepareZXingModule).toHaveBeenCalledTimes(2);
  });

  it('schedules idle preloading via requestIdleCallback and skips WASM when native is supported', async () => {
    g.BarcodeDetector = Object.assign(
      jest.fn(function () { return { detect: jest.fn() }; }),
      { getSupportedFormats: jest.fn(async () => ['ean_13', 'ean_8', 'upc_a']) },
    );
    let idleCb: (() => void) | undefined;
    g.requestIdleCallback = jest.fn((cb: () => void) => {
      idleCb = cb;
      return 101;
    });
    g.cancelIdleCallback = jest.fn();

    const cancel = scheduleScannerPreload();
    expect(g.requestIdleCallback).toHaveBeenCalledTimes(1);
    idleCb?.();
    await Promise.resolve();
    expect(ponyfillMock.prepareZXingModule).not.toHaveBeenCalled();

    cancel();
    expect(g.cancelIdleCallback).toHaveBeenCalledWith(101);
  });

  it('falls back to 800ms timer when requestIdleCallback is absent and preloads WASM when native is absent', async () => {
    delete g.BarcodeDetector;
    delete g.requestIdleCallback;

    const cancel = scheduleScannerPreload();
    expect(ponyfillMock.prepareZXingModule).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(799);
    expect(ponyfillMock.prepareZXingModule).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(ponyfillMock.prepareZXingModule).toHaveBeenCalledTimes(1);

    cancel();
  });

  it('provides a no-op safe cancel function on native platforms', () => {
    const { scheduleScannerPreload: scheduleNativePreload } =
      jest.requireActual<typeof import('./scannerStartup')>('./scannerStartup');
    const cancel = scheduleNativePreload();
    expect(typeof cancel).toBe('function');
    expect(() => cancel()).not.toThrow();
  });

  it('creates native detector when supported, filtering formats', async () => {
    const nativeDetect = jest.fn();
    g.BarcodeDetector = Object.assign(
      jest.fn(function (opts: unknown) { return { detect: nativeDetect, opts }; }),
      { getSupportedFormats: jest.fn(async () => ['ean_13', 'qr_code']) },
    );
    const detector = await createNativeBarcodeDetector();
    expect(detector).toBeTruthy();
    expect(g.BarcodeDetector).toHaveBeenCalledWith({ formats: ['ean_13'] });
  });

  it('creates WASM ponyfill detector after preloading', async () => {
    const ponyfillDetect = jest.fn();
    ponyfillMock.BarcodeDetector.mockImplementation(function (this: object, opts: unknown) {
      Object.assign(this, { detect: ponyfillDetect, opts });
    });
    const detector = await createWasmBarcodeDetector();
    expect(detector).toBeTruthy();
    expect(ponyfillMock.prepareZXingModule).toHaveBeenCalledTimes(1);
    expect(ponyfillMock.BarcodeDetector).toHaveBeenCalledWith({ formats: ['ean_13', 'ean_8', 'upc_a'] });
  });
});

