import { z } from 'npm:zod@3.23.8';
import { ReportRequest } from '../_shared/contract.ts';
import { adminClient, HttpError } from '../_lib/http.ts';
import { postHandler } from '../_lib/post.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';

const success = z.object({ status: z.literal('ok') });
export async function report(input: ReportRequest, device: string) {
  const db = adminClient();
  const event = await reserveUsage(db, device, 'report');
  const { error } = await db.rpc('commit_report', {
    p_device: device,
    p_product: input.productId,
    p_message: input.message,
    p_event: event,
  });
  if (error) {
    await releaseUsage(db, event);
    if (error.code === 'P0002') throw new HttpError(404, 'Produs negăsit.', 'not_found');
    throw new Error('Report transaction failed');
  }
  return success.parse({ status: 'ok' });
}
export const createHandler = (run = report) => postHandler(ReportRequest, run);
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
