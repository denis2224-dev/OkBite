import { createClient } from '@supabase/supabase-js';
import { Category, Code, Ingredient, Product, ScoreResult, Uuid } from '../_shared/contract.ts';
import { computeScore } from '../_shared/score/index.ts';

// Explicit public columns: C2 deliberately denies SELECT * to shopper readers.
const columns =
  'id,code,status,name,brand,quantity,unit,portion_amount,portion_label,kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,ingredients_text,allergens,may_contain,image_path,ingredients_photo_path,nutrition_photo_path,source,added_at,verified_at,category:categories(slug,name,scoreKind:score_kind)';
export async function loadProduct(by: { id: string } | { code: string }): Promise<
  {
    product: Product;
    score: ScoreResult;
  } | null
> {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const selector = 'id' in by ? 'id' : 'code';
  const value = 'id' in by ? Uuid.parse(by.id).toLowerCase() : Code.parse(by.code);
  const { data: row, error } = await db.from('products').select(columns)
    .eq(selector, value).neq('status', 'hidden').maybeSingle();
  if (error) throw new Error('Product lookup failed');
  if (!row || row.status === 'hidden') return null;
  const links = await db.from('product_ingredients').select(
    'position,raw_name,ingredient:ingredients(slug,name,group:grp,role,explanation,source,allergen)',
  ).eq('product_id', row.id).order('position');
  if (links.error) throw new Error('Ingredient lookup failed');
  const photoUrl = (path: string | null) =>
    path?.startsWith(`${row.id}/`) &&
      /^[a-f0-9-]+\/[a-z][a-z0-9-]*\.jpg$/.test(path)
      ? db.storage.from('products').getPublicUrl(path).data.publicUrl
      : null;
  const date = (value: string) => new Date(value).toISOString().slice(0, 10);
  const product = Product.parse({
    id: row.id,
    code: row.code,
    status: row.status,
    name: row.name,
    brand: row.brand,
    quantity: row.quantity,
    unit: row.unit,
    category: Category.parse(row.category),
    portion: { amount: Number(row.portion_amount), label: row.portion_label },
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
    ingredientsText: row.ingredients_text,
    ingredients: (links.data ?? []).map((link) => ({
      ...(link.ingredient ? Ingredient.parse(link.ingredient) : {
        slug: null,
        group: null,
        role: null,
        explanation: null,
        source: null,
        allergen: null,
      }),
      name: link.raw_name,
    })),
    allergens: row.allergens,
    mayContain: row.may_contain,
    imageUrl: photoUrl(row.image_path),
    labelImageUrl: photoUrl(row.ingredients_photo_path ?? row.nutrition_photo_path),
    source: row.source,
    addedAt: date(row.added_at),
    verifiedAt: row.verified_at ? date(row.verified_at) : null,
  });
  return {
    product,
    score: ScoreResult.parse(computeScore(product.nutrients, product.category.scoreKind)),
  };
}
