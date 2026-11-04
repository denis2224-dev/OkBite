import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 1600;
const MAX_BYTES = 1_500_000;
// Quality only changes the encoder step; the image is resized once. Each step is measured, not assumed.
const QUALITIES = [0.8, 0.6, 0.4, 0.25];

// Size of the JPEG that the base64 string encodes.
function jpegBytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

export async function compressPhoto(uri: string): Promise<{ uri: string; base64: string; bytes: number }> {
  // maxWidth/maxHeight only reduce memory while decoding; the exact 1600 px limit is enforced below.
  let image = await ImageManipulator.manipulate(uri, { maxWidth: MAX_SIDE, maxHeight: MAX_SIDE }).renderAsync();
  if (Math.max(image.width, image.height) > MAX_SIDE) {
    const size = image.width >= image.height ? { width: MAX_SIDE } : { height: MAX_SIDE };
    image = await ImageManipulator.manipulate(image).resize(size).renderAsync();
  }
  for (const compress of QUALITIES) {
    const saved = await image.saveAsync({ compress, format: SaveFormat.JPEG, base64: true });
    const base64 = saved.base64 ?? '';
    const bytes = jpegBytes(base64);
    if (base64 && bytes <= MAX_BYTES) return { uri: saved.uri, base64, bytes };
  }
  throw new Error('Photo is still over 1.5 MB after compression');
}
