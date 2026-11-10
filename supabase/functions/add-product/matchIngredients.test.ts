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

Deno.test('matches Coca-Cola Zero functional prefixes, parenthesized E-codes, and sweetener lists', () => {
  const sodaKb = [
    { slug: 'apa-carbogazoasa', name: 'Apă carbogazoasă', aliases: ['apa', 'apa carbonatata'] },
    { slug: 'dioxid-de-carbon-e290', name: 'Dioxid de carbon (E290)', aliases: ['dioxid de carbon', 'e290'] },
    { slug: 'colorant-caramel-e150d', name: 'Caramel cu sulfit de amoniu (E150d)', aliases: ['caramel cu sulfit de amoniu', 'e150d'] },
    { slug: 'acid-fosforic-e338', name: 'Acid fosforic (E338)', aliases: ['acid fosforic', 'e338'] },
    { slug: 'citrati-de-sodiu-e331', name: 'Citrați de sodiu (E331)', aliases: ['citrati de sodiu', 'citrat trisodic', 'e331'] },
    { slug: 'aspartam-e951', name: 'Aspartam (E951)', aliases: ['aspartam', 'e951'] },
    { slug: 'acesulfam-k-e950', name: 'Acesulfam K (E950)', aliases: ['acesulfam k', 'e950'] },
    { slug: 'ciclamat-de-sodiu-e952', name: 'Ciclamați (E952)', aliases: ['ciclamati', 'ciclamat de sodiu', 'e952'] },
    { slug: 'aroma-naturala', name: 'Aromă naturală', aliases: ['arome naturale', 'aroma naturala'] },
    { slug: 'cafeina', name: 'Cafeină', aliases: ['cafeina', 'aroma cafeina'] },
  ];
  const label =
    'Ingrediente: Apă, dioxid de carbon, colorant: caramel cu sulfit de amoniu (E150d), acidifiant: acid fosforic (E338), îndulcitori (ciclamați, acesulfam K și aspartam), corector de aciditate: citrați de sodiu, arome naturale, aromă cafeină. Conține o sursă de fenilalanină.';
  assert.deepEqual(matchIngredients(label, sodaKb), [
    { rawName: 'Apă', slug: 'apa-carbogazoasa' },
    { rawName: 'dioxid de carbon', slug: 'dioxid-de-carbon-e290' },
    { rawName: 'colorant: caramel cu sulfit de amoniu (E150d)', slug: 'colorant-caramel-e150d' },
    { rawName: 'acidifiant: acid fosforic (E338)', slug: 'acid-fosforic-e338' },
    { rawName: 'ciclamați', slug: 'ciclamat-de-sodiu-e952' },
    { rawName: 'acesulfam K', slug: 'acesulfam-k-e950' },
    { rawName: 'aspartam', slug: 'aspartam-e951' },
    { rawName: 'corector de aciditate: citrați de sodiu', slug: 'citrati-de-sodiu-e331' },
    { rawName: 'arome naturale', slug: 'aroma-naturala' },
    { rawName: 'aromă cafeină', slug: 'cafeina' },
  ]);
});

