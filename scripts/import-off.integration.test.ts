import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { loadData } from './load-data';
import { importOff, type OffProduct } from './import-off';

// Opt in only for this disposable copied project. Never accept a hosted URL or inherited service key.
const url = process.env.C5_LOCAL_URL;
const key = process.env.C5_LOCAL_KEY;
const localTest = url && key ? it : it.skip;
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
localTest('loads and imports against disposable PostgREST, including restart and insert races', async () => {
  if (url !== 'http://127.0.0.1:64431' || !key) throw new Error('Expected the isolated C5 fixture');
  const network = fetch;
  const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const rest = async (path: string, init?: RequestInit) => {
    const res = await network(`${url}/rest/v1/${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`fixture HTTP ${res.status}`);
    return res.status === 204 ? null : res.json();
  };
  const codes = ['5901234123457', '96385074'];
  const dir = mkdtempSync(join(tmpdir(), 'okbite-c5-integration-'));
  vi.stubEnv('SUPABASE_URL', url); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', key);
  vi.stubEnv('AI_API_KEY', 'local-test-only');
  const native: OffProduct = { code: codes[0], product_name: 'Local fixture', brands: 'Fixture',
    lang: 'ro', ingredients_text: 'lapte, zahăr', nutriments: { sugars_100g: 2 }, quantity: null };
  const foreign: OffProduct = { ...native, code: codes[1], lang: 'ru', ingredients_text: 'молоко, сахар' };
  let aiCalls = 0; let failWrite = true;
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const target = String(input);
    if (target.startsWith('https://world.openfoodfacts.org/')) return Response.json({
      products: new URL(target).searchParams.get('languages_tags') === 'en:romanian'
        ? [native, native, foreign, { ...native, code: '4840001000017' }] : [],
    });
    if (target.startsWith('https://tokenharbor.ai/')) {
      aiCalls++;
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '["lapte","zahăr"]' } }] });
    }
    if (!target.startsWith(`${url}/rest/v1/`)) throw new Error('Unexpected external network request');
    if (init?.method === 'POST' && String(init.body).includes(codes[1]!) && failWrite)
      return new Response('interrupted fixture', { status: 503 });
    return network(input, init);
  });
  try {
    expect(await loadData()).toEqual({ categories: 18, ingredients: 0 });
    const data = { categories: [{ slug: 'c5-fixture', name: 'Fixture', scoreKind: 'general' }], ingredients: [{
      slug: 'c5-fixture', name: 'Fixture', aliases: ['fixture'], group: 'base', role: 'Fixture',
      explanation: 'Synthetic integration fixture.', source: 'https://example.org/fixture', allergen: null,
      checkedBy: 'Synthetic test only', checkedAt: '2026-11-05',
    }] };
    expect(await loadData(data)).toEqual({ categories: 1, ingredients: 1 });
    expect(await loadData(data)).toEqual({ categories: 1, ingredients: 1 });
    expect(await rest('ingredients?slug=eq.c5-fixture&select=slug,allergen')).toEqual([{ slug: 'c5-fixture', allergen: null }]);
    await expect(loadData({ ...data, ingredients: [{ ...data.ingredients[0], checkedBy: ' ' }] })).rejects.toThrow('nothing loaded');
    const cache = join(dir, 'translations.json');
    await expect(importOff(async () => {}, cache)).rejects.toThrow(/incomplete.*503.*interrupted fixture/);
    expect(await rest(`products?code=eq.${codes[0]}&select=code,kcal,sugar`)).toEqual([{ code: codes[0], kcal: null, sugar: 2 }]);
    failWrite = false;
    expect(await importOff(async () => {}, cache)).toMatchObject({ inserted: 1, translated: 1 });
    expect(aiCalls).toBe(1);
    // A verified row must survive both normal skips and an insert race after the preflight lookup.
    await rest(`products?code=eq.${codes[0]}`, { method: 'PATCH', body: JSON.stringify({ status: 'verified', name: 'Reviewed fixture' }) });
    expect(await importOff(async () => {}, cache)).toMatchObject({ inserted: 0, translated: 0 });
    expect(aiCalls).toBe(1);
    expect(await rest(`products?code=eq.${codes[0]}&select=name,status`)).toEqual([{ name: 'Reviewed fixture', status: 'verified' }]);
    const rows = await rest(`products?code=in.(${codes.join(',')})&select=code,status,source,ingredients_text`);
    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({ code: codes[1], status: 'unverified', source: 'Open Food Facts (tradus automat)', ingredients_text: 'lapte, zahăr' });
  } finally {
    vi.stubGlobal('fetch', network);
    await rest(`products?code=in.(${codes.join(',')})`, { method: 'DELETE' });
    await rest('ingredients?slug=eq.c5-fixture', { method: 'DELETE' });
    await rest('categories?slug=eq.c5-fixture', { method: 'DELETE' });
    rmSync(dir, { recursive: true, force: true });
  }
}, 30_000);
