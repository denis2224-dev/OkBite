import type { SupabaseClient } from '@supabase/supabase-js';
import { mapOffProduct, OFF_FIELDS, OFF_USER_AGENT, toRow } from '../_shared/off/mapOffProduct.ts';

export type OffRow = ReturnType<typeof toRow>;
export interface OffStore {
  recentMiss(code: string): Promise<boolean>;
  rememberMiss(code: string): Promise<void>;
  /** Idempotent on code: a concurrent insert of the same code is ignored. */
  insert(row: OffRow): Promise<void>;
}
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const DAY_MS = 86_400_000;

async function quietly<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch {
    return fallback;
  }
}

/** Looks an unknown barcode up in Open Food Facts and saves a usable hit; true when saved. */
export async function offFallback(
  code: string,
  deps: { fetch: Fetch; store: OffStore },
): Promise<boolean> {
  // A cache read failure must not hide the product: treat it as no recent miss.
  if (await quietly(() => deps.store.recentMiss(code), false)) return false;
  let result: OffRow | 'miss' | 'error';
  try {
    // One request, never retried: OFF rate-limits and the shopper is waiting.
    const res = await deps.fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}?fields=${OFF_FIELDS}`,
      { headers: { 'User-Agent': OFF_USER_AGENT }, signal: AbortSignal.timeout(3000) },
    );
    if (res.status === 404) result = 'miss';
    else if (res.status !== 200) result = 'error';
    else {
      const body = await res.json();
      // The shopper is waiting, so a product without Romanian ingredients is kept when OFF lists its allergens.
      const mapped = body?.status === 1 ? mapOffProduct({ ...body.product, code }, [], { anyLanguage: true }) : null;
      result = mapped ? toRow(mapped) : 'miss';
    }
  } catch {
    result = 'error';
  }
  // Only genuine misses are remembered; a timeout or 429 must not hide a real product for 24 h.
  if (result === 'miss') await quietly(() => deps.store.rememberMiss(code), undefined);
  if (typeof result === 'string') return false;
  const row = result;
  return await quietly(() => deps.store.insert(row).then(() => true), false);
}

export function supabaseOffStore(db: SupabaseClient): OffStore {
  return {
    async recentMiss(code) {
      const { data, error } = await db
        .from('off_misses')
        .select('code')
        .eq('code', code)
        .gt('checked_at', new Date(Date.now() - DAY_MS).toISOString())
        .maybeSingle();
      if (error) throw new Error('Miss cache read failed');
      return data !== null;
    },
    async rememberMiss(code) {
      const { error } = await db
        .from('off_misses')
        .upsert({ code, checked_at: new Date().toISOString() }, { onConflict: 'code' });
      if (error) throw new Error('Miss cache write failed');
    },
    // Not the add-product RPC commit_product: it needs a device upload and quota slot.
    async insert(row) {
      const { error } = await db
        .from('products')
        .upsert(row, { onConflict: 'code', ignoreDuplicates: true });
      if (error) throw new Error('Product insert failed');
    },
  };
}
