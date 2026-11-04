import { normalizeCode } from '@okbite/shared';

type DetectorCtor = new (opts?: { formats?: string[] }) => { detect(source: unknown): Promise<{ rawValue?: string }[]> };

export async function findBarcode(uri: string): Promise<string | null> {
  const Ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const detector = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a'] });
    const source = typeof createImageBitmap === 'function' && typeof fetch === 'function' && !uri.startsWith('data:')
      ? await createImageBitmap(await (await fetch(uri)).blob())
      : uri;
    for (const hit of (await detector.detect(source)) ?? []) {
      const code = normalizeCode(hit.rawValue ?? '');
      if (code) return code;
    }
    return null;
  } catch {
    return null;
  }
}
