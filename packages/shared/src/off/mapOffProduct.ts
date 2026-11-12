import { z } from 'zod';
import { ALLERGENS, AddProductRequest, type Allergen, type IngredientEntry } from '../contract';
import { detectAllergens } from '../allergens';
import { normalizeCode } from '../ean';

/** Open Food Facts product fields the mapper reads; ask OFF for exactly these. */
export const OFF_FIELDS =
  'code,product_name,product_name_ro,brands,quantity,ingredients_text,ingredients_text_ro,lang,' +
  'nutrition_data_per,product_quantity_unit,nutriments,categories_tags,allergens_tags,traces_tags,' +
  'nova_group,additives_tags';
export const OFF_USER_AGENT = 'OkBite/1.0 (https://github.com/denis2224-dev/OkBite)'; // OFF asks every client to name itself
export const OFF_SOURCE = 'Open Food Facts (ODbL)';

export const OffProduct = z.object({
  code: z.string().nullish(),
  product_name: z.string().nullish(),
  product_name_ro: z.string().nullish(),
  brands: z.string().nullish(),
  quantity: z.string().nullish(),
  ingredients_text: z.string().nullish(),
  ingredients_text_ro: z.string().nullish(),
  lang: z.string().nullish(),
  product_quantity_unit: z.string().nullish(),
  nutrition_data_per: z.string().nullish(),
  nutriments: z.record(z.unknown()).nullish(),
  categories_tags: z.array(z.string()).nullish(),
  allergens_tags: z.array(z.string()).nullish(),
  traces_tags: z.array(z.string()).nullish(),
  nova_group: z.unknown(), // anything but an integer 1..4 maps to processing null
  additives_tags: z.array(z.string()).nullish(),
});
export type OffProduct = z.infer<typeof OffProduct>;

/** Ingredient knowledge-base entries the additive tags are matched against (data/ingredients.json). */
export type AdditiveKey = Pick<IngredientEntry, 'slug' | 'aliases' | 'group'>;

// OFF allergen taxonomy ids for the 14 allergens of Reg. (UE) nr. 1169/2011, Anexa II.
const OFF_ALLERGENS: Record<string, Allergen> = {
  'en:gluten': 'Gluten',
  'en:crustaceans': 'Crustacee',
  'en:eggs': 'Ouă',
  'en:fish': 'Pește',
  'en:peanuts': 'Arahide',
  'en:soybeans': 'Soia',
  'en:milk': 'Lapte',
  'en:nuts': 'Fructe cu coajă lemnoasă',
  'en:celery': 'Țelină',
  'en:mustard': 'Muștar',
  'en:sesame-seeds': 'Susan',
  'en:sulphur-dioxide-and-sulphites': 'Dioxid de sulf și sulfiți',
  'en:lupin': 'Lupin',
  'en:molluscs': 'Moluște',
};

const OFF_CATEGORY_RULES: [RegExp, string][] = [
  [/\b(waters|mineral-waters|spring-waters|carbonated-waters)\b/, 'apa'],
  [/\b(juices-and-nectars|fruit-juices|vegetable-juices|nectars)\b/, 'suc'],
  [/\b(carbonated-drinks|sodas|colas|sweetened-beverages|artificially-sweetened-beverages|energy-drinks|iced-teas|soft-drinks)\b/, 'bauturi-racoritoare'],
  [/\b(yogurts|fermented-milk-products|kefir)\b/, 'iaurt'],
  [/\b(milks|flavored-milks)\b/, 'lapte'],
  [/\b(cheeses)\b/, 'branza'],
  [/\b(butters|creams|sour-creams)\b/, 'unt-si-smantana'],
  [/\b(biscuits|cookies|wafers)\b/, 'biscuiti'],
  [/\b(chocolates|candies|confectioneries|sweet-snacks)\b/, 'ciocolata-si-dulciuri'],
  [/\b(breakfast-cereals|cereals|oats|mueslis)\b/, 'cereale'],
  [/\b(breads|bakery-products)\b/, 'paine'],
  [/\b(poultry|chicken|turkey)\b/, 'mezeluri-pasare'],
  [/\b(meats|prepared-meats|sausages|hams|salamis)\b/, 'mezeluri'],
  [/\b(vegetable-oils|sunflower-oils|olive-oils|fats)\b/, 'ulei'],
  [/\b(salty-snacks|chips|crisps|crackers)\b/, 'snacks-sarate'],
  [/\b(ice-creams|sorbets)\b/, 'inghetata'],
  [/\b(canned-foods|tinned-foods)\b/, 'conserve'],
];

const amount = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const kcalFromKj = (kj: number | null) => (kj === null ? null : Math.round((kj / 4.184) * 10) / 10);
const text = (...values: (string | null | undefined)[]) =>
  values.map((v) => v?.trim()).find((v) => v) ?? '';
const eKey = (s: string) => s.replace(/^[a-z]{2}:/, '').replace(/[\s-]/g, '').toLowerCase();

export function inferCategorySlug(
  off: Pick<OffProduct, 'categories_tags'>,
  name: string,
  ingredientsText: string,
  unit: 'g' | 'ml',
): string {
  const joinedTags = (off.categories_tags ?? []).join(' ').toLowerCase();
  for (const [pattern, slug] of OFF_CATEGORY_RULES) if (pattern.test(joinedTags)) return slug;
  if (unit === 'ml') {
    const plain = `${name} ${ingredientsText}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (/\b(cola|pepsi|fanta|sprite|bautura racoritoare|energizant|dioxid de carbon|e290|aspartam|acesulfam|ciclamat|sucraloza|indulcitor)\b/.test(plain)) {
      return 'bauturi-racoritoare';
    }
  }
  return 'necunoscut';
}

/**
 * Maps one OFF product to an unverified OkBite product, or null when it has no name, fails the barcode
 * checksum, or lacks what the contract requires (a brand, ingredients text of 3+ characters).
 * Only Romanian ingredients text is taken: the allergen matcher reads Romanian, so English or Russian
 * text would show "no allergens" for a product that has them. Nutrients come only from OFF's per-100 g/ml
 * fields; a product with per-serving values only still maps, with those nutrients null (score unavailable).
 */
export function mapOffProduct(raw: unknown, ingredients: readonly AdditiveKey[] = []) {
  const parsed = OffProduct.safeParse(raw);
  if (!parsed.success) return null;
  const off = parsed.data;
  const code = off.code ? normalizeCode(off.code.trim()) : null;
  const name = text(off.product_name_ro, off.product_name);
  const brand = text(off.brands?.split(',')[0]).slice(0, 80);
  // The contract allows '' for a shopper's unreadable brand; imports still need a real one.
  if (!code || !name || !brand) return null;
  const n = off.nutriments ?? {};
  const unit = off.nutrition_data_per === '100ml' || off.product_quantity_unit === 'ml' ? 'ml' : 'g';
  const ingredientsText = text(off.ingredients_text_ro, off.lang === 'ro' ? off.ingredients_text : undefined);
  const product = AddProductRequest.safeParse({
    code,
    name: name.slice(0, 120),
    brand,
    quantity: text(off.quantity).slice(0, 30),
    unit,
    categorySlug: inferCategorySlug(off, name, ingredientsText, unit),
    ingredientsText,
    nutrients: {
      // Many labels declare kJ only; 1 kcal = 4.184 kJ (Reg. (UE) nr. 1169/2011, Anexa XIV). Unitless energy stays null.
      kcal: amount(n['energy-kcal_100g']) ?? kcalFromKj(amount(n['energy-kj_100g'])),
      fat: amount(n.fat_100g),
      sat: amount(n['saturated-fat_100g']),
      sugar: amount(n.sugars_100g),
      salt: amount(n.salt_100g),
      protein: amount(n.proteins_100g),
      fiber: amount(n.fiber_100g),
      fruitVegPct: null, // OFF only has an estimate from the ingredients list, not a declared value
    },
    photoPath: null,
    ingredientsPhotoPath: '',
    nutritionPhotoPath: null,
  });
  if (!product.success) return null;

  // The D3 matcher finds allergens like for shopper additions; OFF's own tags are a safety net
  // (a translation can drop a word the matcher needs).
  const found = detectAllergens(ingredientsText);
  const fromOff = (t?: string[] | null) => (t ?? []).flatMap((id) => OFF_ALLERGENS[id] ?? []);
  const contains = new Set([...found.allergens, ...fromOff(off.allergens_tags)]);
  const traces = new Set([...found.mayContain, ...fromOff(off.traces_tags)]);
  const nova = off.nova_group;
  const eCodes = new Set((off.additives_tags ?? []).map(eKey).filter((k) => /^e\d{3,4}[a-z]*$/.test(k)));
  const additives = [...eCodes].map((k) => ({
    code: `E${k.slice(1)}`,
    slug: ingredients.find((i) => i.group === 'add' && i.aliases.some((a) => eKey(a) === k))?.slug ?? null,
  }));
  return {
    ...product.data,
    code, // non-null: checked above
    allergens: ALLERGENS.filter((a) => contains.has(a)),
    mayContain: ALLERGENS.filter((a) => traces.has(a) && !contains.has(a)),
    processing:
      typeof nova === 'number' && Number.isInteger(nova) && nova >= 1 && nova <= 4
        ? { level: nova, source: 'off' as const }
        : null,
    additives, // slug null = an E-number not in our knowledge base yet
    source: OFF_SOURCE,
    sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
  };
}
export type OffMapped = NonNullable<ReturnType<typeof mapOffProduct>>;

/** The products insert row for a mapped OFF product. */
export function toRow(p: OffMapped, source: string = p.source) {
  const n = p.nutrients;
  return {
    code: p.code,
    status: 'unverified' as const,
    name: p.name,
    brand: p.brand,
    quantity: p.quantity,
    category_slug: p.categorySlug ?? 'necunoscut',
    unit: p.unit,
    portion_label: `100 ${p.unit}`,
    kcal: n.kcal,
    fat: n.fat,
    sat: n.sat,
    sugar: n.sugar,
    salt: n.salt,
    protein: n.protein,
    fiber: n.fiber,
    fruit_veg_pct: n.fruitVegPct,
    ingredients_text: p.ingredientsText,
    allergens: p.allergens,
    may_contain: p.mayContain,
    nova_group: p.processing?.level ?? null,
    nova_source: p.processing?.source ?? null,
    source,
  };
}
