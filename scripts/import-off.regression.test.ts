import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importOff, translateIngredients, type OffProduct } from './import-off';

const native: OffProduct = {
  code: '4840001000014',
  product_name: 'Fixture',
  brands: 'Fixture',
  lang: 'ro',
  ingredients_text: 'lapte, zahăr',
};
const foreign: OffProduct = {
  ...native,
  code: '4840001000021',
  lang: 'ru',
  ingredients_text: 'молоко, сахар',
};
const response = (content: unknown) =>
  Response.json({ choices: [{ finish_reason: 'stop', message: { content } }] });
const translated = () => response(JSON.stringify(['lapte', 'zahăr']));
const noPause = async () => {};
let cache: string;
let dir: string;
let written: Record<string, unknown>[];
let ai: ReturnType<typeof vi.fn<() => Response>>;
let databaseFails: boolean;

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'http://db.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_fixture');
  vi.stubEnv('AI_API_KEY', 'fixture');
  mkdirSync('.superpowers', { recursive: true });
  dir = mkdtempSync('.superpowers/pr85-');
  cache = `${dir}/translations.json`;
  written = [];
  ai = vi.fn(translated);
  databaseFails = false;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(dir, { recursive: true, force: true });
});
function services(products: OffProduct[]) {
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.includes('openfoodfacts'))
      return Response.json({
        products: new URL(url).searchParams.get('languages_tags') === 'en:romanian' ? products : [],
      });
    if (url.includes('tokenharbor')) return ai();
    const headers = new Headers(init?.headers);
    expect(headers.get('apikey')).toBe('sb_secret_fixture');
    expect(headers.has('authorization')).toBe(false);
    if (init?.method !== 'POST') return Response.json([]);
    expect(headers.get('prefer')).toContain('resolution=ignore-duplicates');
    if (databaseFails) return new Response('offline', { status: 503 });
    const rows = JSON.parse(String(init.body));
    written.push(...rows);
    return Response.json(rows);
  });
}

describe('translation validation', () => {
  it.each([
    ['a refusal', 'I cannot translate this label'],
    ['missing segments', JSON.stringify(['lapte'])],
    ['an untranslated answer', JSON.stringify(['молоко', 'сахар'])],
    ['empty segments', JSON.stringify(['lapte', ''])],
    ['invalid JSON', '{bad'],
  ])('rejects %s', async (_reason, content) => {
    vi.stubGlobal('fetch', async () => response(content));
    expect(await translateIngredients('молоко, сахар', 'fixture', noPause)).toBeNull();
  });
  it('accepts complete Romanian segments and preserves separators', async () => {
    vi.stubGlobal('fetch', async () => translated());
    expect(await translateIngredients('молоко, сахар', 'fixture', noPause)).toBe('lapte, zahăr');
  });
  it.each([
    ['milk 2.5%, E322', ['lapte', 'E322']],
    ['milk, may contain eggs', ['lapte', 'ouă']],
    ['milk, E322', ['lapte', '322']],
    ['milk 2.5%', ['lapte 2,5']],
  ])('rejects lost quantities or trace clauses in %s', async (source, parts) => {
    vi.stubGlobal('fetch', async () => response(JSON.stringify(parts)));
    expect(await translateIngredients(source, 'fixture', noPause)).toBeNull();
  });
  it('accepts decimal comma translations without changing quantities or E codes', async () => {
    vi.stubGlobal('fetch', async () => response(JSON.stringify(['lapte 2,5%', 'E322'])));
    expect(await translateIngredients('milk 2.5%, E322', 'fixture', noPause)).toBe(
      'lapte 2,5%, E322',
    );
  });
  it('does not shorten a provider retry-after beyond 60 seconds', async () => {
    let attempt = 0;
    vi.stubGlobal('fetch', async () =>
      attempt++
        ? translated()
        : new Response(null, { status: 429, headers: { 'retry-after': '120' } }),
    );
    const pause = vi.fn(noPause);
    await translateIngredients('молоко, сахар', 'fixture', pause);
    expect(pause).toHaveBeenCalledWith(120000);
  });
});

describe('resumable import', () => {
  it('deduplicates codes before translation and saves each translation immediately', async () => {
    services([foreign, foreign, { ...foreign, code: '5901234123457' }]);
    ai.mockImplementation(() => {
      expect(written).toHaveLength(ai.mock.calls.length - 1);
      return translated();
    });
    await importOff(noPause, cache);
    expect(ai).toHaveBeenCalledTimes(2);
    expect(written).toHaveLength(2);
    expect(written[0]).toMatchObject({
      status: 'unverified',
      source: 'Open Food Facts (tradus automat)',
    });
  });
  it('saves Romanian rows before a database lookup for foreign rows fails', async () => {
    services([native, foreign]);
    const fetcher = fetch;
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) =>
      url.includes('select=code') ? new Response(null, { status: 401 }) : fetcher(url, init),
    );
    await expect(importOff(noPause, cache)).rejects.toThrow('401');
    expect(written).toHaveLength(1);
    expect(ai).not.toHaveBeenCalled();
  });
  it('reuses a durable translation after a failed insert, without paying again', async () => {
    services([foreign]);
    databaseFails = true;
    await expect(importOff(noPause, cache)).rejects.toThrow('503');
    databaseFails = false;
    await importOff(noPause, cache);
    expect(ai).toHaveBeenCalledTimes(1);
    expect(written).toHaveLength(1);
  });
  it('validates database configuration before calling OFF or AI', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    await expect(importOff(noPause, cache)).rejects.toThrow('SUPABASE_URL');
    expect(network).not.toHaveBeenCalled();
  });
  it('reports partitions beyond the pagination cap instead of silently losing coverage', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ count: 1001, products: [native] }));
    await expect(importOff(noPause, cache)).rejects.toThrow('1000');
  });
  it('reports malformed OFF pages as incomplete instead of treating them as empty', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'temporarily unavailable' }));
    await expect(importOff(noPause, cache)).rejects.toThrow('incomplete');
  });
  it('rejects invalid OFF field types before spending on translations', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({ products: [foreign, { ...native, ingredients_text_ro: 42 }] }),
    );
    await expect(importOff(noPause, cache)).rejects.toThrow('invalid OFF response');
    expect(ai).not.toHaveBeenCalled();
  });
  it('never updates existing verified rows, including an insert race', async () => {
    const verified = {
      code: foreign.code,
      status: 'verified',
      ingredients_text: 'checked by team',
    };
    const before = { ...verified };
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (url.includes('openfoodfacts'))
        return Response.json({
          products:
            new URL(url).searchParams.get('languages_tags') === 'en:romanian' ? [foreign] : [],
        });
      if (url.includes('tokenharbor')) return ai();
      // Simulate a verified row appearing after the pre-translation lookup.
      if (init?.method !== 'POST') {
        expect(new Headers(init?.headers).get('apikey')).toBe('sb_secret_fixture');
        return Response.json([]);
      }
      const headers = new Headers(init.headers);
      if (!headers.get('prefer')?.includes('resolution=ignore-duplicates'))
        Object.assign(verified, JSON.parse(String(init.body))[0]);
      return Response.json([]);
    });
    expect(await importOff(noPause, cache)).toMatchObject({ inserted: 0 });
    expect(verified).toEqual(before);
  });
  it('honours OFF retry-after HTTP dates', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-08T12:00:00Z'));
    let attempt = 0;
    vi.stubGlobal('fetch', async () =>
      attempt++
        ? Response.json({ products: [] })
        : new Response(null, {
            status: 429,
            headers: { 'retry-after': 'Sun, 08 Nov 2026 12:02:00 GMT' },
          }),
    );
    const pause = vi.fn(noPause);
    await importOff(pause, cache);
    expect(pause).toHaveBeenCalledWith(120000);
    vi.restoreAllMocks();
  });
});
