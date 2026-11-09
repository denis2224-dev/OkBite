import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareRestore } from './prepare-restore.mjs';
import { exportStaging, exportProduction, seal, STAGING_REF, PRODUCTION_REF } from './backup.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'okbite-restore-plan-'));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const reviewed = join(root, 'reviewed/supabase');
  mkdirSync(reviewed, { recursive: true });
  const project = 'okbite-drill-a1b2c3d4e5f6';
  const config = join(reviewed, 'config.toml');
  writeFileSync(config, `project_id = "${project}"\n[api]\nport = 60101\n[db]\nport = 60102\n`);
  const evidence = { inspectedAt: new Date().toISOString(), project, containers: [], volumes: [], listeningPorts: [] };
  const makeBackup = (source, name) => {
    const repository = join(root, `repo-${name}`);
    mkdirSync(join(repository, 'supabase/.temp'), { recursive: true });
    writeFileSync(join(repository, 'supabase/.temp/project-ref'), source);
    const directory = join(root, name);
    (source === STAGING_REF ? exportStaging : exportProduction)(directory, { repository, run: args => {
      if (args[0] === '--version') return '3.0.0';
      if (args.includes('--file')) writeFileSync(args.at(-1), '-- SQL fixture');
      return '';
    } });
    const snapshot = { source, counts: Object.fromEntries(['public.products', 'public.contribution_receipts',
      'auth.users', 'storage.objects'].map(table => [table, 0])), receiptMap: 'a'.repeat(64),
    accessSha256: 'b'.repeat(64), extensionsSha256: 'c'.repeat(64), objects: [] };
    snapshot.counts['storage.buckets'] = 2;
    for (const name of ['source-before.json', 'source-after.json']) writeFileSync(join(directory, name), JSON.stringify(snapshot));
    seal(directory, repository);
    return directory;
  };
  const target = { config, evidence, backupDirectory: makeBackup(STAGING_REF, 'staging-backup'),
    apiUrl: 'http://127.0.0.1:60101', dbUrl: 'postgresql://127.0.0.1:60102/postgres' };
  return { root, reviewed, config, target, makeBackup, destination: join(root, 'fresh-drill') };
}
test('prepare-only plan copies reviewed config into fresh workspace and never executes commands', t => {
  const f = fixture(t);
  const plan = prepareRestore(f.target, f.destination);
  assert.equal(plan.kind, 'prepare-only');
  assert.equal(plan.database.host, '127.0.0.1');
  assert.ok(plan.commands.every(command => Array.isArray(command)));
  assert.equal(readFileSync(join(f.destination, 'supabase/config.toml'), 'utf8'), readFileSync(f.config, 'utf8'));
  assert.throws(() => prepareRestore(f.target, f.destination), /exist/);
  assert.throws(() => prepareRestore(f.target, join(f.target.backupDirectory, 'bad')), /archive/);
});
test('refuses known IDs/ports, hosted endpoints, linked config and reused resources', t => {
  const f = fixture(t);
  assert.throws(() => prepareRestore({ ...f.target,
    backupDirectory: f.makeBackup(PRODUCTION_REF, 'production-backup') }, f.destination), /staging-derived/);
  const config = readFileSync(f.config, 'utf8');
  for (const project of ['okbite', 'okbite-r2-review', 'vspdhdqaneofutsvavlc', 'ndnhzultkotujtkskulu']) {
    writeFileSync(f.config, config.replace('okbite-drill-a1b2c3d4e5f6', project));
    assert.throws(() => prepareRestore(f.target, f.destination), /project/);
  }
  writeFileSync(f.config, config);
  writeFileSync(f.config, config.replace('60102', '54322'));
  assert.throws(() => prepareRestore({ ...f.target, dbUrl: 'postgresql://127.0.0.1:54322/postgres' }, f.destination), /known/);
  writeFileSync(f.config, config);
  for (const dbUrl of ['postgresql://db.example.com:60102/postgres', 'postgresql://127.0.0.1:54322/postgres',
    'postgresql://user:secret@127.0.0.1:60102/postgres']) {
    assert.throws(() => prepareRestore({ ...f.target, dbUrl }, f.destination));
  }
  assert.throws(() => prepareRestore({ ...f.target, apiUrl: 'https://source.supabase.co' }, f.destination));
  for (const field of ['containers', 'volumes']) {
    assert.throws(() => prepareRestore({ ...f.target, evidence: { ...f.target.evidence,
      [field]: ['supabase_db_okbite-drill-a1b2c3d4e5f6'] } }, f.destination), /used/);
  }
  assert.throws(() => prepareRestore({ ...f.target, evidence: { ...f.target.evidence,
    listeningPorts: [60102] } }, f.destination), /used/);
  assert.throws(() => prepareRestore({ ...f.target, evidence: { ...f.target.evidence,
    inspectedAt: '2020-01-01T00:00:00Z' } }, f.destination), /fresh/);
  mkdirSync(join(f.reviewed, '.temp'));
  writeFileSync(join(f.reviewed, '.temp/project-ref'), 'any-linked-ref');
  assert.throws(() => prepareRestore(f.target, f.destination), /linked/);
});
