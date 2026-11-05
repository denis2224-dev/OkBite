import { Uuid } from '../_shared/contract.ts';
import { adminClient, HttpError } from './http.ts';
import { cleanJpeg } from './jpeg.ts';

type Suffix = 'front' | 'ingredients' | 'nutrition';
export async function saveJpeg(base64: string, deviceId: string, suffix: Suffix): Promise<string> {
  const device = Uuid.safeParse(deviceId);
  if (!device.success || !['front', 'ingredients', 'nutrition'].includes(suffix)) {
    throw new HttpError(400);
  }
  const bytes = cleanJpeg(base64);
  const path = `${device.data.toLowerCase()}/${crypto.randomUUID()}-${suffix}.jpg`;
  const { error } = await adminClient().storage.from('uploads').upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error('Private photo upload failed');
  return path;
}
// C6 must additionally compare the path's device prefix with the requesting device.
export async function publishPhoto(
  uploadPath: string,
  productId: string,
  suffix: string,
): Promise<string> {
  const [device, file, extra] = uploadPath.split('/');
  const match = file?.match(/^([a-f0-9-]+)-(front|ingredients|nutrition)\.jpg$/);
  const product = Uuid.safeParse(productId);
  if (
    !Uuid.safeParse(device).success || extra !== undefined || !match ||
    !Uuid.safeParse(match[1]).success || !product.success || !/^[a-z][a-z0-9-]{0,31}$/.test(suffix)
  ) {
    throw new HttpError(400);
  }
  const path = `${product.data.toLowerCase()}/${suffix}.jpg`;
  const { error } = await adminClient().storage.from('uploads').copy(uploadPath, path, {
    destinationBucket: 'products',
  });
  if (error) throw new Error('Photo publication failed');
  return path;
}
