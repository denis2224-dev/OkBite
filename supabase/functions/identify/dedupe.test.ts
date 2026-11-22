import { strict as assert } from 'node:assert';
import { dedupeCandidates, packSize, sameSize } from './dedupe.ts';

const row = (
  id: string,
  quantity: string,
  name = 'Coca-Cola',
  brand = 'COCA-COLA SERVICES SA/NV',
) => ({
  id,
  name,
  brand,
  quantity,
});

Deno.test('packSize reads ml, cl, l, g, kg and rejects multipacks', () => {
  assert.deepEqual(packSize('330 ml'), { amount: 330, unit: 'ml' });
  assert.deepEqual(packSize('0,33 l'), { amount: 330, unit: 'ml' });
  assert.deepEqual(packSize('33cl'), { amount: 330, unit: 'ml' });
  assert.deepEqual(packSize('1.75L'), { amount: 1750, unit: 'ml' });
  assert.deepEqual(packSize('0,4 kg'), { amount: 400, unit: 'g' });
  assert.equal(packSize('5 x 250 ml'), null);
  assert.equal(packSize('330x1'), null);
  assert.equal(packSize(''), null);
  assert.ok(sameSize('330 ml', '0,33 l'));
  assert.ok(!sameSize('330 ml', '330 g'));
});

Deno.test('Coca-Cola photo: one row per brand+name, the photographed size wins', () => {
  // 14 Nov E2E: the search returned 2,5 L / 5x250 ml / 1.75 L, all similarity 1, and no 330 ml row.
  const rows = [row('a', '2,5 L'), row('b', '5 x 250 ml'), row('c', '1.75l', 'coca-cola')];
  const siblings = [...rows, row('d', '330 ml')];
  assert.deepEqual(
    dedupeCandidates(rows, siblings, '0,33 L').map((r) => r.id),
    ['d'],
  );
  assert.deepEqual(
    dedupeCandidates(rows, siblings, null).map((r) => r.id),
    ['a'],
  );
  assert.deepEqual(
    dedupeCandidates(rows, siblings, '1,75 l').map((r) => r.id),
    ['c'],
  );
});

Deno.test('different products keep their own rows and order', () => {
  const rows = [row('a', '2 L'), row('z', '500 ml', 'Coca-Cola Zero'), row('b', '1 L')];
  assert.deepEqual(
    dedupeCandidates(rows, [], '500 ml').map((r) => r.id),
    ['a', 'z'],
  );
});

Deno.test('water candidates never collapse or cross-match contradicting carbonation or lines across sizes', () => {
  const waterRow = (
    id: string,
    quantity: string,
    name: string,
    brand: string,
    carbonation: 'still' | 'sparkling' | 'lightly_sparkling' | null,
  ) => ({
    id,
    name,
    brand,
    quantity,
    carbonation,
  });
  const still500 = waterRow('s1', '500 ml', 'Apă potabilă plată', 'OM', 'still');
  const still1500 = waterRow('s2', '1,5 L', 'Apă potabilă plată', 'OM', 'still');
  const carb1500 = waterRow('c1', '1,5 L', 'Apă potabilă carbogazoasă', 'OM', 'sparkling');
  const sport750 = waterRow('sp1', '750 ml', 'Sport plată', 'OM', 'still');

  // Filtering still photo excludes sparkling row even at identical 1.5 L quantity.
  const dedupedStill = dedupeCandidates([still500, carb1500, sport750], [still1500], '1,5 L', 'still');
  assert.deepEqual(dedupedStill.map((r) => r.id), ['s2', 'sp1']);

  // Ambiguous unknown carbonation keeps distinct carbonation groups separate instead of merging sizes.
  const dedupedAll = dedupeCandidates(
    [
      waterRow('w1', '500 ml', 'Dorna', 'Dorna', 'still'),
      waterRow('w2', '500 ml', 'Dorna', 'Dorna', 'sparkling'),
    ],
    [],
    '500 ml',
  );
  assert.deepEqual(dedupedAll.map((r) => r.id), ['w1', 'w2']);
});
