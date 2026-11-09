import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STAGING_REF = 'vspdhdqaneofutsvavlc';
export const PRODUCTION_REF = 'ndnhzultkotujtkskulu';
const approvedSources = [STAGING_REF, PRODUCTION_REF];
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const save = (file, value) => writeFileSync(file, value, { flag: 'wx', mode: 0o600 });
function outside(directory, repository, fresh = false) {
  assert.ok(directory && isAbsolute(directory), 'Supply an absolute private directory');
  const requested = resolve(directory);
  const actual = fresh ? join(realpathSync(dirname(requested)), requested.split(sep).at(-1)) : realpathSync(requested);
  const repo = realpathSync(repository);
  assert.ok(actual !== repo && !actual.startsWith(repo + sep), 'Backups must stay outside the repository');
  assert.ok(!lstatSync(fresh ? dirname(requested) : requested).isSymbolicLink(), 'Refusing symlink directory');
  if (fresh) assert.ok(!existsSync(requested), 'Destination must not exist');
  return actual;
}
function linked(repository, source) {
  assert.equal(readFileSync(join(repository, 'supabase/.temp/project-ref'), 'utf8').trim(), source, 'Refusing wrong project link (staging/production mismatch)');
}
function command(args, repository) {
  const result = spawnSync(process.env.SUPABASE_CLI_BIN ?? 'supabase', args, {
    cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, 0, 'Export command failed; no credentials or raw output are printed');
  return result.stdout;
}
export const exportStaging = (directory, options) => exportProject(directory, options, STAGING_REF);
export const exportProduction = (directory, options) => exportProject(directory, options, PRODUCTION_REF);
function exportProject(directory, { repository = repositoryRoot, run = args => command(args, repository) } = {}, source) {
  linked(repository, source);
  const actual = outside(directory, repository, true);
  assert.equal(run(['--version']).trim(), '3.0.0', 'Use reviewed Supabase CLI 3.0.0; revalidate flags before upgrading');
  mkdirSync(actual, { mode: 0o700 });
  save(join(actual, 'INCOMPLETE'), 'Unverified export; isolated recovery drill only after integrity gates.\n');
  const invoke = args => {
    linked(repository, source);
    try { return run([...args.slice(0, 2), `--remote=${source}`, '--workdir', repository, ...args.slice(2)]); }
    catch { throw new Error('Export command failed; private partial export remains incomplete'); }
  };
  for (const [name, flags] of [
    ['roles.sql', ['--role-only']], ['schema.sql', ['--schema', 'public,auth,storage,extensions']],
    ['data.sql', ['--schema', 'public,auth,storage,extensions', '--data-only', '--use-copy']],
    ['history-schema.sql', ['--schema', 'supabase_migrations']],
    ['history-data.sql', ['--schema', 'supabase_migrations', '--data-only', '--use-copy']],
  ]) invoke(['db', 'dump', ...flags, '--file', join(actual, name)]);
  for (const bucket of ['uploads', 'products']) {
    mkdirSync(join(actual, bucket), { mode: 0o700 });
    save(join(actual, `${bucket}-listing.txt`), invoke(['storage', 'ls', '--recursive', `ss:///${bucket}`]));
    invoke(['storage', 'cp', '--recursive', `ss:///${bucket}`, join(actual, bucket)]);
  }
  linked(repository, source);
  save(join(actual, 'export.json'), JSON.stringify({ source, cli: '3.0.0', exportedAt: new Date().toISOString() }));
  return actual;
}
function files(directory, prefix = '') {
  return readdirSync(join(directory, prefix)).sort().flatMap(name => {
    const path = prefix ? `${prefix}/${name}` : name;
    const stat = lstatSync(join(directory, path));
    assert.ok(!stat.isSymbolicLink(), 'Refusing symlink in backup');
    if (stat.isDirectory()) return files(directory, path);
    assert.ok(stat.isFile() && stat.nlink === 1, 'Refusing special file or hard link');
    chmodSync(join(directory, path), 0o600);
    return path === 'integrity.json' ? [] : [{ path, bytes: stat.size, sha256: hash(readFileSync(join(directory, path))) }];
  });
}
function evidence(directory) {
  assert.ok(existsSync(join(directory, 'export.json')), 'Export incomplete');
  const source = json(join(directory, 'export.json')).source;
  assert.ok(approvedSources.includes(source), 'Wrong export source');
  for (const name of ['roles.sql', 'schema.sql', 'data.sql', 'history-schema.sql', 'history-data.sql', 'uploads-listing.txt', 'products-listing.txt']) {
    assert.ok(lstatSync(join(directory, name)).isFile(), 'Missing export artifact');
  }
  for (const name of ['uploads', 'products']) assert.ok(lstatSync(join(directory, name)).isDirectory(), 'Missing photo directory');
  const before = json(join(directory, 'source-before.json'));
  const after = json(join(directory, 'source-after.json'));
  assert.equal(before.source, source, 'Wrong evidence source');
  for (const field of ['receiptMap', 'accessSha256', 'extensionsSha256']) assert.match(before[field] ?? '', /^[a-f0-9]{64}$/, 'Missing evidence SHA-256');
  const dumpedTables = ['data.sql', 'history-data.sql'].flatMap(name =>
    [...readFileSync(join(directory, name), 'utf8').matchAll(/^COPY (.+?) \(/gm)].map(match => {
      assert.match(match[1], /^"?[a-z_][a-z0-9_]*"?\."?[a-z_][a-z0-9_]*"?$/, 'Review unsupported dumped table identifier');
      return match[1].replaceAll('"', '');
    }));
  for (const table of ['public.products', 'public.contribution_receipts', 'auth.users', 'storage.objects', 'storage.buckets', ...dumpedTables]) {
    assert.ok(Object.hasOwn(before.counts, table), 'Missing recovery table count');
  }
  assert.ok(Object.values(before.counts).every(n => Number.isSafeInteger(n) && n >= 0), 'Invalid row count');
  assert.deepEqual(after, before, 'Source snapshots differ; export requires a consistent write-free window');
  assert.equal(before.counts['storage.buckets'], 2, 'Review additional buckets before using this scoped exporter');
  assert.equal(files(directory, 'uploads').length + files(directory, 'products').length,
    before.counts['storage.objects'], 'Export photo count differs from Storage metadata');
  assert.ok(Array.isArray(before.objects), 'Missing source object index');
  const expected = before.objects.map(object => {
    assert.ok(['uploads', 'products'].includes(object.bucket) && typeof object.name === 'string' &&
      object.name.split('/').every(part => part && part !== '.' && part !== '..') &&
      !/[\\\0]/.test(object.name) && Number.isSafeInteger(object.bytes) && object.bytes >= 0,
    'Invalid source object index');
    return { path: `${object.bucket}/${object.name}`, bytes: object.bytes };
  }).sort((a, b) => a.path.localeCompare(b.path));
  assert.equal(new Set(expected.map(object => object.path)).size, expected.length, 'Duplicate source object index key');
  const actual = ['uploads', 'products'].flatMap(bucket => files(directory, bucket))
    .map(({ path, bytes }) => ({ path, bytes })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(actual, expected, 'Export differs from source object index paths or sizes');
}
export function seal(directory, repository = repositoryRoot) {
  const actual = outside(directory, repository);
  evidence(actual);
  const manifest = { version: 1, source: json(join(actual, 'export.json')).source, scope: 'Integrity only; restore drill pending', files: files(actual) };
  save(join(actual, 'integrity.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}
export function verify(directory, repository = repositoryRoot) {
  const actual = outside(directory, repository);
  const manifest = json(join(actual, 'integrity.json'));
  assert.equal(manifest.version, 1, 'Unsupported integrity format');
  assert.ok(approvedSources.includes(manifest.source) && manifest.source === json(join(actual, 'export.json')).source, 'Wrong source');
  assert.deepEqual(files(actual), manifest.files, 'Backup integrity mismatch');
  evidence(actual);
  return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const actions = { 'export-staging': exportStaging, 'export-production': exportProduction, seal, verify };
    assert.ok(Object.hasOwn(actions, process.argv[2]) && process.argv.length === 4, 'Usage: node supabase/ops/backup.mjs export-staging|export-production|seal|verify /absolute/private/directory');
    process.umask(0o077);
    actions[process.argv[2]](process.argv[3]);
    console.log('Backup preparation step passed. Restore drill and owner acceptance remain separate.');
  } catch {
    console.error('Backup preparation refused or failed. Check local prerequisites and private artifacts; no raw error is printed.');
    process.exitCode = 1;
  }
}
