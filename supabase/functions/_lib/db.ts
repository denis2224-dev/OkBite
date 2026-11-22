import type { QueryData, SupabaseClient } from '@supabase/supabase-js';
import { Category, Code, Ingredient, type NutrientKey, Product, ScoreResult, Uuid } from '../_shared/contract.ts';
import { BUILTIN_INGREDIENTS, matchIngredients, resolveOffCategory } from '../_shared/ingredients/index.ts';
import { scoreProductNutrition } from '../_shared/score/index.ts';
import { anonClient } from './client.ts';
import { photoUrl } from './photoUrl.ts';

// Explicit public columns: C2 deliberately denies SELECT * to shopper readers.
const columns =
  'id,code,status,name,brand,quantity,unit,portion_amount,portion_label,kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,water,ingredients_text,allergens,may_contain,image_path,ingredients_photo_path,nutrition_photo_path,source,added_at,verified_at,nova_group,nova_source,category:categories(slug,name,scoreKind:score_kind)';
export const PRODUCT_INGREDIENT_COLUMNS =
  'position,raw_name,ingredient:ingredients(slug,name,group:grp,role,explanation,source,allergen,risk,riskSource:risk_source)';

export function selectProductRows(db: SupabaseClient) {
  return db.from('products').select(columns);
}

type ProductRow = QueryData<ReturnType<typeof selectProductRows>>[number];
// The untyped join infers an array. Ingredient.parse validates the embedded object.
export type ProductIngredientLink = { raw_name: string; ingredient: unknown };

export async function loadIngredientKnowledgeBase(db: SupabaseClient) {
  const query = await db.from('ingredients').select(
    'slug,name,aliases,group:grp,role,explanation,source,allergen,risk,riskSource:risk_source',
  );
  const merged = new Map(BUILTIN_INGREDIENTS.map((entry) => [entry.slug, entry]));
  for (const entry of query.data ?? []) merged.set(entry.slug, entry);
  return merged;
}

type IngredientKnowledgeBase = Awaited<ReturnType<typeof loadIngredientKnowledgeBase>>;

export function productIngredients(
  text: string,
  links: ProductIngredientLink[],
  kb?: IngredientKnowledgeBase,
): Ingredient[] {
  const resolved = links.length === 0 && text.trim() && kb
    ? matchIngredients(text, [...kb.values()]).map((match) => ({
      raw_name: match.rawName,
      ingredient: match.slug ? kb.get(match.slug) : null,
    }))
    : links;
  return resolved.map((link) =>
    Ingredient.parse({
      ...(link.ingredient ? Ingredient.parse(link.ingredient) : {
        slug: null,
        group: null,
        role: null,
        explanation: null,
        source: null,
        allergen: null,
      }),
      name: link.raw_name,
    })
  );
}

export async function loadProduct(by: { id: string } | { code: string }): Promise<
  { product: Product; score: ScoreResult } | null
> {
  const db = anonClient();
  const selector = 'id' in by ? 'id' : 'code';
  const value = 'id' in by ? Uuid.parse(by.id).toLowerCase() : Code.parse(by.code);
  const { data: row, error } = await selectProductRows(db)
    .eq(selector, value).neq('status', 'hidden').maybeSingle();
  if (error) throw new Error('Product lookup failed');
  if (!row || row.status === 'hidden') return null;
  const links = await db.from('product_ingredients').select(PRODUCT_INGREDIENT_COLUMNS)
    .eq('product_id', row.id).order('position');
  if (links.error) throw new Error('Ingredient lookup failed');
  const kb = !links.data?.length && row.ingredients_text?.trim()
    ? await loadIngredientKnowledgeBase(db)
    : undefined;
  const product = productFromRow(
    db,
    row,
    productIngredients(row.ingredients_text, links.data ?? [], kb),
  );
  return { product, score: scoreProduct(product) };
}

export function productFromRow(
  db: SupabaseClient,
  row: ProductRow,
  ingredients: Ingredient[] = [],
): Product {
  const date = (value: string) => new Date(value).toISOString().slice(0, 10);
  const resolvedCategory = resolveOffCategory({
    category: Category.parse(row.category),
    source: String(row.source ?? ''),
    unit: row.unit,
    name: String(row.name ?? ''),
    ingredientsText: String(row.ingredients_text ?? ''),
  });
  return Product.parse({
    id: row.id,
    code: row.code,
    status: row.status,
    name: row.name,
    brand: row.brand,
    quantity: row.quantity,
    unit: row.unit,
    category: resolvedCategory,
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
    water: row.water ?? null,
    ingredientsText: row.ingredients_text,
    ingredients,
    allergens: row.allergens,
    mayContain: row.may_contain,
    imageUrl: photoUrl(db, row.id, row.image_path),
    labelImageUrl: photoUrl(db, row.id, row.ingredients_photo_path ?? row.nutrition_photo_path),
    source: row.source,
    addedAt: date(row.added_at),
    verifiedAt: row.verified_at ? date(row.verified_at) : null,
    processing: row.nova_group == null ? null : { level: row.nova_group, source: row.nova_source },
  });
}

export function scoreProduct(product: Product): ScoreResult {
  return ScoreResult.parse(
    product.category.slug === 'necunoscut'
      ? {
        score: null,
        letter: null,
        grade: 'unavailable',
        reasons: [],
        missing: (['kcal', 'sat', 'sugar', 'salt'] as NutrientKey[])
          .filter((key) => product.nutrients[key] === null),
      }
      : scoreProductNutrition(product),
  );
}
