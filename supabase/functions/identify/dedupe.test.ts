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
