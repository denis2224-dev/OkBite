import { strict as assert } from 'node:assert';
import { matchIngredients } from './matchIngredients.ts';

const kb = [
  { slug: 'milk', name: 'Lapte normalizat', aliases: ['lapte'] },
  { slug: 'sugar', name: 'Zahăr', aliases: [] },
];
Deno.test('ingredient matching respects nesting, aliases, accents, percentages and label order', () => {
  assert.deepEqual(
    matchIngredients(
      'LAPTE normalizat, preparat de căpșuni 12% (căpșuni, zahăr, pectină), zahăr',
      kb,
    ),
    [
      { rawName: 'LAPTE normalizat', slug: 'milk' },
      { rawName: 'preparat de căpșuni 12%', slug: null },
      { rawName: 'zahăr', slug: 'sugar' },
    ],
  );
  assert.deepEqual(matchIngredients('lapte 2,5%; ZAHAR 10%; necunoscut.', kb), [
    { rawName: 'lapte 2,5%', slug: 'milk' },
    { rawName: 'ZAHAR 10%', slug: 'sugar' },
    { rawName: 'necunoscut', slug: null },
  ]);
  assert.deepEqual(matchIngredients('zahăr (sfeclă (origine), apă), lapte', kb), [
    { rawName: 'zahăr', slug: 'sugar' },
    { rawName: 'lapte', slug: 'milk' },
  ]);
  assert.deepEqual(matchIngredients('', kb), []);
});
