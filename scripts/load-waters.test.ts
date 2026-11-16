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

  it('rejects bad EAN checksums, duplicate coded barcodes, and non-HTTPS sources', () => {
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
    expect(checkWaterCatalog([{ ...sample, sourceUrl: 'http://example.com' }]).length).toBeGreaterThan(0);
  });

  it('loads coded SKUs via upsert and skips already-present code=null variants idempotently', async () => {
    const entries = WaterCatalogEntry.array().parse([
      {
        brand: 'Morshynska', name: 'Naturală plată', quantity: '6 L', code: '4820017000277',
        water: null, source: 'Oscar', sourceUrl: 'https://morshynska.ua/about/', ingredientsText: '',
      },
      {
        brand: 'OM', name: 'Apă potabilă plată', quantity: '500 ml', code: null,
        water: null, source: 'Rusnac', sourceUrl: 'https://rusnac.md/ro/branduri/', ingredientsText: '',
      },
    ]);
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('select=brand,name,quantity')) {
        return { ok: true, json: async () => [{ brand: 'OM', name: 'Apă potabilă plată', quantity: '500 ml' }] };
      }
      if (u.includes('on_conflict=code')) {
        return { ok: true, json: async () => JSON.parse(init?.body as string) };
      }
      return { ok: true, json: async () => [] };
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');

    const rows = toWaterProductRows(entries);
    expect(rows[0]).toMatchObject({ category_slug: 'apa', unit: 'ml', status: 'unverified', code: '4820017000277' });

    const res = await loadWaters(entries);
    expect(res).toEqual({ coded: 1, uncodedInserted: 0 });
  });
});
