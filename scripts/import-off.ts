import { pathToFileURL } from 'node:url';
import { ALLERGENS, AddProductRequest, detectAllergens, normalizeCode, type Allergen } from '../packages/shared/src/index';
import { existingCodes, upsert } from './load-data';

export type OffProduct = {
  code?: string; product_name?: string; product_name_ro?: string; brands?: string; quantity?: string;
  ingredients_text?: string; ingredients_text_ro?: string; lang?: string; nutrition_data_per?: string;
  nutriments?: Record<string, unknown>; allergens_tags?: string[]; traces_tags?: string[];
};
type Pause = (ms: number) => Promise<void>;

// Open Food Facts search API v2: products sold in Moldova (local and imported).
// The barcode-prefix search (codes_tags=484x...) was dropped: OFF answers it with 503 most of the time.
const PAGE_SIZE = 100;
const FIELDS = 'code,product_name,product_name_ro,brands,quantity,ingredients_text,ingredients_text_ro,lang,' +
  'nutrition_data_per,nutriments,allergens_tags,traces_tags';
const SEARCH = `https://world.openfoodfacts.org/api/v2/search?fields=${FIELDS}&page_size=${PAGE_SIZE}&countries_tags=en:moldova`;
// OFF answers 401 past 1000 results of one search, so the 1928 Moldova products (8 Nov 2026) are split by
// label language into searches of 577, 316, 860 and about 175 results.
const LANGUAGES = ['en:romanian', '-en:romanian,en:russian', '-en:romanian,-en:russian,en:english',
  '-en:romanian,-en:russian,-en:english'];
const USER_AGENT = 'OkBite/0.1 (product import)'; // OFF asks every client to name itself
const PAUSE_MS = 6500; // OFF allows 10 search requests a minute

// Same provider, model and request shape as supabase/functions/_lib/claude.ts, text only.
const AI_URL = 'https://tokenharbor.ai/v1/chat/completions';
const AI_MODEL = 'deepseek-v4.1-flash:free'; // override with AI_MODEL
const AI_RETRYABLE = new Set([408, 429, 500, 502, 503, 504, 529]);
const AI_TRIES = 5;
const AI_PAUSE_MS = 3000; // shortcut: the free model's rate limit is undocumented; 429s wait out retry-after
const TRANSLATED = 'Open Food Facts (tradus automat)';
const PROMPT = 'Tradu în limba română lista de ingrediente de mai jos, de pe eticheta unui produs alimentar. ' +
  'Păstrează ordinea, procentele, codurile E și mențiunile „poate conține”. ' +
  'Răspunde doar cu textul tradus, fără ghilimele sau explicații.';

// OFF allergen taxonomy ids for the 14 allergens of Reg. (UE) nr. 1169/2011, Anexa II.
const OFF_ALLERGENS: Record<string, Allergen> = {
  'en:gluten': 'Gluten', 'en:crustaceans': 'Crustacee', 'en:eggs': 'Ouă', 'en:fish': 'Pește',
  'en:peanuts': 'Arahide', 'en:soybeans': 'Soia', 'en:milk': 'Lapte', 'en:nuts': 'Fructe cu coajă lemnoasă',
  'en:celery': 'Țelină', 'en:mustard': 'Muștar', 'en:sesame-seeds': 'Susan',
  'en:sulphur-dioxide-and-sulphites': 'Dioxid de sulf și sulfiți', 'en:lupin': 'Lupin', 'en:molluscs': 'Moluște',
};

const amount = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const text = (...values: (string | undefined)[]) => values.map((v) => v?.trim()).find((v) => v) ?? '';
const sleep: Pause = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Maps one OFF product to an unverified OkBite product, or null when it has no name,
 * fails the barcode checksum, or lacks what the contract requires (a brand, ingredients text of 3+ characters).
 * Only Romanian ingredients text is taken: the allergen matcher reads Romanian, so English or Russian text would
 * show "no allergens" for a product that has them. importOff translates those first.
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

/**
 * The products row for a mapped OFF product. Allergens come from the D3 matcher like shopper additions, plus
 * OFF's own allergen and trace tags as a safety net (a translation can drop a word the matcher needs).
 */
export function toRow(p: AddProductRequest, tags: Pick<OffProduct, 'allergens_tags' | 'traces_tags'> = {}, source = 'Open Food Facts') {
  const found = detectAllergens(p.ingredientsText);
  const fromOff = (t?: string[]) => (t ?? []).flatMap((id) => OFF_ALLERGENS[id] ?? []);
  const contains = new Set([...found.allergens, ...fromOff(tags.allergens_tags)]);
  const traces = new Set([...found.mayContain, ...fromOff(tags.traces_tags)]);
  const n = p.nutrients;
  return {
    code: p.code, status: 'unverified', name: p.name, brand: p.brand, quantity: p.quantity,
    category_slug: p.categorySlug, unit: p.unit, portion_label: `100 ${p.unit}`,
    kcal: n.kcal, fat: n.fat, sat: n.sat, sugar: n.sugar, salt: n.salt, protein: n.protein, fiber: n.fiber,
    fruit_veg_pct: n.fruitVegPct, ingredients_text: p.ingredientsText,
    allergens: ALLERGENS.filter((a) => contains.has(a)),
    may_contain: ALLERGENS.filter((a) => traces.has(a) && !contains.has(a)),
    source,
  };
}

/**
 * Romanian ingredients text from the model, or null when it gives no complete answer.
 * Throws when the provider refuses the request or stays busy, so the import stops and can resume.
 */
export async function translateIngredients(source: string, key: string, pause: Pause = sleep): Promise<string | null> {
  const body = JSON.stringify({
    model: process.env.AI_MODEL || AI_MODEL,
    max_tokens: 4000, // room for the model's reasoning before the answer
    messages: [{ role: 'user', content: [{ type: 'text', text: `${PROMPT}\n\n${source}` }] }],
  });
  for (let tries = 1; ; tries++) {
    let res: Response | null = null;
    try {
      res = await fetch(AI_URL, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body,
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      res = null; // network failure or timeout: retried like a 5xx
    }
    if (res?.ok) {
      const answer = (await res.json().catch(() => null)) as
        { choices?: { finish_reason?: string; message?: { content?: unknown } }[] } | null;
      const choice = answer?.choices?.[0];
      if (choice?.finish_reason !== 'stop' || typeof choice.message?.content !== 'string') return null;
      return choice.message.content.trim().replace(/^```\w*\s*|\s*```$/g, '') || null;
    }
    if ((res && !AI_RETRYABLE.has(res.status)) || tries >= AI_TRIES) {
      throw new Error(`translation: ${res ? `HTTP ${res.status}` : 'no response'}`);
    }
    const after = Number(res?.headers.get('retry-after'));
    await pause(after > 0 ? Math.min(after, 60) * 1000 : AI_PAUSE_MS * 2 ** tries);
  }
}

/**
 * Pages through OFF and inserts new codes; existing codes are skipped, so a second run inserts 0.
 * Products without Romanian ingredients are translated once with AI_API_KEY; codes already saved are not re-sent.
 */
export async function importOff(pause: Pause = sleep) {
  const key = process.env.AI_API_KEY;
  const n = { mapped: 0, inserted: 0, translated: 0, untranslated: 0 };
  const incomplete = (why: string) => new Error(`Open Food Facts import incomplete (${n.mapped} usable, ${n.inserted} new, ` +
    `${n.translated} translated; re-run to resume): ${why}`);
  let requests = 0;
  for (const languages of LANGUAGES) {
    for (let page = 1; ; page++) {
      if (requests++) await pause(PAUSE_MS);
      const get = () => fetch(`${SEARCH}&languages_tags=${languages}&page=${page}`, { headers: { 'user-agent': USER_AGENT } });
      let res = await get();
      // OFF often answers 503/429 under load; wait longer each time, then give up (a re-run resumes safely).
      for (let tries = 1; (res.status === 503 || res.status === 429) && tries < 4; tries++) {
        await pause(PAUSE_MS * tries);
        res = await get();
      }
      if (!res.ok) throw incomplete(`${languages} page ${page}: HTTP ${res.status}`);
      const { products = [], count = 0 } = (await res.json()) as { products?: OffProduct[]; count?: number };

      const rows: ReturnType<typeof toRow>[] = [];
      const foreign: { off: OffProduct; code: string }[] = [];
      for (const off of products) {
        const m = mapOffProduct(off);
        // Usable once translated: only the Romanian ingredients text is missing.
        const probe = m ? null : text(off.ingredients_text).length >= 3 && mapOffProduct({ ...off, ingredients_text_ro: 'tbd' });
        if (m) rows.push(toRow(m, off));
        else if (probe) foreign.push({ off, code: probe.code! });
      }
      n.mapped += rows.length;

      let failure: Error | null = null;
      if (foreign.length && !key) n.untranslated += foreign.length;
      else if (foreign.length) {
        const saved = await existingCodes(foreign.map((f) => f.code));
        n.mapped += saved.size;
        for (const { off } of foreign.filter((f) => !saved.has(f.code))) {
          await pause(AI_PAUSE_MS);
          let ro: string | null;
          try {
            ro = await translateIngredients(text(off.ingredients_text), key!, pause);
          } catch (e) {
            failure = e as Error;
            break;
          }
          const m = ro ? mapOffProduct({ ...off, ingredients_text_ro: ro }) : null;
          if (m) { rows.push(toRow(m, off, TRANSLATED)); n.mapped++; n.translated++; } else n.untranslated++;
        }
      }
      n.inserted += await upsert('products', rows, 'code', true); // save translations before stopping on a failure
      if (failure) throw incomplete(failure.message);
      console.log(`${languages} page ${page}: ${n.mapped} usable, ${n.inserted} new, ${n.translated} translated`);
      if (products.length < PAGE_SIZE || (count > 0 && page * PAGE_SIZE >= count)) break;
    }
  }
  return n;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  importOff().then(
    ({ mapped, inserted, translated, untranslated }) => console.log(
      `Open Food Facts: ${mapped} usable products, ${inserted} new, ${translated} translated to Romanian` +
      (untranslated ? `, ${untranslated} skipped${process.env.AI_API_KEY ? ' (no usable translation)' : ' (set AI_API_KEY to translate them)'}` : '')),
    (e: Error) => { console.error(e.message); process.exitCode = 1; },
  );
}
