import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { scanFromURLAsync } from 'expo-camera';
import { findBarcode } from './findBarcode';

jest.mock('expo-camera', () => ({ scanFromURLAsync: jest.fn() }));
const scan = scanFromURLAsync as unknown as jest.Mock<(...a: unknown[]) => Promise<unknown>>;

describe('findBarcode (native)', () => {
  beforeEach(() => { scan.mockReset(); });

  it.each([
    ['EAN-13', '4840001000014', '4840001000014'],
    ['EAN-8', '96385074', '96385074'],
    ['UPC-A', '036000291452', '0036000291452'],
  ])('normalises a detected %s through the shared utility', async (_name, raw, expected) => {
    scan.mockResolvedValueOnce([{ data: raw, type: 'ean13' }]);
    await expect(findBarcode('file:///photo.jpg')).resolves.toBe(expected);
    expect(scan).toHaveBeenCalledWith('file:///photo.jpg', ['ean13', 'ean8', 'upc_a']);
  });

  it('skips a hit with a bad checksum and returns the next valid one', async () => {
    scan.mockResolvedValueOnce([{ data: '4840001000017' }, { data: '4840001000014' }]);
    await expect(findBarcode('file:///photo.jpg')).resolves.toBe('4840001000014');
  });

  it('returns null when nothing valid is found or the detector throws', async () => {
    scan.mockResolvedValueOnce([]);
    await expect(findBarcode('file:///empty.jpg')).resolves.toBeNull();
    scan.mockResolvedValueOnce([{ data: '4840001000017' }]);
    await expect(findBarcode('file:///bad-checksum.jpg')).resolves.toBeNull();
    scan.mockRejectedValueOnce(new Error('detector failed'));
    await expect(findBarcode('file:///corrupt.jpg')).resolves.toBeNull();
  });
});
