import assert from 'node:assert/strict';
import test from 'node:test';
import { webEnvProblems } from './check-web-env.mjs';

const good = { CF_PAGES: '1', CF_PAGES_BRANCH: 'main', EXPO_PUBLIC_SUPABASE_URL: 'https://vspdhdqaneofutsvavlc.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon' };

test('a correct Cloudflare production build passes', () => assert.deepEqual(webEnvProblems(good), []));
test('local and CI builds are not checked', () => assert.deepEqual(webEnvProblems({}), []));
test('the public site requires staging while branch previews can use their configured backend', () => {
  const otherBackend = { ...good, EXPO_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' };
  assert.deepEqual(webEnvProblems(otherBackend), ['The public web build must use OkBite staging']);
  assert.deepEqual(webEnvProblems({ ...otherBackend, CF_PAGES_BRANCH: 'preview' }), []);
});
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
