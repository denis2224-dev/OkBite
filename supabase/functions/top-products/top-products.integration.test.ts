import { strict as assert } from 'node:assert';
import { ErrorBody, TopProductsResponse } from '../_shared/contract.ts';
import { adminClient } from '../_lib/client.ts';
import { integrationTest } from '../_lib/integration.ts';

function shelf(category: string, limit = 20): Promise<Response> {
  const url = new URL('/functions/v1/top-products', Deno.env.get('SUPABASE_URL')!);
  url.search = new URLSearchParams({ category, limit: String(limit) }).toString();
  const key = Deno.env.get('SUPABASE_ANON_KEY')!;
  return fetch(url, { headers: { apikey: key, authorization: `Bearer ${key}` } });
}

integrationTest('top-products gateway returns the seeded yogurt shelf in score order', async () => {
  const res = await shelf('iaurt');
  assert.equal(res.status, 200);
  const { category, products } = TopProductsResponse.parse(await res.json());
  assert.equal(category, 'iaurt');
  assert.deepEqual(
    products.map(({ product }) => product.id).sort(),
    [1, 2, 3].map((id) => `c2000000-0000-4000-8000-00000000000${id}`),
  );
  for (const { product, score } of products) {
    assert.equal(product.status, 'verified');
    assert.equal(product.category.slug, category);
    assert.notEqual(score.score, null);
  }
  const scores = products.map(({ score }) => score.score!);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));

  const limited = await shelf('iaurt', 1);
  assert.equal(limited.status, 200);
  assert.deepEqual(TopProductsResponse.parse(await limited.json()).products, products.slice(0, 1));
});

integrationTest('top-products gateway distinguishes unknown and empty shelves', async () => {
  const category = `shelf-test-${crypto.randomUUID()}`;
  const missing = await shelf(category);
  assert.equal(missing.status, 400);
  assert.equal(ErrorBody.parse(await missing.json()).error, 'bad_request');

  const db = adminClient();
  const { error } = await db.from('categories').insert({
    slug: category,
    name: 'Raft de test',
    score_kind: 'general',
  });
  assert.equal(error, null);
  try {
    const res = await shelf(category);
    assert.equal(res.status, 200);
    assert.deepEqual(TopProductsResponse.parse(await res.json()), { category, products: [] });
  } finally {
    assert.equal((await db.from('categories').delete().eq('slug', category)).error, null);
  }
});
