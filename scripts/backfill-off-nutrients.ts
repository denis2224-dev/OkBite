import { pathToFileURL } from 'node:url';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { createGunzip } from 'node:zlib';
import { OffProduct, inferCategorySlug, offImageUrl, offNutrients } from '../packages/shared/src/off/mapOffProduct';

/**
 * Fills nutrients of OFF-imported products saved with none, from OFF's JSONL export.
 * Rows imported before the mapper read OFF's schema-1004 `nutrition.aggregated_set` got every nutrient null.
 * Only unverified, non-shopper rows whose nutrients are all still null are touched, and only nutrient columns.
 * With --categories it instead re-infers category_slug of such rows in 'necunoscut' (no score) or
 * 'unt-si-smantana' (ice cream used to land there) from OFF's categories, using the importer's rules.
 * With --images it fills image_path of such rows saved without a photo with OFF's front-photo URL.
 */
const NUTRIENTS = ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber'] as const;
const EMPTY = NUTRIENTS.map((c) => `${c}=is.null`).join('&');
const OFF_ROWS = 'source=like.Open%20Food%20Facts*&status=eq.unverified&added_by_device=is.null';
const TARGETS = { nutrients: `${OFF_ROWS}&${EMPTY}`, categories: `${OFF_ROWS}&category_slug=in.(necunoscut,unt-si-smantana)`,
  images: `${OFF_ROWS}&image_path=is.null` };
export type Mode = keyof typeof TARGETS;
type Patch = Partial<Record<(typeof NUTRIENTS)[number], number>> | { category_slug: string } | { image_path: string };

/** The columns to set for one export line, or null when it is not a target code or OFF has nothing new. */
export function patchFor(
  line: string,
  codes: ReadonlySet<string>,
  mode: Mode = 'nutrients',
): { code: string; patch: Patch } | null {
  // Cheap filter before parsing ~4M lines: some quoted code on the line must be a target.
  if (![...line.matchAll(/"code":"(\d{8,14})"/g)].some((m) => codes.has(m[1]))) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  const off = OffProduct.safeParse(raw);
  const code = off.success ? off.data.code?.trim() : null;
  if (!off.success || !code || !codes.has(code)) return null;
  if (mode === 'images') {
    const url = offImageUrl(off.data, code);
    return url ? { code, patch: { image_path: url } } : null;
  }
  if (mode === 'categories') {
    const unit = off.data.nutrition_data_per === '100ml' || off.data.product_quantity_unit === 'ml' ? 'ml' : 'g';
    const slug = inferCategorySlug(off.data, off.data.product_name ?? '', off.data.ingredients_text_ro ?? '', unit);
    // unt-si-smantana rows are re-checked because en:ice-creams used to match its creams rule.
    return slug === 'necunoscut' || slug === 'unt-si-smantana' ? null : { code, patch: { category_slug: slug } };
  }
  const n = offNutrients(off.data);
  const patch = Object.fromEntries(
    NUTRIENTS.flatMap((c) => (n[c] === null ? [] : [[c, n[c]]])),
  ) as Patch;
  return Object.keys(patch).length ? { code, patch } : null;
}

function service() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return {
    url,
    headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }) },
  };
}

async function targetCodes(mode: Mode): Promise<Set<string>> {
  const { url, headers } = service();
  const codes = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/products?select=code&${TARGETS[mode]}&order=code`, {
      headers: { ...headers, range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`products: HTTP ${res.status} ${await res.text()}`);
    const page = (await res.json()) as { code: string }[];
    page.forEach((r) => codes.add(r.code));
    if (page.length < 1000) return codes;
  }
}

async function save(code: string, patch: Patch, mode: Mode) {
  const { url, headers } = service();
  // The same filter again: a row a shopper or moderator changed meanwhile is left alone.
  const res = await fetch(`${url}/rest/v1/products?code=eq.${code}&${TARGETS[mode]}`, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status} ${await res.text()}`);
}

export async function backfill(file: string, write: boolean, mode: Mode = 'nutrients') {
  const codes = await targetCodes(mode);
  console.log(`${codes.size} OFF rows have no ${{ nutrients: 'nutrients', categories: 'category', images: 'photo' }[mode]}`);
  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let found = 0;
  let saved = 0;
  let pending: Promise<void>[] = [];
  for await (const line of lines) {
    const hit = patchFor(line, codes, mode);
    if (!hit) continue;
    codes.delete(hit.code); // the export can list a code twice; patch once
    found++;
    if (write) pending.push(save(hit.code, hit.patch, mode).then(() => void saved++));
    if (pending.length === 10) {
      await Promise.all(pending);
      pending = [];
    }
  }
  await Promise.all(pending);
  return { found, saved, rest: codes.size };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { values } = parseArgs({
    options: { file: { type: 'string' }, write: { type: 'boolean', default: false },
      categories: { type: 'boolean', default: false }, images: { type: 'boolean', default: false },
    },
  });
  if (!values.file) throw new Error('--file <openfoodfacts-products.jsonl.gz> is required');
  const write = values.write ?? false;
  if (!write) console.log('Dry run: nothing is written. Add --write to save.');
  const mode: Mode = values.images ? 'images' : values.categories ? 'categories' : 'nutrients';
  const what = { nutrients: 'nutrients', categories: 'a category', images: 'a photo' }[mode];
  backfill(values.file, write, mode).then(
    ({ found, saved, rest }) =>
      console.log(
        write
          ? `${saved} of ${found} rows got ${what}; ${rest} have none from the export`
          : `${found} rows would get ${what}; ${rest} have none from the export`,
      ),
    (e: Error) => {
      console.error(e.message);
      process.exitCode = 1;
    },
  );
}
