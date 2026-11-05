import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http.ts';

export async function reserveUsage(
  db: SupabaseClient,
  device: string,
  kind: 'added' | 'report' | 'photo' | 'read_label',
) {
  const { data, error } = await db.rpc('reserve_usage', { p_device: device, p_kind: kind });
  if (error) throw new Error('Quota admission failed');
  if (data === null) throw new HttpError(429, 'Ai atins limita zilnică.', 'rate_limited');
  return Number(data);
}
export async function releaseUsage(db: SupabaseClient, event: number) {
  const { error } = await db.from('usage_events').delete().eq('id', event).is('product_id', null);
  if (error) throw new Error('Quota release failed');
}
