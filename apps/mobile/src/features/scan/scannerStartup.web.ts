import {
  BarcodeDetector as PonyfillBarcodeDetector,
  prepareZXingModule,
  purgeZXingModule,
} from 'barcode-detector/ponyfill';

export const SCANNER_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;
export const ZXING_READER_WASM_PATH = '/zxing_reader.wasm';

const IDLE_FALLBACK_MS = 800;

export type BarcodeHit = { rawValue?: string; format?: string };
export type BarcodeDetectorInstance = {
  detect: (source: HTMLCanvasElement) => Promise<BarcodeHit[]>;
};

type DetectorCtor = {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

type IdleGlobals = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

let wasmInitPromise: Promise<void> | null = null;

export async function createNativeBarcodeDetector(): Promise<BarcodeDetectorInstance | null> {
  const Ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const supported =
      typeof Ctor.getSupportedFormats === 'function' ? await Ctor.getSupportedFormats() : null;
    // Select WASM when the native implementation can't read every supported retail format.
    if (supported && !SCANNER_FORMATS.every((format) => supported.includes(format))) return null;
    return new Ctor({ formats: [...SCANNER_FORMATS] });
  } catch {
    return null;
  }
}

export function preloadScannerWasm(): Promise<void> {
  if (wasmInitPromise) return wasmInitPromise;
  wasmInitPromise = (async () => {
    try {
      await prepareZXingModule({
        overrides: {
          locateFile: (path: string, prefix: string) =>
            path.endsWith('.wasm') ? ZXING_READER_WASM_PATH : `${prefix}${path}`,
        },
        fireImmediately: true,
      });
    } catch (error) {
      purgeZXingModule();
      throw error;
    }
  })().catch((error: unknown) => {
    wasmInitPromise = null;
    throw error;
  });
  return wasmInitPromise;
}

export async function createWasmBarcodeDetector(): Promise<BarcodeDetectorInstance | null> {
  try {
    await preloadScannerWasm();
    return new PonyfillBarcodeDetector({ formats: [...SCANNER_FORMATS] });
  } catch {
    return null;
  }
}

async function preloadWhenNeeded(): Promise<void> {
  const nativeDetector = await createNativeBarcodeDetector();
  if (nativeDetector) return;
  await preloadScannerWasm();
}

export function scheduleScannerPreload(): () => void {
  const idleGlobals = globalThis as unknown as IdleGlobals;
  if (typeof idleGlobals.requestIdleCallback === 'function') {
    const handle = idleGlobals.requestIdleCallback(() => {
      void preloadWhenNeeded().catch(() => undefined);
    });
    return () => {
      idleGlobals.cancelIdleCallback?.(handle);
    };
  }
  const timer = setTimeout(() => {
    void preloadWhenNeeded().catch(() => undefined);
  }, IDLE_FALLBACK_MS);
  return () => {
    clearTimeout(timer);
  };
}

export function resetScannerWasmForTests(): void {
  wasmInitPromise = null;
}
