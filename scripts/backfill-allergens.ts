import { pathToFileURL } from 'node:url';
import { ALLERGENS, type Allergen } from '../packages/shared/src/contract';
import { detectAllergens } from '../packages/shared/src/allergens/index';

/**
 * Re-runs the allergen matcher over saved unverified products and ADDS what it now finds.
 * Needed after the matcher learns new words (e.g. the tree-nut group name "fructe cu coajă lemnoasă"):
 * rows saved earlier keep the allergens found back then.
 * Only adds: nothing is ever removed, so allergens taken from Open Food Facts' own tags stay.
 * Verified rows (checked by a person) are not touched.
 */
const TARGET = 'status=eq.unverified';
type Row = { code: string; ingredients_text: string; allergens: Allergen[]; may_contain: Allergen[] };
export type Patch = { allergens: Allergen[]; may_contain: Allergen[] };

const order = (set: Set<Allergen>) => ALLERGENS.filter((a) => set.has(a));

/** The columns to set for one row, or null when the matcher finds nothing new. */
export function allergenPatch(row: Row): Patch | null {
  const found = detectAllergens(row.ingredients_text);
  const contains = new Set([...row.allergens, ...found.allergens]);
  const traces = new Set([...row.may_contain, ...found.mayContain].filter((a) => !contains.has(a)));
  const next = { allergens: order(contains), may_contain: order(traces) };
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const had = { allergens: order(new Set(row.allergens)), may_contain: order(new Set(row.may_contain)) };
  return same(next.allergens, had.allergens) && same(next.may_contain, had.may_contain) ? null : next;
}

function service() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return { url, headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }) } };
}

async function rows(): Promise<Row[]> {
  const { url, headers } = service();
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/products?select=code,ingredients_text,allergens,may_contain&${TARGET}&order=code`, {
      headers: { ...headers, range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`products: HTTP ${res.status} ${await res.text()}`);
    const page = (await res.json()) as Row[];
    all.push(...page);
    if (page.length < 1000) return all;
  }
}

async function save(code: string, patch: Patch) {
  const { url, headers } = service();
  // The same filter again: a row a moderator verified meanwhile is left alone.
  const res = await fetch(`${url}/rest/v1/products?code=eq.${code}&${TARGET}`, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`${code}: HTTP ${res.status} ${await res.text()}`);
}

export async function backfill(write: boolean, list = false) {
  const all = await rows();
  const added: Record<string, number> = {};
  let changed = 0;
  let saved = 0;
  for (const row of all) {
    const patch = allergenPatch(row);
    if (!patch) continue;
    changed++;
    const fresh = [...patch.allergens, ...patch.may_contain].filter((a) => !row.allergens.includes(a) && !row.may_contain.includes(a));
    for (const a of fresh) added[a] = (added[a] ?? 0) + 1;
    if (list && fresh.length) console.log(`${row.code} +${fresh.join(', +')} | ${row.ingredients_text.slice(0, 140).replace(/\s+/g, ' ')}`);
    if (write) {
      await save(row.code, patch);
      saved++;
    }
  }
  return { scanned: all.length, changed, saved, added };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const write = process.argv.includes('--write');
  if (!write) console.log('Dry run: nothing is written. Add --write to save.');
  backfill(write, process.argv.includes('--list')).then(
    ({ scanned, changed, saved, added }) =>
      console.log(
        `${scanned} unverified rows scanned; ${write ? `${saved} of ${changed} updated` : `${changed} would be updated`}; ` +
          `new warnings: ${Object.entries(added).map(([a, n]) => `${a} ${n}`).join(', ') || 'none'}`,
      ),
    (e: Error) => {
      console.error(e.message);
      process.exitCode = 1;
    },
  );
}
