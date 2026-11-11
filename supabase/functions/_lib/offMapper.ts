// shortcut: fake mapper until N22 step 1 merges; replace with N22's mapOffProduct.
// Field names follow scripts/import-off.ts (Node code, so it is not imported here).
import { detectAllergens } from '../_shared/allergens/index.ts';

export const OFF_FIELDS =
  'product_name,product_name_ro,brands,quantity,product_quantity_unit,lang,ingredients_text,ingredients_text_ro,nutriments,nova_group';

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/** Products insert row (without code) for an OFF product, or null when it is not usable. */
export function mapOffProduct(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const name = text(p.product_name_ro) || text(p.product_name);
  const brand = text(p.brands);
  const ingredients =
    text(p.ingredients_text_ro) || (p.lang === 'ro' ? text(p.ingredients_text) : '');
  if (!name || !brand || ingredients.length < 3) return null;
  const n = (p.nutriments && typeof p.nutriments === 'object' ? p.nutriments : {}) as Record<
    string,
    unknown
  >;
  const unit: 'g' | 'ml' = p.product_quantity_unit === 'ml' ? 'ml' : 'g';
  const nova =
    typeof p.nova_group === 'number' &&
    Number.isInteger(p.nova_group) &&
    p.nova_group >= 1 &&
    p.nova_group <= 4
      ? p.nova_group
      : null;
  return {
    status: 'unverified' as const,
    name,
    brand,
    quantity: text(p.quantity),
    category_slug: 'necunoscut',
    unit,
    portion_label: `100 ${unit}`,
    kcal: num(n['energy-kcal_100g']),
    fat: num(n.fat_100g),
    sat: num(n['saturated-fat_100g']),
    sugar: num(n.sugars_100g),
    salt: num(n.salt_100g),
    protein: num(n.proteins_100g),
    fiber: num(n.fiber_100g),
    fruit_veg_pct: null,
    ingredients_text: ingredients,
    allergens: detectAllergens(ingredients).allergens,
    may_contain: [] as string[],
    source: 'Open Food Facts',
    added_by_device: null,
    nova_group: nova,
    nova_source: nova === null ? null : ('off' as const),
  };
}
