import { z } from 'npm:zod@3.23.8';
import { ReportRequest, Uuid } from '../_shared/contract.ts';
import { adminClient, HttpError } from '../_lib/http.ts';
import { postHandler } from '../_lib/post.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';

const success = z.object({ status: z.literal('ok') });
export function createService(deps = { adminClient }) {
  return async (input: ReportRequest, device: string) => {
    const db = deps.adminClient();
    const event = await reserveUsage(db, device, 'report');
    const { error } = await db.rpc('commit_report', {
      p_device: device,
      p_product: input.productId,
      p_message: input.message,
      p_event: event,
    });
    if (error) {
      // An RPC transport failure can follow a successful transaction. Its event is
      // linked atomically, so recover success before releasing an unused reservation.
      const outcome = await db.from('usage_events').select('product_id').eq('id', event)
        .eq('device_id', device).eq('kind', 'report').maybeSingle();
      if (outcome.error) throw new Error('Report outcome unknown; quota release deferred');
      const persisted = z.object({ product_id: Uuid.nullable() }).nullable().parse(outcome.data);
      if (persisted?.product_id === input.productId.toLowerCase()) {
        return success.parse({ status: 'ok' });
      }
      if (persisted?.product_id) throw new Error('Report reservation belongs to another product');
      await releaseUsage(db, event);
      if (error.code === 'P0002') throw new HttpError(404, 'Produs negăsit.', 'not_found');
      throw new Error('Report transaction failed');
    }
    return success.parse({ status: 'ok' });
  };
}
export const report = createService();
export const createHandler = (run = report) => postHandler(ReportRequest, run);
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
