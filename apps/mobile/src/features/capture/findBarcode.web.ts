import { normalizeCode } from '@okbite/shared';

type Detector = { detect(source: ImageBitmapSource): Promise<{ rawValue?: string }[]> };
type DetectorClass = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

const FORMATS = ['ean_13', 'ean_8', 'upc_a'];

/** A BarcodeDetector limited to the formats this browser supports, or null when the API is missing. */
export async function createDetector(): Promise<Detector | null> {
  const Detector = (globalThis as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  if (!Detector) return null;
  try {
    const supported = await Detector.getSupportedFormats?.();
    const formats = supported ? FORMATS.filter((f) => supported.includes(f)) : FORMATS;
    return formats.length ? new Detector({ formats }) : null;
  } catch {
    return null;
  }
}

export async function firstValidCode(detector: Detector, source: ImageBitmapSource): Promise<string | null> {
  for (const hit of await detector.detect(source)) {
    const code = normalizeCode(hit.rawValue ?? '');
    if (code) return code;
  }
  return null;
}

export async function findBarcode(uri: string): Promise<string | null> {
  const detector = await createDetector();
  if (!detector || typeof createImageBitmap !== 'function') return null;
  let bitmap: ImageBitmap | undefined;
  try {
    // detect() takes an image object, not a URL; fetch() reads blob: and data: URLs alike.
    bitmap = await createImageBitmap(await (await fetch(uri)).blob());
    return await firstValidCode(detector, bitmap);
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}
