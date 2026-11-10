import { pathToFileURL } from 'node:url';
import { CategoryEntry, IngredientEntry } from '../packages/shared/src/index';
import { checkData, checkReadiness, readData, type DataFiles } from './check-data';

/**
 * POSTs rows to Supabase's REST API with the service-role key from the environment.
 * Returns how many rows were written: with ignoreExisting, rows whose key already exists are skipped and not counted.
 */
export async function upsert(table: string, rows: object[], conflict: string, ignoreExisting = false): Promise<number> {
  const { url, headers } = service();
  if (!rows.length) return 0;
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=${conflict}`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
      prefer: `resolution=${ignoreExisting ? 'ignore' : 'merge'}-duplicates,return=representation`,
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  return ((await res.json()) as unknown[]).length;
}

/** Which of these product codes are already in the database (codes are digits only, safe in the filter). */
export async function existingCodes(codes: string[]): Promise<Set<string>> {
  const { url, headers } = service();
  if (!codes.length) return new Set();
  const res = await fetch(`${url}/rest/v1/products?select=code&code=in.(${codes.join(',')})`, { headers });
  if (!res.ok) throw new Error(`products: HTTP ${res.status} ${await res.text()}`);
  return new Set(((await res.json()) as { code: string }[]).map((r) => r.code));
}

function service() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  // New sb_secret_ keys are not JWTs and go in apikey only; legacy service_role JWTs also need the bearer.
  return { url, headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }) } };
}

/** Upserts the checked categories and ingredients; refuses to write anything while data:check reports errors. */
export async function loadData(data: DataFiles = readData(), options: { release?: boolean } = {}): Promise<{ categories: number; ingredients: number }> {
  const { errors } = options.release ? checkReadiness(data) : checkData(data);
  if (errors.length) throw new Error(`data:check found ${errors.length} errors, nothing loaded:\n${errors.join('\n')}`);
  const categories = CategoryEntry.array().parse(data.categories)
    .map(({ slug, name, scoreKind }) => ({ slug, name, score_kind: scoreKind }));
  const ingredients = IngredientEntry.array().parse(data.ingredients).map((i) => ({
    slug: i.slug, name: i.name, aliases: i.aliases, grp: i.group, role: i.role,
    explanation: i.explanation, source: i.source, allergen: i.allergen,
  }));
  return {
    categories: await upsert('categories', categories, 'slug'),
    ingredients: await upsert('ingredients', ingredients, 'slug'),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  loadData(readData(), { release: process.argv.includes('--release') }).then(
    (counts) => console.log(`categories: ${counts.categories}, ingredients: ${counts.ingredients}`),
    (e: Error) => { console.error(e.message); process.exitCode = 1; },
  );
}
