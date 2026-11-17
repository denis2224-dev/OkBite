import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkWaterCatalog, loadWaters, toWaterProductRows, WaterCatalogEntry } from './load-waters';

describe('waters-md catalog & loader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('validates the checked Moldova water catalog cleanly with zero errors', () => {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'data', 'waters-md.json'), 'utf8')) as unknown[];
    expect(raw.length).toBeGreaterThanOrEqual(20);
    expect(checkWaterCatalog(raw)).toEqual([]);
  });

  it('rejects bad EAN checksums, duplicate coded barcodes, equivalent-unit duplicates, and non-HTTPS sources', () => {
    const sample = WaterCatalogEntry.parse({
      brand: 'OM',
      name: 'Apă potabilă plată',
      quantity: '500 ml',
      code: '4840001000014',
      water: {
        tdsMgL: 375, dryResidueMgL: 305, ph: null, carbonation: 'still', classification: 'drinking',
        caMgL: 32.5, mgMgL: 12.5, naMgL: null, kMgL: null, naPlusKMgL: 72.5,
        hco3MgL: 140, so4MgL: null, clMgL: 15.5, fMgL: null, no3MgL: null, bMgL: null, h3bo3MgL: null, iUgL: null,
      },
      source: 'Rusnac-MoldAqua SRL',
      sourceUrl: 'https://rusnac.md/ro/branduri/',
      ingredientsText: '',
    });
    expect(checkWaterCatalog([sample])).toEqual([]);
    expect(checkWaterCatalog([{ ...sample, code: '4840001000017' }]).length).toBeGreaterThan(0);
    expect(checkWaterCatalog([sample, sample]).length).toBeGreaterThan(0);
    expect(checkWaterCatalog([
      { ...sample, code: null, quantity: '1,5 L' },
      { ...sample, code: null, quantity: '1500 ml' },
    ]).length).toBeGreaterThan(0);
    expect(checkWaterCatalog([{ ...sample, sourceUrl: 'http://example.com' }]).length).toBeGreaterThan(0);
  });

  it('uses ignore-duplicates on coded SKUs, normalizes code=null pack sizes, preserves verified/enriched DB rows on rerun, and stamps field provenance', async () => {
    const entries = WaterCatalogEntry.array().parse([
      {
        brand: 'Morshynska', name: 'Naturală plată', quantity: '6 L', code: '4820017000277',
        water: { tdsMgL: 250, carbonation: 'still', classification: 'natural_mineral' },
        source: 'Oscar', sourceUrl: 'https://morshynska.ua/about/', ingredientsText: '',
      },
      {
        brand: 'OM', name: 'Apă potabilă plată', quantity: '1,5 L', code: null,
        water: { tdsMgL: 375, carbonation: 'still', classification: 'drinking' },
        source: 'Rusnac', sourceUrl: 'https://rusnac.md/ro/branduri/', ingredientsText: '',
      },
      {
        brand: 'Aqua', name: 'Moderated Verified', quantity: '500 ml', code: '4840001000014',
        water: { tdsMgL: 200, ph: 7.4 },
        source: 'Catalog', sourceUrl: 'https://example.md/catalog', ingredientsText: '',
      },
    ]);

    const rows = toWaterProductRows(entries);
    expect(rows[0]).toMatchObject({ category_slug: 'apa', unit: 'ml', status: 'unverified', code: '4820017000277' });
    expect(rows[0]?.water?.evidence?.tdsMgL).toEqual({
      status: 'unverified',
      source: 'Oscar (https://morshynska.ua/about/)',
    });
    expect(rows[0]?.water?.evidence?.ph).toBeUndefined();

    // Seeded stateful DB already contains 4840001000014 (verified + custom enriched water) and OM 1500 ml (unit variant).
    const dbCoded = new Map<string, Record<string, unknown>>([
      ['4840001000014', { code: '4840001000014', status: 'verified', source: 'Moderator Verified', water: { tdsMgL: 210, ph: 8.1 } }],
    ]);
    const dbUncoded: Record<string, unknown>[] = [
      { brand: 'OM', name: 'Apă potabilă plată', quantity: '1500 ml', status: 'hidden', source: 'Admin hidden', water: null },
    ];
    const preferHeaders: string[] = [];

    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('select=brand,name,quantity')) {
        return { ok: true, json: async () => dbUncoded };
      }
      if (u.includes('on_conflict=code')) {
        const headers = new Headers(init?.headers);
        preferHeaders.push(headers.get('prefer') ?? '');
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>[];
        const inserted: Record<string, unknown>[] = [];
        for (const r of body) {
          const code = String(r.code);
          if (!dbCoded.has(code)) {
            dbCoded.set(code, r);
            inserted.push(r);
          }
        }
        return { ok: true, json: async () => inserted };
      }
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>[];
        dbUncoded.push(...body);
        return { ok: true, json: async () => body };
      }
      return { ok: true, json: async () => [] };
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');

    // Run 1 inserts 1 new coded (skips pre-verified 4840001000014) and skips OM 1500 ml unit alias.
    const first = await loadWaters(entries);
    expect(first).toEqual({
      codedInserted: 1,
      codedSkipped: 1,
      uncodedInserted: 0,
      uncodedSkipped: 1,
    });
    expect(preferHeaders[0]).toContain('resolution=ignore-duplicates');
    expect(preferHeaders[0]).not.toContain('merge-duplicates');
    expect(dbCoded.get('4840001000014')).toEqual({
      code: '4840001000014', status: 'verified', source: 'Moderator Verified', water: { tdsMgL: 210, ph: 8.1 },
    });

    // Run 2 is 100% idempotent (inserts 0, skips all).
    const second = await loadWaters(entries);
    expect(second).toEqual({
      codedInserted: 0,
      codedSkipped: 2,
      uncodedInserted: 0,
      uncodedSkipped: 1,
    });
  });
});
