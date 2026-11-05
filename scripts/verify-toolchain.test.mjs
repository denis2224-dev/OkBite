import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const { packageManager } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const expected = packageManager.split('@')[1];
const run = (agent) => spawnSync(process.execPath, [fileURLToPath(new URL('scripts/verify-toolchain.mjs', root))], {
  env: { ...process.env, npm_config_user_agent: agent }, encoding: 'utf8',
});

test('the declared package manager is accepted by installation and CI', () => {
  const result = run(`pnpm/${expected} npm/? node/${process.versions.node}`);
  assert.equal(result.status, 0, result.stderr);
});

test('a different pnpm version fails before lifecycle work', () => {
  const wrong = expected === '9.12.0' ? '11.25.0' : '9.12.0';
  const result = run(`pnpm/${wrong} npm/? node/${process.versions.node}`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use the declared package manager/);
});

test('npm and a missing package manager fail with actionable instructions', () => {
  for (const agent of ['npm/11.0.0', '']) {
    const result = run(agent);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /corepack pnpm/);
  }
});

test('pnpm 9 is rejected before a dependency install script can execute', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'okbite-toolchain-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'scripts'));
  mkdirSync(join(directory, 'dependency'));
  const scripts = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).scripts;
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    name: 'guard-fixture', private: true, packageManager,
    scripts: { preinstall: scripts.preinstall, 'pnpm:devPreinstall': scripts['pnpm:devPreinstall'] },
    dependencies: { 'sentinel-dependency': 'file:./dependency' },
  }));
  writeFileSync(join(directory, 'scripts/verify-toolchain.mjs'),
    readFileSync(new URL('scripts/verify-toolchain.mjs', root)));
  writeFileSync(join(directory, 'dependency/package.json'), JSON.stringify({
    name: 'sentinel-dependency', version: '1.0.0',
    scripts: { install: 'node build.cjs' },
  }));
  writeFileSync(join(directory, 'dependency/build.cjs'),
    "require('node:fs').writeFileSync(process.env.OKBITE_DEPENDENCY_SENTINEL, 'executed')");
  const sentinel = join(directory, 'sentinel');
  const result = spawnSync('corepack', ['pnpm@9.12.0', 'install', '--offline',
    '--config.manage-package-manager-versions=false'], {
    cwd: directory, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, CI: 'true', OKBITE_DEPENDENCY_SENTINEL: sentinel },
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /Use the declared package manager/);
  assert.equal(existsSync(sentinel), false, 'dependency install script ran before rejection');
});
