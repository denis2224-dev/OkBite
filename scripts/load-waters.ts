import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  Code,
  WaterProfile,
  emptyWaterProfile,
  normalizeCode,
  type WaterProfile as WaterProfileType,
} from '../packages/shared/src/index';

export const WaterCatalogEntry = z.object({
  brand: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().min(1).max(30),
  code: Code.nullable(),
  water: WaterProfile.partial().nullable(),
  source: z.string().trim().min(1).max(160),
  sourceUrl: z.string().url().refine((u) => u.startsWith('https://'), 'expected an https URL'),
  ingredientsText: z.string().max(3000).default(''),
});
export type WaterCatalogEntry = z.infer<typeof WaterCatalogEntry>;

function fullWater(w: WaterCatalogEntry['water']): WaterProfileType | null {
  return w ? WaterProfile.parse({ ...emptyWaterProfile(), ...w }) : null;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function checkWaterCatalog(raw: unknown[]): string[] {
  const errors: string[] = [];
  const seenCodes = new Set<string>();
  const seenIdentity = new Set<string>();

  for (const [i, item] of raw.entries()) {
    const parsed = WaterCatalogEntry.safeParse(item);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`waters-md.json[${i}]: ${issue.path.join('.')} ${issue.message}`);
      }
      continue;
    }
    const e = parsed.data;
    if (e.code !== null) {
      if (normalizeCode(e.code) !== e.code) errors.push(`waters-md.json[${i}] ${e.code}: invalid checksum`);
      if (seenCodes.has(e.code)) errors.push(`waters-md.json[${i}] ${e.code}: duplicate code`);
      seenCodes.add(e.code);
    }
    const key = `${norm(e.brand)}|${norm(e.name)}|${norm(e.quantity)}`;
    if (seenIdentity.has(key)) errors.push(`waters-md.json[${i}] ${e.brand} ${e.name}: duplicate variant SKU`);
    seenIdentity.add(key);
  }
  return errors;
}

export function toWaterProductRows(entries: readonly WaterCatalogEntry[]) {
  return entries.map((e) => ({
    code: e.code,
    status: 'unverified' as const,
    name: e.name,
    brand: e.brand,
    quantity: e.quantity,
    category_slug: 'apa',
    unit: 'ml' as const,
    portion_amount: 100,
    portion_label: '100 ml',
    kcal: null,
    fat: null,
    sat: null,
    sugar: null,
    salt: null,
    protein: null,
    fiber: null,
    fruit_veg_pct: null,
    water: fullWater(e.water),
    ingredients_text: e.ingredientsText,
    allergens: [] as string[],
    may_contain: [] as string[],
    source: `${e.source} (${e.sourceUrl})`,
  }));
}

function service() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return { url, headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { authorization: `Bearer ${key}` }) } };
}

export async function loadWaters(entries?: readonly WaterCatalogEntry[]): Promise<{ coded: number; uncodedInserted: number }> {
  const list =
    entries ??
    WaterCatalogEntry.array().parse(
      JSON.parse(readFileSync(join(import.meta.dirname, '..', 'data', 'waters-md.json'), 'utf8')),
    );
  const errors = checkWaterCatalog(list as unknown[]);
  if (errors.length) throw new Error(`waters-md validation failed:\n${errors.join('\n')}`);

  const rows = toWaterProductRows(list);
  const coded = rows.filter((r) => r.code !== null);
  const uncoded = rows.filter((r) => r.code === null);
  const { url, headers } = service();

  let codedCount = 0;
  if (coded.length) {
    const res = await fetch(`${url}/rest/v1/products?on_conflict=code`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(coded),
    });
    if (!res.ok) throw new Error(`waters coded upsert failed: ${res.status}`);
    codedCount = ((await res.json()) as unknown[]).length;
  }

  let uncodedInserted = 0;
  if (uncoded.length) {
    const existingRes = await fetch(
      `${url}/rest/v1/products?select=brand,name,quantity&code=is.null&category_slug=eq.apa`,
      { headers },
    );
    if (!existingRes.ok) throw new Error(`waters existing fetch failed: ${existingRes.status}`);
    const existing = ((await existingRes.json()) as { brand: string; name: string; quantity: string }[]).map(
      (r) => `${norm(r.brand)}|${norm(r.name)}|${norm(r.quantity)}`,
    );
    const have = new Set(existing);
    const missing = uncoded.filter((r) => !have.has(`${norm(r.brand)}|${norm(r.name)}|${norm(r.quantity)}`));
    if (missing.length) {
      const ins = await fetch(`${url}/rest/v1/products`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json', prefer: 'return=representation' },
        body: JSON.stringify(missing),
      });
      if (!ins.ok) throw new Error(`waters uncoded insert failed: ${ins.status}`);
      uncodedInserted = ((await ins.json()) as unknown[]).length;
    }
  }
  return { coded: codedCount, uncodedInserted };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const path = join(import.meta.dirname, '..', 'data', 'waters-md.json');
  if (!existsSync(path)) throw new Error('data/waters-md.json missing');
  loadWaters().then(
    (counts) => console.log(`coded: ${counts.coded}, uncodedInserted: ${counts.uncodedInserted}`),
    (e: Error) => { console.error(e.message); process.exitCode = 1; },
  );
}
