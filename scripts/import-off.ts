import { pathToFileURL } from 'node:url';
import { AddProductRequest, detectAllergens, normalizeCode } from '../packages/shared/src/index';
import { upsert } from './load-data';

export type OffProduct = {
  code?: string; product_name?: string; product_name_ro?: string; brands?: string; quantity?: string;
  ingredients_text?: string; ingredients_text_ro?: string; lang?: string; nutrition_data_per?: string;
  nutriments?: Record<string, unknown>;
};

// Open Food Facts search API v2: products sold in Moldova (local and imported) that carry Romanian data.
// The barcode-prefix search (codes_tags=484x...) was dropped: OFF answers it with 503 most of the time.
const PAGE_SIZE = 100;
const FIELDS = 'code,product_name,product_name_ro,brands,quantity,ingredients_text,ingredients_text_ro,lang,nutrition_data_per,nutriments';
const SEARCH = `https://world.openfoodfacts.org/api/v2/search?fields=${FIELDS}&page_size=${PAGE_SIZE}` +
  '&countries_tags=en:moldova&languages_tags=en:romanian';
const USER_AGENT = 'OkBite/0.1 (product import)'; // OFF asks every client to name itself
const PAUSE_MS = 6500; // OFF allows 10 search requests a minute

const amount = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const text = (...values: (string | undefined)[]) => values.map((v) => v?.trim()).find((v) => v) ?? '';

/**
 * Maps one OFF product to an unverified OkBite product, or null when it has no name,
 * fails the barcode checksum, or lacks what the contract requires (a brand, ingredients text of 3+ characters).
 * Only Romanian ingredients text is taken: the allergen matcher reads Romanian, so English or Russian text would
 * show "no allergens" for a product that has them.
 */
export function mapOffProduct(off: OffProduct): AddProductRequest | null {
  const code = off.code ? normalizeCode(off.code.trim()) : null;
  const name = text(off.product_name_ro, off.product_name);
  if (!code || !name) return null;
  const n = off.nutriments ?? {};
  const unit = off.nutrition_data_per === '100ml' ? 'ml' : 'g';
  const result = AddProductRequest.safeParse({
    code, name: name.slice(0, 120), brand: text(off.brands?.split(',')[0]).slice(0, 80),
    quantity: text(off.quantity).slice(0, 30), unit, categorySlug: 'necunoscut',
    ingredientsText: text(off.ingredients_text_ro, off.lang === 'ro' ? off.ingredients_text : undefined),
    nutrients: {
      kcal: amount(n['energy-kcal_100g']), fat: amount(n.fat_100g), sat: amount(n['saturated-fat_100g']),
      sugar: amount(n.sugars_100g), salt: amount(n.salt_100g), protein: amount(n.proteins_100g),
      fiber: amount(n.fiber_100g),
      fruitVegPct: null, // OFF only has an estimate from the ingredients list, not a declared value
    },
    photoPath: null, ingredientsPhotoPath: '', nutritionPhotoPath: null,
  });
  return result.success ? result.data : null;
}

/** The products row for a mapped OFF product, with allergens from the D3 matcher like shopper additions. */
export function toRow(p: AddProductRequest) {
  const { allergens, mayContain } = detectAllergens(p.ingredientsText);
  const n = p.nutrients;
  return {
    code: p.code, status: 'unverified', name: p.name, brand: p.brand, quantity: p.quantity,
    category_slug: p.categorySlug, unit: p.unit, portion_label: `100 ${p.unit}`,
    kcal: n.kcal, fat: n.fat, sat: n.sat, sugar: n.sugar, salt: n.salt, protein: n.protein, fiber: n.fiber,
    fruit_veg_pct: n.fruitVegPct, ingredients_text: p.ingredientsText, allergens, may_contain: mayContain,
    source: 'Open Food Facts',
  };
}

/** Pages through OFF and inserts new codes; existing codes are skipped, so a second run inserts 0. */
export async function importOff(pause = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  let mapped = 0;
  let inserted = 0;
  // shortcut: OFF answers 401 past 1000 results of one search (577 today); split the query if it ever grows past that.
  for (let page = 1; ; page++) {
    if (page > 1) await pause(PAUSE_MS);
    const get = () => fetch(`${SEARCH}&page=${page}`, { headers: { 'user-agent': USER_AGENT } });
    let res = await get();
    // OFF often answers 503/429 under load; wait longer each time, then give up (a re-run resumes safely).
    for (let tries = 1; (res.status === 503 || res.status === 429) && tries < 4; tries++) {
      await pause(PAUSE_MS * tries);
      res = await get();
    }
    if (!res.ok) {
      throw new Error(`Open Food Facts import incomplete (${mapped} usable, ${inserted} new; re-run to resume): page ${page}: HTTP ${res.status}`);
    }
    const { products = [], count = 0 } = (await res.json()) as { products?: OffProduct[]; count?: number };
    const rows = products.flatMap((p) => { const m = mapOffProduct(p); return m ? [toRow(m)] : []; });
    mapped += rows.length;
    inserted += await upsert('products', rows, 'code', true);
    if (products.length < PAGE_SIZE || (count > 0 && page * PAGE_SIZE >= count)) return { mapped, inserted };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  importOff().then(
    ({ mapped, inserted }) => console.log(`Open Food Facts: ${mapped} usable products, ${inserted} new`),
    (e: Error) => { console.error(e.message); process.exitCode = 1; },
  );
}
