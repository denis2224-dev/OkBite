import { OFF_IMAGE_URL } from '../_shared/off/mapOffProduct.ts';

type Storage = { storage: { from(bucket: string): { getPublicUrl(path: string): { data: { publicUrl: string } } } } };

/** A product photo's public URL: a promoted products-bucket photo, or an Open Food Facts front photo. */
export function photoUrl(db: Storage, id: string, path: string | null): string | null {
  if (path && OFF_IMAGE_URL.test(path)) return path; // OFF imports store OFF's own URL in image_path
  return path?.startsWith(`${id}/`) && /^[a-f0-9-]+\/[a-z][a-z0-9-]*\.jpg$/.test(path)
    ? db.storage.from('products').getPublicUrl(path).data.publicUrl
    : null;
}
