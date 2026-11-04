import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as Camera from 'expo-camera';
import { findBarcode } from './findBarcode';
import { findBarcode as findBarcodeWeb } from './findBarcode.web';

jest.mock('expo-camera', () => ({ scanFromURLAsync: jest.fn() }));
const mockScan = Camera.scanFromURLAsync as jest.Mock;

describe('findBarcode (native and web)', () => {
  beforeEach(() => {
    mockScan.mockReset();
    delete (globalThis as Record<string, unknown>).BarcodeDetector;
  });
  it.each([['4840001000014', '4840001000014'], ['96385074', '96385074'], ['036000291452', '0036000291452']])('normalises detected barcode %s -> %s', async (raw, expected) => {
    mockScan.mockResolvedValueOnce([{ data: raw, type: 'ean13' }]);
    await expect(findBarcode('file:///photo.jpg')).resolves.toBe(expected);
    expect(mockScan).toHaveBeenCalledWith('file:///photo.jpg', ['ean13', 'ean8', 'upc_a']);
  });
  it('returns null when no valid barcode is found or scanFromURLAsync throws', async () => {
    mockScan.mockResolvedValueOnce([]);
    await expect(findBarcode('file:///empty.jpg')).resolves.toBeNull();
    mockScan.mockResolvedValueOnce([{ data: '4840001000017', type: 'ean13' }]);
    await expect(findBarcode('file:///bad-checksum.jpg')).resolves.toBeNull();
    mockScan.mockRejectedValueOnce(new Error('detector failed'));
    await expect(findBarcode('file:///corrupt.jpg')).resolves.toBeNull();
  });
  it('web fallback returns null when BarcodeDetector is absent and normalises when present', async () => {
    await expect(findBarcodeWeb('blob:photo-1')).resolves.toBeNull();
    (globalThis as Record<string, unknown>).BarcodeDetector = class { async detect() { return [{ rawValue: '036000291452' }]; } };
    await expect(findBarcodeWeb('data:image/jpeg;base64,AA==')).resolves.toBe('0036000291452');
  });
});
