import { z } from 'npm:zod@3.23.8';
import { type AddProductRequest, LookupResponse, Uuid } from '../_shared/contract.ts';
import { detectAllergens } from '../_shared/allergens/index.ts';
import { normalizeCode } from '../_shared/ean/index.ts';
import { adminClient, HttpError } from '../_lib/http.ts';
import { loadProduct } from '../_lib/db.ts';
import { publishPhoto } from '../_lib/storage.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';
import { matchIngredients } from './matchIngredients.ts';

const resultSchema = z.object({ id: Uuid, created: z.boolean() });
export function createService(
  deps = { adminClient, loadProduct, publishPhoto, newId: () => crypto.randomUUID() as string },
) {
  return async (input: AddProductRequest, device: string) => {
    const photos = [
      ['front', input.photoPath],
      ['ingredients', input.ingredientsPhotoPath],
      ['nutrition', input.nutritionPhotoPath],
    ] as const;
    for (const [, path] of photos) {
      if (
        path !== null &&
        !new RegExp(`^${device}/[a-f0-9-]{36}-(front|ingredients|nutrition)\\.jpg$`).test(path)
      ) {
        throw new HttpError(400, 'Fotografia nu aparține acestui dispozitiv.');
      }
    }
    if (input.code !== null && normalizeCode(input.code) !== input.code) throw new HttpError(400);
    const db = deps.adminClient();
    const foundResponse = async (id: string) => {
      const found = await deps.loadProduct({ id });
      if (!found) throw new HttpError(409, 'Codul este deja utilizat.', 'duplicate');
      return LookupResponse.parse({ status: 'found', ...found });
    };
    // A new HTTP attempt must recover a committed barcode-free submission too.
    const recover = async () => {
      const receipt = await db
        .from('contribution_receipts')
        .select('product_id')
        .eq('device_id', device)
        .eq('upload_path', input.ingredientsPhotoPath)
        .maybeSingle();
      if (receipt.error) throw new Error('Submission receipt lookup failed');
      return receipt.data ? await foundResponse(Uuid.parse(receipt.data.product_id)) : null;
    };
    const recovered = await recover();
    if (recovered) return recovered;
    if (input.code) {
      const existing = await db.from('products').select('id').eq('code', input.code).maybeSingle();
      if (existing.error) throw new Error('Duplicate lookup failed');
      if (existing.data) {
        const { data, error } = await db.rpc('commit_product', {
          p_product: {
            code: input.code,
            added_by_device: device,
            ingredients_upload_path: input.ingredientsPhotoPath,
            photo_upload_paths: photos.flatMap(([, path]) => path === null ? [] : [path]),
          },
          p_links: [],
          p_event: null,
        });
        if (error?.code === 'P0003')
          throw new HttpError(409, 'Codul este deja utilizat.', 'duplicate');
        if (error?.code === 'P0004') throw new HttpError(400, 'Fotografie indisponibilă.');
        if (error) throw new Error('Existing submission receipt failed');
        return await foundResponse(resultSchema.parse(data).id);
      }
    }
    let event: number;
    try {
      event = await reserveUsage(db, device, 'added');
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) {
        // The last slot may belong to this same upload's still-running request.
        for (let attempt = 0; attempt < 5; attempt++) {
          const result = await recover();
          if (result) return result;
          if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      throw error;
    }
    const id = deps.newId();
    const published: string[] = [];
    const cleanup = async () => {
      if (published.length) {
        const { error } = await db.storage.from('products').remove(published);
        if (error) throw new Error('Photo compensation failed');
      }
    };
    try {
      const kb = await db.from('ingredients').select('slug,name,aliases');
      if (kb.error) throw new Error('Ingredient lookup failed');
      const paths: Record<string, string | null> = {
        front: null,
        ingredients: null,
        nutrition: null,
      };
      for (const [suffix, path] of photos) {
        if (path === null) continue;
        const intent = await db.rpc('record_photo_publication', {
          p_event: event, p_device: device, p_product_id: id, p_upload_path: path, p_suffix: suffix,
        });
        if (intent.error?.code === 'P0004') {
          // Another attempt may have committed this exact receipt while we waited.
          const recovered = await recover();
          if (recovered) {
            await cleanup();
            await releaseUsage(db, event);
            return recovered;
          }
          throw new HttpError(400, 'Fotografie indisponibilă.');
        }
        if (intent.error) throw new Error('Photo publication journal failed');
        published.push(`${id}/${suffix}.jpg`);
        paths[suffix] = await deps.publishPhoto(path, id, suffix);
      }
      const allergens = detectAllergens(input.ingredientsText);
      const { fruitVegPct, ...nutrients } = input.nutrients;
      const { data, error } = await db.rpc('commit_product', {
        p_product: {
          id,
          code: input.code,
          name: input.name,
          brand: input.brand,
          quantity: input.quantity,
          category_slug: input.categorySlug,
          unit: input.unit,
          ...nutrients,
          fruit_veg_pct: fruitVegPct,
          ingredients_text: input.ingredientsText,
          allergens: allergens.allergens,
          may_contain: allergens.mayContain,
          image_path: paths.front,
          ingredients_photo_path: paths.ingredients,
          nutrition_photo_path: paths.nutrition,
          added_by_device: device,
          ingredients_upload_path: input.ingredientsPhotoPath,
          photo_upload_paths: photos.flatMap(([, path]) => path === null ? [] : [path]),
        },
        p_links: matchIngredients(input.ingredientsText, kb.data ?? []),
        p_event: event,
      });
      if (error) {
        if (error.code === 'P0003') {
          throw new HttpError(409, 'Codul este deja utilizat.', 'duplicate');
        }
        if (error.code === 'P0004') throw new HttpError(400, 'Fotografie indisponibilă.');
        if (error.code === '23503') throw new HttpError(400, 'Categorie necunoscută.');
        throw new Error('Product transaction failed');
      }
      const result = resultSchema.parse(data);
      if (!result.created) await cleanup();
      return await foundResponse(result.id);
    } catch (error) {
      // A lost RPC response may follow a committed transaction. Keep its photos/event.
      const persisted = await db.from('products').select('id').eq('id', id).maybeSingle();
      if (persisted.error) throw new Error('Submission outcome unknown; compensation deferred');
      if (persisted.data) return await foundResponse(id);
      try {
        await cleanup();
      } finally {
        await releaseUsage(db, event);
      }
      throw error;
    }
  };
}
export const addProduct = createService();
