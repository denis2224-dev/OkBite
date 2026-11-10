import { type EnrichProductRequest, LookupResponse, Uuid } from '../_shared/contract.ts';
import { adminClient, HttpError } from '../_lib/http.ts';
import { loadProduct } from '../_lib/db.ts';
import { publishPhoto } from '../_lib/storage.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';

export async function enrichProduct(input: EnrichProductRequest, device: string) {
  input = { ...input, productId: input.productId.toLowerCase() };
  const upload = input.nutritionPhotoPath;
  if (!new RegExp(`^${device}/[a-f0-9-]{36}-(front|ingredients|nutrition)\\.jpg$`).test(upload)) {
    throw new HttpError(400, 'Fotografia nu aparține acestui dispozitiv.');
  }
  const db = adminClient();
  const found = async () => {
    const result = await loadProduct({ id: input.productId });
    if (!result) throw new HttpError(409, 'Produs indisponibil.', 'duplicate');
    return LookupResponse.parse({ status: 'found', ...result });
  };
  const recover = async () => {
    const receipt = await db.from('enrichment_receipts').select('product_id')
      .eq('device_id', device).eq('upload_path', upload).maybeSingle();
    if (receipt.error) throw new Error('Enrichment receipt lookup failed');
    if (!receipt.data) return null;
    if (Uuid.parse(receipt.data.product_id) !== input.productId) throw new HttpError(400);
    return await found();
  };
  const recovered = await recover();
  if (recovered) return recovered;
  const suffix = `nutrition-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
  const path = `${input.productId}/${suffix}.jpg`;
  const args = { p_id: input.productId, p_device: device, p_upload: upload, p_suffix: suffix,
    p_event: null as number | null };
  const rpc = async (values = {}) => {
    const { data, error } = await db.rpc('enrich_product', { ...args, ...values });
    if (error?.code === 'P0003') throw new HttpError(409, 'Produsul nu mai poate fi completat.', 'duplicate');
    if (error?.code === 'P0004') throw new HttpError(400, 'Fotografie indisponibilă.');
    if (error) throw new Error('Enrichment transaction failed');
    return data === null ? null : Uuid.parse(data);
  };
  if (await rpc()) return await found(); // Eligibility check before quota admission.
  let event: number;
  try { event = await reserveUsage(db, device, 'added'); }
  catch (error) {
    if (error instanceof HttpError && error.status === 429) {
      for (let i = 0; i < 5; i++) {
        const result = await recover();
        if (result) return result;
        if (i < 4) await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw error;
  }
  args.p_event = event;
  let publishing = false;
  const cleanup = async () => {
    if (publishing && (await db.storage.from('products').remove([path])).error) {
      throw new Error('Enrichment photo compensation failed');
    }
  };
  try {
    if (await rpc()) return await found(); // Concurrent retry committed before publication.
    publishing = true;
    await publishPhoto(upload, input.productId, suffix);
    const { fruitVegPct, ...nutrients } = input.nutrients;
    await rpc({ p_nutrients: { ...nutrients, fruit_veg_pct: fruitVegPct }, p_unit: input.unit });
    const row = await db.from('products').select('nutrition_photo_path').eq('id', input.productId).single();
    if (row.error) throw new Error('Enrichment outcome unknown');
    if (row.data.nutrition_photo_path !== path) await cleanup();
    return await found();
  } catch (error) {
    // Release locks out a late commit before compensating; committed events survive.
    await releaseUsage(db, event);
    const result = await recover();
    if (result) {
      const row = await db.from('products').select('nutrition_photo_path').eq('id', input.productId).single();
      if (row.error) throw new Error('Enrichment outcome unknown; compensation deferred');
      if (row.data.nutrition_photo_path !== path) await cleanup();
      return result;
    }
    await cleanup();
    throw error;
  }
}
