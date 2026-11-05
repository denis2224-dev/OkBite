import { strict as assert } from 'node:assert';
import { integrationConfigured } from './integration.ts';

const jwt = 'header.payload.signature';
const valid = {
  SUPABASE_URL: 'http://127.0.0.1:58431',
  SUPABASE_ANON_KEY: jwt,
  SUPABASE_SERVICE_ROLE_KEY: jwt,
};
Deno.test('integration discovery ignores only completely absent configuration', () => {
  assert.equal(integrationConfigured(() => undefined), false);
  assert.equal(integrationConfigured((key) => valid[key as keyof typeof valid]), true);
  for (
    const values of [
      { SUPABASE_URL: valid.SUPABASE_URL },
      { ...valid, SUPABASE_ANON_KEY: '' },
      { ...valid, SUPABASE_URL: 'not a URL' },
      { ...valid, SUPABASE_URL: 'https://example.invalid' },
      { ...valid, SUPABASE_URL: 'http://secret@localhost:58431' },
      { ...valid, SUPABASE_SERVICE_ROLE_KEY: 'private-invalid-key' },
    ]
  ) {
    assert.throws(
      () => integrationConfigured((key) => values[key as keyof typeof values]),
      (error: Error) =>
        error.message.includes('integration configuration') &&
        !error.message.includes('private-invalid-key') && !error.message.includes('secret@'),
    );
  }
});
