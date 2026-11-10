import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ErrorBody, ModerateRequest, ProductInput, Uuid } from '@okbite/shared';
import { ro } from '../../copy/ro';

let instance: SupabaseClient | undefined;
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
export async function sendModeration(value: ModerateRequest) {
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
  z.object({ status: z.literal('ok') }).parse(data);
}
export async function readAdminProduct(id: string) {
  const db = getAdminClient();
  const { data: row, error } = await db
    .from('products')
    .select(
      'id,name,brand,quantity,code,unit,category_slug,ingredients_text,kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,image_path,ingredients_photo_path,nutrition_photo_path',
    )
    .eq('id', Uuid.parse(id))
    .single();
  if (error) throw new Error(ro.app.admin.failed);
  // A shopper may save an unreadable brand as ''; the editor makes the moderator fill it before verifying.
  const input = ProductInput.extend({ brand: z.string().max(80) }).parse({
    code: row.code,
    name: row.name,
    brand: row.brand,
    quantity: row.quantity,
    categorySlug: row.category_slug,
    unit: row.unit,
    ingredientsText: row.ingredients_text,
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
    typeof path === 'string' && path.startsWith(`${id}/`)
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
