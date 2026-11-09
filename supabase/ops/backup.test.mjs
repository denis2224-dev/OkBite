import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportStaging, exportProduction, seal, verify, STAGING_REF, PRODUCTION_REF } from './backup.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'okbite-backup-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repository = join(root, 'repo');
  mkdirSync(join(repository, 'supabase/.temp'), { recursive: true });
  writeFileSync(join(repository, 'supabase/.temp/project-ref'), STAGING_REF);
  const calls = [];
  const run = (args) => {
    calls.push(args);
    if (args[0] === '--version') return '3.0.0\n';
    if (args.includes('--file')) writeFileSync(args.at(-1), '-- fixture SQL');
    if (args[1] === 'cp') writeFileSync(join(args.at(-1), 'photo.jpg'), 'fixture bytes');
    return 'fixture listing';
  };
  return { root, repository, directory: join(root, 'export'), calls, run };
}
function evidence(directory, count = 1, source = STAGING_REF) {
  const snapshot = { source, counts: { 'public.products': 1,
    'public.contribution_receipts': count, 'auth.users': 0, 'storage.objects': 2,
    'storage.buckets': 2 }, receiptMap: 'a'.repeat(64), accessSha256: 'b'.repeat(64),
    extensionsSha256: 'c'.repeat(64), objects: ['uploads', 'products'].map(bucket =>
      ({ bucket, name: 'photo.jpg', bytes: Buffer.byteLength('fixture bytes') })) };
  for (const name of ['source-before.json', 'source-after.json']) {
    writeFileSync(join(directory, name), JSON.stringify(snapshot));
  }
}
test('production export binds explicit production identity; staging/production cross-targets fail before output', t => {
  const f = fixture(t);
  assert.throws(() => exportProduction(f.directory, f), /project/);
  assert.equal(f.calls.length, 0);
  writeFileSync(join(f.repository, 'supabase/.temp/project-ref'), PRODUCTION_REF);
  assert.throws(() => exportStaging(f.directory, f), /staging/);
  exportProduction(f.directory, f);
  assert.ok(f.calls.filter(args => args[0] !== '--version').every(args => args.includes(`--remote=${PRODUCTION_REF}`)));
  evidence(f.directory);
  assert.throws(() => seal(f.directory, f.repository), /Wrong evidence source/);
  evidence(f.directory, 1, PRODUCTION_REF);
  seal(f.directory, f.repository);
  assert.equal(verify(f.directory, f.repository).source, PRODUCTION_REF);
});
test('export is staging-only, read-only, private and refuses existing or repository destinations', t => {
  const f = fixture(t);
  exportStaging(f.directory, f);
  assert.equal(statSync(f.directory).mode & 0o777, 0o700);
  assert.ok(f.calls.filter(args => args[0] !== '--version').every(args => args.includes(`--remote=${STAGING_REF}`)));
  assert.ok(f.calls.every(args => args[0] === '--version' ||
    ['db dump', 'storage ls', 'storage cp'].includes(args.slice(0, 2).join(' '))));
  assert.ok(f.calls.filter(args => args[1] === 'cp').every(args => args.at(-2).startsWith('ss:///')));
  assert.throws(() => exportStaging(f.directory, f), /exist/);
  assert.throws(() => exportStaging('relative-directory', f), /absolute/);
  assert.throws(() => exportStaging(join(f.repository, 'dump'), f), /repository/);
  symlinkSync(f.repository, join(f.root, 'alias'));
  assert.throws(() => exportStaging(join(f.root, 'alias/dump'), f), /repository/);
  writeFileSync(join(f.repository, 'supabase/.temp/project-ref'), 'production');
  assert.throws(() => exportStaging(join(f.root, 'wrong'), f), /staging/);
});
test('seal rejects same-count wrong object paths, byte lengths and duplicate object keys', t => {
  const f = fixture(t);
  exportStaging(f.directory, f);
  evidence(f.directory);
  rmSync(join(f.directory, 'uploads/photo.jpg'));
  writeFileSync(join(f.directory, 'uploads/wrong.jpg'), 'fixture bytes');
  assert.throws(() => seal(f.directory, f.repository), /object index/);
  rmSync(join(f.directory, 'uploads/wrong.jpg'));
  writeFileSync(join(f.directory, 'uploads/photo.jpg'), 'short');
  assert.throws(() => seal(f.directory, f.repository), /object index/);
  writeFileSync(join(f.directory, 'uploads/photo.jpg'), 'fixture bytes');
  for (const name of ['source-before.json', 'source-after.json']) {
    const value = JSON.parse(readFileSync(join(f.directory, name), 'utf8'));
    value.objects[1] = value.objects[0];
    writeFileSync(join(f.directory, name), JSON.stringify(value));
  }
  assert.throws(() => seal(f.directory, f.repository), /object index/);
});
test('unknown CLI, changing link and command failures leave no valid export and expose no command output', t => {
  const f = fixture(t);
  assert.throws(() => exportStaging(f.directory, { ...f, run: () => '2.65.5' }), /3.0.0/);
  const g = { ...f, directory: join(f.root, 'failed') };
  assert.throws(() => exportStaging(g.directory, { ...g, run: args => {
    if (args[0] === '--version') return '3.0.0';
    throw new Error('secret credential');
  } }), error => !error.message.includes('secret credential'));
  assert.throws(() => seal(g.directory, f.repository), /incomplete/);
  assert.throws(() => exportStaging(join(f.root, 'changed'), { ...f, run: args => {
    const result = f.run(args);
    if (args[0] === 'db') writeFileSync(join(f.repository, 'supabase/.temp/project-ref'), 'other');
    return result;
  } }), /staging/);
});
test('seal checks independently captured evidence; verify rejects corruption, missing/extra files and symlinks', t => {
  const f = fixture(t);
  exportStaging(f.directory, f);
  assert.throws(() => seal(f.directory, f.repository));
  evidence(f.directory);
  const before = readFileSync(join(f.directory, 'source-before.json'), 'utf8');
  evidence(f.directory, 2);
  writeFileSync(join(f.directory, 'source-before.json'), before);
  assert.throws(() => seal(f.directory, f.repository), /differ/);
  evidence(f.directory);
  const mapping = JSON.parse(before);
  mapping.receiptMap = 'd'.repeat(64);
  writeFileSync(join(f.directory, 'source-after.json'), JSON.stringify(mapping));
  assert.throws(() => seal(f.directory, f.repository), /differ/);
  evidence(f.directory);
  writeFileSync(join(f.directory, 'data.sql'), 'COPY public.future_table (id) FROM stdin;\n\\.\n');
  assert.throws(() => seal(f.directory, f.repository), /Missing recovery table count/);
  writeFileSync(join(f.directory, 'data.sql'), '-- fixture SQL');
  rmSync(join(f.directory, 'uploads/photo.jpg'));
  assert.throws(() => seal(f.directory, f.repository), /photo count/);
  writeFileSync(join(f.directory, 'uploads/photo.jpg'), 'fixture bytes');
  seal(f.directory, f.repository);
  assert.equal(verify(f.directory, f.repository).source, STAGING_REF);
  const photo = join(f.directory, 'uploads/photo.jpg');
  writeFileSync(photo, 'changed');
  assert.throws(() => verify(f.directory, f.repository), /integrity/);
  writeFileSync(photo, 'fixture bytes');
  writeFileSync(join(f.directory, 'extra'), 'unexpected');
  assert.throws(() => verify(f.directory, f.repository), /integrity/);
  rmSync(join(f.directory, 'extra'));
  rmSync(photo);
  assert.throws(() => verify(f.directory, f.repository), /integrity/);
  symlinkSync(join(f.directory, 'data.sql'), photo);
  assert.throws(() => verify(f.directory, f.repository), /symlink/);
});
