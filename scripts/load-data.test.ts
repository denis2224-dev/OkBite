import { afterEach, expect, it, vi } from 'vitest';
import { loadData } from './load-data';

afterEach(() => vi.unstubAllGlobals());
it('refuses release loading of an empty knowledge base before any network access', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  await expect(loadData({ categories: [], ingredients: [] }, { release: true })).rejects.toThrow(/nothing loaded/);
  expect(network).not.toHaveBeenCalled();
});

const additive = {
  slug: 'colorant-caramel-e150d', name: 'Colorant caramel E150d', aliases: ['E150d'], group: 'add',
  role: 'Colorant', explanation: 'Colorant maro.', source: 'https://www.efsa.europa.eu/en/efsajournal/pub/2004',
  allergen: null, checkedBy: 'Ion', checkedAt: '2026-11-11',
};
async function loadedIngredientRow(extra: object) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{}] });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('SUPABASE_URL', 'http://localhost:54321'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
  await loadData({ categories: [], ingredients: [{ ...additive, ...extra }] });
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/ingredients?'));
  return (JSON.parse(call?.[1].body as string) as Record<string, unknown>[])[0];
}
afterEach(() => vi.unstubAllEnvs());
it('writes risk and risk_source for an additive that has them', async () => {
  const row = await loadedIngredientRow({ risk: 'high', riskSource: 'https://doi.org/10.2903/j.efsa.2012.3030' });
  expect(row).toMatchObject({ risk: 'high', risk_source: 'https://doi.org/10.2903/j.efsa.2012.3030' });
});
it('writes null risk and risk_source when the entry has none', async () => {
  const row = await loadedIngredientRow({});
  expect(row).toMatchObject({ risk: null, risk_source: null });
});
