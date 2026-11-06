import { strict as assert } from 'node:assert';
import { UpstreamError } from '../_lib/claude.ts';
import { parseLabel } from './parseLabel.ts';

const label = (over: Record<string, unknown>) =>
  JSON.stringify({
    ingredientsText: 'lapte normalizat, culturi lactice vii',
    unit: 'g',
    kcal: '63',
    fat: '2,5',
    sat: '1,6',
    sugar: '4,1',
    salt: '0,1',
    protein: '3,6',
    fiber: '0',
    fruitVegPct: '',
    ...over,
  });

Deno.test('parseLabel reads numbers with a decimal comma and lists what is blank', () => {
  assert.deepEqual(parseLabel(label({ salt: '0,3' })), {
    ingredientsText: 'lapte normalizat, culturi lactice vii',
    unit: 'g',
    nutrients: {
      kcal: 63,
      fat: 2.5,
      sat: 1.6,
      sugar: 4.1,
      salt: 0.3,
      protein: 3.6,
      fiber: 0,
      fruitVegPct: null,
    },
    unclear: ['fruitVegPct'],
  });
});

Deno.test('parseLabel turns blank, unreadable or impossible values into null + unclear', () => {
  const read = parseLabel(
    label({
      sugar: '',
      salt: '<0,5',
      fat: 'puțin',
      kcal: 2500,
      protein: 12.4,
      unit: 'per portion',
    }),
  );
  assert.deepEqual(read.nutrients, {
    kcal: null,
    fat: null,
    sat: 1.6,
    sugar: null,
    salt: null,
    protein: 12.4,
    fiber: 0,
    fruitVegPct: null,
  });
  assert.deepEqual(read.unclear, ['kcal', 'fat', 'sugar', 'salt', 'fruitVegPct']);
  assert.equal(read.unit, null);
  const noText = parseLabel(label({ ingredientsText: '' }));
  assert.equal(noText.ingredientsText, null);
  assert.ok(noText.unclear.includes('ingredientsText'));
  assert.equal(parseLabel(label({ unit: 'ML' })).unit, 'ml');
});

Deno.test('parseLabel accepts fenced JSON and rejects non-JSON answers', () => {
  assert.equal(parseLabel('```json\n' + label({}) + '\n```').nutrients.kcal, 63);
  for (const raw of ['Nu se vede eticheta.', '["x"]', '{']) {
    assert.throws(() => parseLabel(raw), UpstreamError);
  }
});
