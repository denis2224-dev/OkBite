import { afterEach, expect, it, vi } from 'vitest';
import { loadData } from './load-data';

afterEach(() => vi.unstubAllGlobals());
it('refuses release loading of an empty knowledge base before any network access', async () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  await expect(loadData({ categories: [], ingredients: [] }, { release: true })).rejects.toThrow(/nothing loaded/);
  expect(network).not.toHaveBeenCalled();
});
