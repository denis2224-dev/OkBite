import { z } from 'npm:zod@3.23.8';
import { adminClient } from '../_lib/http.ts';

const removal = z.object({ bucket_id: z.enum(['products', 'uploads']), path: z.string().min(1) });
// Tombstones survive success: reusing a removed URL is forbidden by the database.
// A failed delete/ack is safe to retry; Storage remove accepts already absent objects.
export async function removeHiddenPhotos(productId: string, db = adminClient()): Promise<void> {
  while (true) {
    const { data, error } = await db.from('photo_removals').select('bucket_id,path')
      .eq('product_id', productId).is('completed_at', null).limit(100);
    if (error) throw new Error('Photo removal lookup failed');
    const pending = z.array(removal).parse(data);
    if (!pending.length) return;
    for (const item of pending) {
      const deleted = await db.storage.from(item.bucket_id).remove([item.path]);
      if (deleted.error) throw new Error('Photo removal failed');
      const acknowledged = await db.from('photo_removals').update({
        completed_at: new Date().toISOString(),
      })
        .eq('product_id', productId).eq('bucket_id', item.bucket_id).eq('path', item.path);
      if (acknowledged.error) throw new Error('Photo removal acknowledgement failed');
    }
  }
}
