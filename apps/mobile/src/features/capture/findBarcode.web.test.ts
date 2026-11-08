import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { findBarcode } from './findBarcode.web';


// Mock module loading only; exercise the real reader factory.
jest.mock('./zxing.web', () => ({
  createZxingReader: async () => jest.requireActual<typeof import('./zxingReader.web')>('./zxingReader.web').createZxingReader(),
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
    zxing.BrowserMultiFormatReader.mockClear();
    fetchMock = jest.fn(async () => ({ blob: async () => blob }));
    g.fetch = fetchMock;
    g.createImageBitmap = jest.fn(async () => bitmap);
    delete g.BarcodeDetector;
  });
  afterEach(() => { Object.assign(g, saved); });

  it('returns null when neither decoder finds a barcode', async () => {
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

describe('ZXing photo fallback', () => {
  beforeEach(() => { delete g.BarcodeDetector; zxing.BrowserMultiFormatReader.mockClear(); });
  afterEach(() => { Object.assign(g, { BarcodeDetector: undefined }); });

  it.each(['blob:http://localhost/photo', 'data:image/jpeg;base64,/9j/AA=='])('decodes %s without createImageBitmap and normalizes UPC', async uri => {
    const saved = g.createImageBitmap;
    delete g.createImageBitmap;
    const reader: ZxingReader = {
      decode: jest.fn(),
      decodeFromImageUrl: jest.fn(async () => ({ getText: () => '036000291452', getBarcodeFormat: () => 14 })),
      reader: { reset: jest.fn() }, possibleFormats: [],
    };
    zxing.BrowserMultiFormatReader.mockImplementationOnce(function (this: object) { Object.assign(this, reader); });
    await expect(findBarcode(uri)).resolves.toBe('0036000291452');
    expect(reader.decodeFromImageUrl).toHaveBeenCalledWith(uri);
    expect(currentReader().possibleFormats).toEqual([7, 6, 14, 15]);
    expect(reader.reader.reset).toHaveBeenCalledTimes(1);
    g.createImageBitmap = saved;
  });
  it.each(['4840001000017', null])('returns null for an invalid code or a decoding miss (%s) and resets', async code => {
    const reader: ZxingReader = {
      decode: jest.fn(),
      decodeFromImageUrl: jest.fn(async () => {
        if (code === null) throw Object.assign(new Error(), { name: 'NotFoundException' });
        return { getText: () => code, getBarcodeFormat: () => 7 };
      }),
      reader: { reset: jest.fn() }, possibleFormats: [],
    };
    zxing.BrowserMultiFormatReader.mockImplementationOnce(function (this: object) { Object.assign(this, reader); });
    await expect(findBarcode('blob:http://localhost/photo')).resolves.toBeNull();
    expect(reader.reader.reset).toHaveBeenCalledTimes(1);
  });
});

it('expands UPC-E to canonical UPC-A before the shared checksum validation', async () => {
  delete g.BarcodeDetector;
  const reader: ZxingReader = {
    decode: jest.fn(),
    decodeFromImageUrl: jest.fn(async () => ({ getText: () => '04252614', getBarcodeFormat: () => 15 })),
    reader: { reset: jest.fn() }, possibleFormats: [],
  };
  zxing.BrowserMultiFormatReader.mockImplementationOnce(function (this: object) { Object.assign(this, reader); });
  await expect(findBarcode('blob:http://localhost/upce')).resolves.toBe('0042100005264');
});
