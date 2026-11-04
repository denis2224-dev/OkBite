import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ImageManipulator } from 'expo-image-manipulator';
import { compressPhoto } from './compressPhoto';

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn() },
}));

const manipulate = ImageManipulator.manipulate as unknown as jest.Mock;
const base64Of = (bytes: number) => Buffer.alloc(bytes, 1).toString('base64');

// A native image handle: `saveAsync` returns one JPEG per call, sized as listed.
function nativeImage(width: number, height: number, jpegSizes: number[] = [300_000]) {
  const saveAsync = jest.fn<(o: unknown) => Promise<unknown>>();
  for (const size of jpegSizes) saveAsync.mockResolvedValueOnce({ uri: `file:///q${size}.jpg`, width, height, base64: base64Of(size) });
  return { width, height, saveAsync };
}
function stepReturns(...images: ReturnType<typeof nativeImage>[]) {
  const resize = jest.fn();
  for (const image of images) {
    manipulate.mockReturnValueOnce({ resize: resize.mockReturnThis(), renderAsync: async () => image });
  }
  return resize;
}

describe('compressPhoto', () => {
  beforeEach(() => { manipulate.mockReset(); });

  it('loads with a 1600 px cap and saves JPEG at 0.8 without resizing an already small image', async () => {
    const image = nativeImage(1600, 1200);
    stepReturns(image);
    const res = await compressPhoto('file:///raw.jpg');
    expect(manipulate).toHaveBeenCalledTimes(1);
    expect(manipulate).toHaveBeenCalledWith('file:///raw.jpg', { maxWidth: 1600, maxHeight: 1600 });
    expect(image.saveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg', base64: true });
    expect(res).toMatchObject({ uri: 'file:///q300000.jpg', bytes: 300_000 });
  });

  it('resizes a landscape photo the loader left at 4000x3000 to width 1600', async () => {
    const resize = stepReturns(nativeImage(4000, 3000), nativeImage(1600, 1200));
    await compressPhoto('file:///raw.jpg');
    expect(resize).toHaveBeenCalledWith({ width: 1600 });
  });

  it('resizes a portrait photo by height so the longest side is 1600', async () => {
    const resize = stepReturns(nativeImage(3000, 4000), nativeImage(1200, 1600));
    await compressPhoto('file:///raw.jpg');
    expect(resize).toHaveBeenCalledWith({ height: 1600 });
  });

  it('measures the real JPEG size instead of trusting the 0.6 quality step', async () => {
    const image = nativeImage(1600, 1200, [1_700_000, 1_600_000, 1_200_001]);
    stepReturns(image);
    const res = await compressPhoto('file:///noisy.jpg');
    expect(image.saveAsync.mock.calls.map(([o]) => (o as { compress: number }).compress)).toEqual([0.8, 0.6, 0.4]);
    expect(res.bytes).toBe(1_200_001);
    expect(res.bytes).toBeLessThanOrEqual(1_500_000);
  });

  it('accepts exactly 1.5 MB and rejects 1.5 MB + 1 byte at every quality', async () => {
    stepReturns(nativeImage(1600, 1200, [1_500_000]));
    await expect(compressPhoto('file:///edge.jpg')).resolves.toMatchObject({ bytes: 1_500_000 });
    stepReturns(nativeImage(1600, 1200, [1_500_001, 1_500_001, 1_500_001, 1_500_001]));
    await expect(compressPhoto('file:///too-big.jpg')).rejects.toThrow(/1\.5 MB/);
  });

  it('fails when the encoder returns no data', async () => {
    const image = nativeImage(1600, 1200, []);
    image.saveAsync.mockResolvedValue({ uri: 'file:///x.jpg', width: 1600, height: 1200 });
    stepReturns(image);
    await expect(compressPhoto('file:///raw.jpg')).rejects.toThrow(/1\.5 MB/);
  });
});
