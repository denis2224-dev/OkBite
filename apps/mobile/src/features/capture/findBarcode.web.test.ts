import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { findBarcode } from './findBarcode.web';

type G = Record<string, unknown>;
const g = globalThis as unknown as G;

// Mirrors the browser: BarcodeDetector.detect() accepts image objects, never URL strings.
function installDetector(hits: { rawValue?: string }[] | Error, supported?: string[]) {
  const detect = jest.fn(async (source: unknown) => {
    if (typeof source === 'string' || source == null) throw new TypeError('detect: unsupported source');
    if (hits instanceof Error) throw hits;
    return hits;
  });
  const Ctor = jest.fn(function (_options: unknown) { return { detect }; });
  Object.assign(Ctor, { getSupportedFormats: supported ? async () => supported : undefined });
  g.BarcodeDetector = Ctor;
  return { detect, Ctor };
}

describe('findBarcode (web)', () => {
  const bitmap = { close: jest.fn() };
  const blob = { type: 'image/jpeg' };
  let fetchMock: jest.Mock<(...a: unknown[]) => Promise<unknown>>;
  const saved = { fetch: g.fetch, createImageBitmap: g.createImageBitmap, BarcodeDetector: g.BarcodeDetector };

  beforeEach(() => {
    bitmap.close.mockReset();
    fetchMock = jest.fn(async () => ({ blob: async () => blob }));
    g.fetch = fetchMock;
    g.createImageBitmap = jest.fn(async () => bitmap);
    delete g.BarcodeDetector;
  });
  afterEach(() => { Object.assign(g, saved); });

  it('returns null without touching the image when BarcodeDetector is absent', async () => {
    await expect(findBarcode('blob:http://localhost/1')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['blob:http://localhost/1', 'data:image/jpeg;base64,/9j/AA=='])('turns %s into an ImageBitmap before detect()', async (uri) => {
    const { detect, Ctor } = installDetector([{ rawValue: '036000291452' }]);
    await expect(findBarcode(uri)).resolves.toBe('0036000291452');
    expect(fetchMock).toHaveBeenCalledWith(uri);
    expect(g.createImageBitmap).toHaveBeenCalledWith(blob);
    expect(detect).toHaveBeenCalledWith(bitmap);
    expect(Ctor).toHaveBeenCalledWith({ formats: ['ean_13', 'ean_8', 'upc_a'] });
  });

  it('only asks for formats the browser supports', async () => {
    const { Ctor } = installDetector([], ['ean_13', 'qr_code']);
    await findBarcode('blob:http://localhost/1');
    expect(Ctor).toHaveBeenCalledWith({ formats: ['ean_13'] });
  });

  it('releases the bitmap after a hit, a miss and a detector failure', async () => {
    installDetector([{ rawValue: '4840001000014' }]);
    await findBarcode('blob:http://localhost/1');
    installDetector([]);
    await findBarcode('blob:http://localhost/2');
    installDetector(new Error('boom'));
    await expect(findBarcode('blob:http://localhost/3')).resolves.toBeNull();
    expect(bitmap.close).toHaveBeenCalledTimes(3);
  });

  it('returns null when the image cannot be fetched, decoded, or has no valid code', async () => {
    installDetector([{ rawValue: '4840001000017' }]);
    await expect(findBarcode('blob:http://localhost/1')).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(findBarcode('blob:http://localhost/2')).resolves.toBeNull();
    (g.createImageBitmap as jest.Mock<(...a: unknown[]) => Promise<unknown>>).mockRejectedValueOnce(new Error('decode'));
    await expect(findBarcode('blob:http://localhost/3')).resolves.toBeNull();
  });

  it('returns null when createImageBitmap is unavailable', async () => {
    installDetector([{ rawValue: '4840001000014' }]);
    delete g.createImageBitmap;
    await expect(findBarcode('blob:http://localhost/1')).resolves.toBeNull();
  });
});
