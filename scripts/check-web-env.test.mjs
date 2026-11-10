import assert from 'node:assert/strict';
import test from 'node:test';
import { webEnvProblems } from './check-web-env.mjs';

const good = { CF_PAGES: '1', CF_PAGES_BRANCH: 'main', EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon' };

test('a correct Cloudflare production build passes', () => assert.deepEqual(webEnvProblems(good), []));
test('local and CI builds are not checked', () => assert.deepEqual(webEnvProblems({}), []));
test('rejects a missing, non-https or local backend and a missing key', () => {
  assert.equal(webEnvProblems({ ...good, EXPO_PUBLIC_SUPABASE_URL: undefined }).length, 1);
  assert.equal(webEnvProblems({ ...good, EXPO_PUBLIC_SUPABASE_URL: 'http://abc.supabase.co' }).length, 1);
  assert.equal(webEnvProblems({ ...good, EXPO_PUBLIC_SUPABASE_URL: 'https://localhost' }).length, 1);
  assert.equal(webEnvProblems({ ...good, EXPO_PUBLIC_SUPABASE_ANON_KEY: '' }).length, 1);
});
test('demo data is rejected on main only', () => {
  assert.equal(webEnvProblems({ ...good, EXPO_PUBLIC_PREVIEW: '1' }).length, 1);
  assert.deepEqual(webEnvProblems({ ...good, CF_PAGES_BRANCH: 'U9-unknown-flow-e2e', EXPO_PUBLIC_PREVIEW: '1' }), []);
});
