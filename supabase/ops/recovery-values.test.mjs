import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { localProject } from '../local-project.mjs';

// Run from the copied disposable project only, never a hosted connection string.
test('recovery comparison detects changed values with identical row counts', {
  skip: process.env.OKBITE_RECOVERY_VALUES_TEST !== '1',
}, () => {
  const project = localProject(readFileSync(new URL('../config.toml', import.meta.url), 'utf8'));
  const snapshot = readFileSync(new URL('./recovery-values.sql', import.meta.url), 'utf8');
  const result = spawnSync('docker', ['exec', '-i', `supabase_db_${project}`, 'sh', '-c',
    'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -XqAt -U supabase_admin -d postgres -v ON_ERROR_STOP=1'], {
    encoding: 'utf8', input: `begin;
      create table public.c8_recovery_probe (name text, nutrient numeric, path text, product uuid);
      insert into public.c8_recovery_probe values ('fixture',12.3,'original.jpg','00000000-0000-4000-8000-000000000001');
      ${snapshot}
      update public.c8_recovery_probe set nutrient=12.4, path='changed.jpg', product='00000000-0000-4000-8000-000000000002';
      ${snapshot}
      rollback;`,
  });
  assert.equal(result.status, 0, result.stderr);
  const rows = result.stdout.trim().split('\n').map(line => JSON.parse(line));
  const probe = rows.filter(row => row.relation === 'public.c8_recovery_probe');
  assert.equal(probe.length, 2);
  assert.equal(probe[0].count, probe[1].count);
  assert.notEqual(probe[0].sha256, probe[1].sha256);
  assert.ok(rows.some(row => row.relation === 'supabase_migrations.schema_migrations'));
});
