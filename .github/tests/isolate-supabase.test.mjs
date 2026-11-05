import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('../scripts/isolate-supabase.mjs', import.meta.url));
const config = 'project_id = "okbite-c6"\n[api]\nport = 57431\n[db]\nport = 57432\nshadow_port = 57430\n[studio]\nport = 57433\n[inbucket]\nport = 57434\n[analytics]\nenabled = false\n';
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'okbite-ci-stack-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'supabase'));
  const file = join(root, 'supabase/config.toml');
  await writeFile(file, config);
  const run = (id, attempt = '1') => spawnSync(process.execPath, [script], {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, GITHUB_RUN_ID: id, GITHUB_RUN_ATTEMPT: attempt },
  });
  return { file, run };
}

test('gives each run/attempt its own project and distinct available host ports', async (t) => {
  const { file, run } = await fixture(t);
  const first = run('123');
  assert.equal(first.status, 0, first.stderr);
  const result = await readFile(file, 'utf8');
  assert.match(result, /project_id = "okbite-c3-ci-123-1"/);
  const ports = [...result.matchAll(/^(?:shadow_)?port = (\d+)/gm)].map(x => Number(x[1]));
  assert.equal(ports.length, 5);
  assert.equal(new Set(ports).size, 5);
  assert.equal(result.includes('[analytics]\nenabled = false'), true);
  const second = run('123', '2');
  assert.equal(second.status, 0, second.stderr);
  assert.match(await readFile(file, 'utf8'), /project_id = "okbite-c3-ci-123-2"/);
});

test('refuses missing run identity without modifying the configuration', async (t) => {
  const { file, run } = await fixture(t);
  const result = run('');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing numeric GitHub run identity/);
  assert.equal(await readFile(file, 'utf8'), config);
});
