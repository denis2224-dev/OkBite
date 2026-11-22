import { strict as assert } from 'node:assert';
import { adminClient, anonClient } from '../_lib/client.ts';
import { loadProduct } from '../_lib/db.ts';
import { integrationTest } from '../_lib/integration.ts';
import { loadShelfCandidates } from './service.ts';

const seedId = 'c2000000-0000-4000-8000-000000000001';

integrationTest(
  'the anon yogurt shelf returns the scored, verified seeds with lookup fields',
  async () => {
    const shelf = await loadShelfCandidates('iaurt', 20, anonClient());
    assert.equal(shelf.length, 3);
    assert.ok(
      shelf.every(({ product, score }) =>
        product.status === 'verified' && product.category.slug === 'iaurt' && score.score !== null
      ),
    );
    assert.deepEqual(
      shelf.find(({ product }) => product.id === seedId),
      await loadProduct({ id: seedId }),
    );
    const scores = shelf.map(({ score }) => score.score as number);
    assert.deepEqual(scores, scores.toSorted((a, b) => b - a));
  },
);

integrationTest('the shelf excludes the best-scoring fixture after it is hidden', async () => {
  const db = adminClient();
  const id = crypto.randomUUID();
  const seed = await db.from('products').select(
    'name,brand,quantity,category_slug,unit,source,ingredients_text',
  )
    .eq('id', seedId).single();
  assert.equal(seed.error, null);
  assert.equal(
    (await db.from('products').insert({
      ...seed.data,
      id,
      status: 'verified',
      kcal: 0,
      sat: 0,
      sugar: 0,
      salt: 0,
      fiber: 10,
      protein: 10,
    })).error,
    null,
  );
  try {
    const anon = anonClient();
    assert.equal((await loadShelfCandidates('iaurt', 1, anon))[0]?.product.id, id);
    assert.equal((await db.from('products').update({ status: 'hidden' }).eq('id', id)).error, null);
    // Test the verified filter independently of the anonymous reader's hidden-row policy.
    assert.ok(
      (await loadShelfCandidates('iaurt', 20, db)).every(({ product }) => product.id !== id),
    );
    assert.ok(
      (await loadShelfCandidates('iaurt', 20, anon)).every(({ product }) => product.id !== id),
    );
  } finally {
    assert.equal((await db.from('products').delete().eq('id', id)).error, null);
  }
});
