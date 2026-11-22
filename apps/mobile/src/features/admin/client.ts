import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  type AdminAddWaterInput,
  ErrorBody,
  ModerateRequest,
  OFF_IMAGE_URL,
  ProductInput,
  Uuid,
  WaterSubmission,
} from '@okbite/shared';
import { ro } from '../../copy/ro';

let instance: SupabaseClient | undefined;
const ModerationResponse = z.object({ status: z.literal('ok'), productId: Uuid.optional() });

export function getAdminClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error(ro.app.admin.notConfigured);
  return (instance ??= createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }));
}

async function invokeModeration(value: ModerateRequest) {
  const { data, error } = await getAdminClient().functions.invoke('moderate', {
    body: ModerateRequest.parse(value),
  });
  if (error) {
    if (error.context instanceof Response) {
      const body = ErrorBody.safeParse(await error.context.json().catch(() => null));
      if (body.success) throw new Error(ro.errors[body.data.error]);
    }
    throw new Error(ro.app.admin.failed);
  }
  return ModerationResponse.parse(data);
}

export async function sendModeration(value: ModerateRequest) {
  await invokeModeration(value);
}

export async function createAdminWater(product: AdminAddWaterInput): Promise<string | null> {
  const res = await invokeModeration({ action: 'add_water', product });
  return res.productId ?? null;
}
export async function readAdminProduct(id: string) {
  const db = getAdminClient();
  const { data: row, error } = await db
    .from('products')
    .select(
      'id,name,brand,quantity,code,unit,category_slug,ingredients_text,kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,water,image_path,ingredients_photo_path,nutrition_photo_path',
    )
    .eq('id', Uuid.parse(id))
    .single();
  if (error) throw new Error(ro.app.admin.failed);
  // A shopper may save an unreadable brand as ''; the editor makes the moderator fill it before verifying.
  const input = ProductInput.innerType().extend({ brand: z.string().max(80) }).parse({
    code: row.code,
    name: row.name,
    brand: row.brand,
    quantity: row.quantity,
    categorySlug: row.category_slug,
    unit: row.unit,
    ingredientsText: row.ingredients_text,
    water: row.water ?? null,
    nutrients: {
      kcal: row.kcal,
      fat: row.fat,
      sat: row.sat,
      sugar: row.sugar,
      salt: row.salt,
      protein: row.protein,
      fiber: row.fiber,
      fruitVegPct: row.fruit_veg_pct,
    },
  });
  const photos = [
    [ro.app.admin.front, row.image_path],
    [ro.app.admin.ingredientsPhoto, row.ingredients_photo_path],
    [ro.app.admin.nutritionPhoto, row.nutrition_photo_path],
  ].flatMap(([label, path]) =>
    typeof path === 'string' && OFF_IMAGE_URL.test(path) ? [{ label: String(label), url: path }] // OFF imports keep OFF's photo URL
    : typeof path === 'string' && path.startsWith(`${id}/`)
      ? [
          {
            label: String(label),
            url: db.storage.from('products').getPublicUrl(path).data.publicUrl,
          },
        ]
      : [],
  );
  return { input, photos };
}

/** Loads pending shopper water submissions (conflicts and verified edits) for moderator resolution. */
export async function readWaterSubmissions(): Promise<WaterSubmission[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('water_submissions')
    .select(
      'id,product_id,photo_path,proposed_water,kind,status,created_at,product:products(name,brand,quantity,water)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(ro.app.admin.failed);
  return (data ?? []).map((row) => {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    const photoPath = String(row.photo_path ?? '');
    const photoUrl = photoPath
      ? db.storage.from('products').getPublicUrl(photoPath).data.publicUrl || null
      : null;
    return WaterSubmission.parse({
      id: row.id,
      productId: row.product_id,
      productName: product?.name ?? '',
      productBrand: product?.brand ?? '',
      productQuantity: product?.quantity ?? '',
      currentWater: product?.water ?? null,
      proposedWater: row.proposed_water,
      photoPath,
      photoUrl,
      kind: row.kind,
      status: row.status,
      createdAt: new Date(String(row.created_at)).toISOString().slice(0, 10),
    });
  });
}
