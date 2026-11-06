import { strict as assert } from 'node:assert';
import { UpstreamError } from '../_lib/claude.ts';
import { parseFront } from './parseFront.ts';

Deno.test('parseFront keeps printed values and accepts only checksum-valid barcodes', () => {
  assert.deepEqual(
    parseFront(
      '{"brand":"Zorel","name":"Iaurt cu căpșuni 2%","quantity":"400 g","barcodeDigits":"4840001000014"}',
    ),
    { brand: 'Zorel', name: 'Iaurt cu căpșuni 2%', quantity: '400 g', code: '4840001000014' },
  );
  assert.deepEqual(
    parseFront('{"brand":"","name":"","quantity":"","barcodeDigits":"4840001000017"}'),
    {
      brand: null,
      name: null,
      quantity: null,
      code: null,
    },
  );
  assert.deepEqual(
    parseFront(
      '```json\n{"brand":" Zorel ","name":"Iaurt","quantity":"","barcodeDigits":"4840001 000014"}\n```',
    ),
    {
      brand: 'Zorel',
      name: 'Iaurt',
      quantity: null,
      code: '4840001000014',
    },
  );
  assert.deepEqual(parseFront('{"brand":7,"name":null}').brand, null);
});

Deno.test('parseFront rejects answers that are not one JSON object', () => {
  for (const raw of ['Nu văd produsul.', '[1,2]', '{"brand":', '']) {
    assert.throws(() => parseFront(raw), UpstreamError);
  }
});
