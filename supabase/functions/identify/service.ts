import { z } from 'npm:zod@3.23.8';
import {
  type Candidate,
  type FrontRead,
  type IdentifyRequest,
  IdentifyResponse,
  Uuid,
} from '../_shared/contract.ts';
import { askClaude, toBase64, validateProviderImages } from '../_lib/claude.ts';
import { loadProduct } from '../_lib/db.ts';
import { adminClient, logEvent } from '../_lib/http.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { parseFront } from './parseFront.ts';
import { FRONT_PROMPT } from './prompt.ts';

type Db = ReturnType<typeof adminClient>;
const searchRow = z.object({
  id: Uuid,
  name: z.string(),
  brand: z.string(),
  quantity: z.string(),
  image_path: z.string().nullable(),
  similarity: z.number(),
});

/** Up to 3 trigram matches (C2 search_products) for what Claude read on the front. */
async function findCandidates(db: Db, read: FrontRead): Promise<Candidate[]> {
  const q = [read.brand, read.name].filter(Boolean).join(' ');
  if (!q) return [];
  const { data, error } = await db.rpc('search_products', { q, max_results: 3 });
  if (error) throw new Error('Product search failed');
  return z.array(searchRow).parse(data).map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    quantity: row.quantity,
    // Same rule as the lookup loader: only promoted product-bucket photos become public URLs.
    imageUrl: row.image_path?.startsWith(`${row.id}/`) &&
        /^[a-f0-9-]+\/[a-z][a-z0-9-]*\.jpg$/.test(row.image_path)
      ? db.storage.from('products').getPublicUrl(row.image_path).data.publicUrl
      : null,
    similarity: Math.min(1, Math.max(0, row.similarity)),
  }));
}

export function createService(deps = { adminClient, loadProduct, saveJpeg, askClaude, logEvent }) {
  return async ({ photo }: IdentifyRequest, device: string) => {
    const db = deps.adminClient();
    const event = await reserveUsage(db, device, 'photo'); // 40 per device per 24 h (C6 migration)
    let photoPath: string | undefined;
    let image: string;
    try {
      photoPath = await deps.saveJpeg(photo, device, 'front');
      // Claude gets the stored copy, which saveJpeg re-encoded without EXIF/GPS metadata.
      const stored = await db.storage.from('uploads').download(photoPath);
      if (stored.error) throw new Error('Private photo read failed');
      image = toBase64(new Uint8Array(await stored.data.arrayBuffer()));
      validateProviderImages([image]);
    } catch (error) {
      // Nothing reached Claude: undo the upload and the quota use (same as read-label).
      try {
        if (photoPath) {
          const { error } = await db.storage.from('uploads').remove([photoPath]);
          if (error) throw new Error('Private photo cleanup failed');
        }
      } finally {
        await releaseUsage(db, event);
      }
      throw error;
    }
    const read = parseFront(await deps.askClaude([image], FRONT_PROMPT));
    const found = read.code ? await deps.loadProduct({ code: read.code }) : null;
    const candidates = found ? [] : await findCandidates(db, read);
    const body = IdentifyResponse.parse(
      found
        ? { status: 'found', ...found, photoPath }
        : candidates.length
        ? { status: 'candidates', candidates, read, photoPath }
        : { status: 'not_found', read, photoPath },
    );
    try {
      if (found) await deps.logEvent('identified', device, found.product.id);
      else if (!candidates.length) await deps.logEvent('not_found', device);
    } catch {
      console.warn('Identify analytics unavailable'); // analytics must not hide a valid answer
    }
    return body;
  };
}
export const identify = createService();
