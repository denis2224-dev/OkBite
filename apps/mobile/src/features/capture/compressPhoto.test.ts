import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as ImageManipulator from 'expo-image-manipulator';
import { compressPhoto } from './compressPhoto';

jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: jest.fn() }));
const mockManipulate = ImageManipulator.manipulateAsync as jest.Mock;

describe('compressPhoto', () => {
  beforeEach(() => { mockManipulate.mockReset(); });
  it('resizes a 4000x3000 image to longest side <= 1600 px and JPEG <= 1.5 MB', async () => {
    mockManipulate.mockResolvedValueOnce({ uri: 'file:///c.jpg', width: 1600, height: 1200, base64: 'A'.repeat(400_000) });
    const res = await compressPhoto('file:///raw-4000x3000.jpg');
    expect(mockManipulate).toHaveBeenCalledWith('file:///raw-4000x3000.jpg', [{ resize: { width: 1600 } }], { compress: 0.8, format: 'jpeg', base64: true });
    expect(res.bytes).toBeLessThanOrEqual(1_500_000);
  });
  it('constrains portrait images so height is also <= 1600 px', async () => {
    const base64 = 'A'.repeat(200_000);
    mockManipulate.mockResolvedValueOnce({ uri: 'file:///p1.jpg', width: 1600, height: 2133, base64 }).mockResolvedValueOnce({ uri: 'file:///p2.jpg', width: 1200, height: 1600, base64 });
    const res = await compressPhoto('file:///raw-3000x4000.jpg');
    expect(mockManipulate).toHaveBeenLastCalledWith('file:///raw-3000x4000.jpg', [{ resize: { height: 1600 } }], { compress: 0.8, format: 'jpeg', base64: true });
    expect(res.uri).toBe('file:///p2.jpg');
  });
  it('steps down past 0.6 when > 1.5 MB and throws if still over 1.5 MB', async () => {
    const huge = 'A'.repeat(2_200_000);
    mockManipulate.mockResolvedValueOnce({ uri: 'file:///q08.jpg', width: 1600, height: 1200, base64: huge }).mockResolvedValueOnce({ uri: 'file:///q06.jpg', width: 1600, height: 1200, base64: huge }).mockResolvedValueOnce({ uri: 'file:///q04.jpg', width: 1200, height: 900, base64: 'A'.repeat(1_200_000) });
    expect((await compressPhoto('file:///dense.jpg')).bytes).toBeLessThanOrEqual(1_500_000);
    mockManipulate.mockResolvedValue({ uri: 'file:///big.jpg', width: 1200, height: 900, base64: huge });
    await expect(compressPhoto('file:///uncompressible.jpg')).rejects.toThrow(/1\.5 MB/i);
  });
});
