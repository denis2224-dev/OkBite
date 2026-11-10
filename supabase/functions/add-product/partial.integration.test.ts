import { strict as assert } from 'node:assert';
import { integrationTest } from '../_lib/integration.ts';
import { LookupResponse } from '../_shared/contract.ts';
import { handler as lookup } from '../lookup/index.ts';
import { fixture } from './retry-fixture.ts';

integrationTest('U2a simultaneous identical partial submissions save one product with null nutrients', async () => {
  const f = await fixture();
  try {
    delete f.input.categorySlug;
    f.input.brand = '';
    f.input.nutrients = { kcal: null, fat: null, sat: null, sugar: null, salt: null,
      protein: null, fiber: null, fruitVegPct: null };
    const responses = await Promise.all([f.submit(), f.submit()]);
    const values = await Promise.all(responses.map(async (response) => {
      assert.equal(response.status, 200, await response.clone().text());
      return LookupResponse.parse(await response.json());
    }));
    assert.deepEqual(values[0], values[1]);
    const saved = values[0];
    if (saved.status !== 'found') throw new Error('Expected saved product');
    assert.equal(saved.product.category.slug, 'necunoscut');
    assert.equal(saved.product.status, 'unverified');
    assert.equal(saved.product.brand, '');
    assert.deepEqual(saved.product.nutrients, f.input.nutrients);
    assert.deepEqual(saved.score, {
      score: null, letter: null, grade: 'unavailable', reasons: [],
      missing: ['kcal', 'sat', 'sugar', 'salt'],
    });
    assert.equal((await f.products()).data?.length, 1);
    const events = await f.db.from('usage_events').select('id').eq('device_id', f.device);
    assert.equal(events.error, null);
    assert.equal(events.data?.length, 1);
    const read = await lookup(new Request(`http://local/lookup?id=${saved.product.id}`, {
      headers: { 'x-device-id': f.device },
    }));
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), saved);
  } finally { await f.cleanup(); }
});

integrationTest('U2a unknown category never scores even with complete demo nutrition', async () => {
  const f = await fixture();
  try {
    delete f.input.categorySlug;
    const response = await f.submit();
    assert.equal(response.status, 200, await response.clone().text());
    const saved = LookupResponse.parse(await response.json());
    if (saved.status !== 'found') throw new Error('Expected saved product');
    assert.deepEqual(saved.score, {
      score: null, letter: null, grade: 'unavailable', reasons: [], missing: [],
    });
  } finally { await f.cleanup(); }
});
