import { type EnrichProductRequest, LookupResponse, Uuid, type WaterSubmissionOutcome } from '../_shared/contract.ts';
import { adminClient, HttpError } from '../_lib/http.ts';
import { loadProduct } from '../_lib/db.ts';
import { publishPhoto } from '../_lib/storage.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';

export interface EnrichProductDeps {
  adminClient: typeof adminClient;
  loadProduct: typeof loadProduct;
  publishPhoto: typeof publishPhoto;
  reserveUsage: typeof reserveUsage;
  releaseUsage: typeof releaseUsage;
}

const defaultDeps: EnrichProductDeps = { adminClient, loadProduct, publishPhoto, reserveUsage, releaseUsage };

export async function enrichProduct(
  input: EnrichProductRequest,
  device: string,
  deps: EnrichProductDeps = defaultDeps,
) {
  if (input.water && input.unit !== 'ml') throw new HttpError(400);
  input = { ...input, productId: input.productId.toLowerCase() };
  const upload = input.nutritionPhotoPath;
  if (!new RegExp(`^${device}/[a-f0-9-]{36}-(front|ingredients|nutrition)\\.jpg$`).test(upload)) {
    throw new HttpError(400, 'Fotografia nu aparține acestui dispozitiv.');
  }
  const db = deps.adminClient();
  const found = async (waterSubmissionStatus?: WaterSubmissionOutcome) => {
    const result = await deps.loadProduct({ id: input.productId });
    if (!result) throw new HttpError(409, 'Produs indisponibil.', 'duplicate');
    return LookupResponse.parse({
      status: 'found',
      ...result,
      ...(waterSubmissionStatus ? { waterSubmissionStatus } : {}),
    });
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
  try { event = await deps.reserveUsage(db, device, 'added'); }
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
  const verifyPublishedOrCleanup = async (
    checkWaterStatus: boolean,
  ): Promise<WaterSubmissionOutcome | undefined> => {
    const [row, subRows] = await Promise.all([
      db.from('products').select('nutrition_photo_path').eq('id', input.productId).single(),
      db.from('water_submissions').select('id,status')
        .eq('product_id', input.productId).eq('photo_path', path)
        .order('created_at', { ascending: false }).limit(4),
    ]);
    if (row.error || subRows.error) throw new Error('Enrichment outcome unknown');
    const subs = subRows.data ?? [];
    if (row.data.nutrition_photo_path !== path && subs.length === 0) await cleanup();
    if (!checkWaterStatus || subs.length === 0) return undefined;
    const hasAccepted = subs.some((s) => s.status === 'accepted');
    const hasPending = subs.some((s) => s.status === 'pending');
    if (hasAccepted && hasPending) return 'partial';
    if (hasPending) return 'queued_for_review';
    return 'applied';
  };
  try {
    if (await rpc()) return await found(); // Concurrent retry committed before publication.
    publishing = true;
    await deps.publishPhoto(upload, input.productId, suffix);
    const { fruitVegPct, ...nutrients } = input.nutrients;
    await rpc({
      p_nutrients: { ...nutrients, fruit_veg_pct: fruitVegPct, ...(input.water !== undefined ? { water: input.water } : {}) },
      p_unit: input.unit,
    });
    const status = await verifyPublishedOrCleanup(input.water !== undefined && input.water !== null);
    return await found(status);
  } catch (error) {
    // Release locks out a late commit before compensating; committed events survive.
    await deps.releaseUsage(db, event);
    const result = await recover();
    if (result) {
      try {
        await verifyPublishedOrCleanup(false);
      } catch {
        throw new Error('Enrichment outcome unknown; compensation deferred');
      }
      return result;
    }
    await cleanup();
    throw error;
  }
}
