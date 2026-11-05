import { strict as assert } from 'node:assert';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const gateway = 'services:\n  - name: functions-v1\n    plugins:\n      - name: cors\n      - name: request-transformer\n  - name: storage-v1\n    plugins:\n      - name: cors\n';

async function runFixture(t, config, original = gateway) {
  const root = await mkdtemp(join(tmpdir(), 'okbite-local-cors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'tests'));
  const script = join(root, 'tests/local-cors.mjs');
  await cp(new URL('./local-cors.mjs', import.meta.url), script);
  await writeFile(join(root, 'config.toml'), config);
  const calls = [];
  const actual = childProcess.execFileSync;
  childProcess.execFileSync = (file, args, options) => {
    assert.equal(file, 'docker');
    calls.push({ args, input: options?.input });
    return original;
  };
  syncBuiltinESMExports();
  let error;
  try { await import(pathToFileURL(script).href); } catch (caught) { error = caught; }
  finally { childProcess.execFileSync = actual; syncBuiltinESMExports(); }
  return { calls, error };
}

for (const [project, newline] of [['okbite-c3-fixture', '\n'], ['okbite-c3-fixture', '\r\n'], ['okbite-c6', '\r\n']]) {
  test(`configures only the dedicated gateway for ${project} with ${JSON.stringify(newline)} config`, async (t) => {
    const { calls, error } = await runFixture(t, `project_id = "${project}"${newline}`);
    assert.equal(error, undefined);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].args[1], `supabase_kong_${project}`);
    assert.equal(calls[1].args[2], `supabase_kong_${project}`);
    const patched = calls[1].input;
    assert.equal(patched.split('  - name: storage-v1')[0].includes('- name: cors'), false);
    assert.equal(patched.split('  - name: storage-v1')[1].includes('- name: cors'), true);
    assert.equal(patched.includes('- name: request-transformer'), true);
    assert.deepEqual(calls[2].args, ['exec', `supabase_kong_${project}`, 'kong', 'reload']);
  });
}

test('refuses unrelated project IDs before any Docker call', async (t) => {
  const { calls, error } = await runFixture(t, 'project_id = "shared-production"\n');
  assert.match(error.message, /Refusing/);
  assert.equal(calls.length, 0);
});

test('does not rewrite an already configured gateway', async (t) => {
  const configured = gateway.replace('\n      - name: cors\n', '\n');
  const { calls, error } = await runFixture(t, 'project_id = "okbite-c3-fixture"\n', configured);
  assert.equal(error, undefined);
  assert.equal(calls.length, 1);
});
