import { pathToFileURL } from 'node:url';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { createGunzip } from 'node:zlib';
import { OffProduct, offNutrients } from '../packages/shared/src/off/mapOffProduct';

/**
 * Fills nutrients of OFF-imported products saved with none, from OFF's JSONL export.
 * Rows imported before the mapper read OFF's schema-1004 `nutrition.aggregated_set` got every nutrient null.
 * Only unverified, non-shopper rows whose nutrients are all still null are touched, and only nutrient columns.
 */
const NUTRIENTS = ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber'] as const;
const EMPTY = NUTRIENTS.map((c) => `${c}=is.null`).join('&');
const TARGET = `source=like.Open%20Food%20Facts*&status=eq.unverified&added_by_device=is.null&${EMPTY}`;
type Patch = Partial<Record<(typeof NUTRIENTS)[number], number>>;

/** The nutrient columns to set for one export line, or null when it is not a target code or OFF has none. */
export function patchFor(
  line: string,
  codes: ReadonlySet<string>,
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

async function emptyCodes(): Promise<Set<string>> {
  const { url, headers } = service();
  const codes = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/products?select=code&${TARGET}&order=code`, {
      headers: { ...headers, range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`products: HTTP ${res.status} ${await res.text()}`);
    const page = (await res.json()) as { code: string }[];
    page.forEach((r) => codes.add(r.code));
    if (page.length < 1000) return codes;
  }
}

async function save(code: string, patch: Patch) {
  const { url, headers } = service();
  // The same filter again: a row a shopper or moderator changed meanwhile is left alone.
  const res = await fetch(`${url}/rest/v1/products?code=eq.${code}&${TARGET}`, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status} ${await res.text()}`);
}

export async function backfill(file: string, write: boolean) {
  const codes = await emptyCodes();
  console.log(`${codes.size} OFF rows have no nutrients`);
  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let found = 0;
  let saved = 0;
  let pending: Promise<void>[] = [];
  for await (const line of lines) {
    const hit = patchFor(line, codes);
    if (!hit) continue;
    codes.delete(hit.code); // the export can list a code twice; patch once
    found++;
    if (write) pending.push(save(hit.code, hit.patch).then(() => void saved++));
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
    options: { file: { type: 'string' }, write: { type: 'boolean', default: false } },
  });
  if (!values.file) throw new Error('--file <openfoodfacts-products.jsonl.gz> is required');
  const write = values.write ?? false;
  if (!write) console.log('Dry run: nothing is written. Add --write to save.');
  backfill(values.file, write).then(
    ({ found, saved, rest }) =>
      console.log(
        write
          ? `${saved} of ${found} rows got nutrients; ${rest} have none in the export either`
          : `${found} rows would get nutrients; ${rest} have none in the export either`,
      ),
    (e: Error) => {
      console.error(e.message);
      process.exitCode = 1;
    },
  );
}
