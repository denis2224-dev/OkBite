import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http.ts';

// Admission writes the usage event atomically. AI callers keep this event on
// success; do not also logEvent('photo'/'read_label'). Release only a confirmed
// failed operation, never an ambiguous outcome that may already have committed.
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
