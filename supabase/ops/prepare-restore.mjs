import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGING_REF, verify } from './backup.mjs';

const knownPorts = new Set([54321, 54322, 54323, 54324, 54325, 54326, 54327,
  58431, 58432, 59431, 59432]);
function one(text, expression, label) {
  const matches = [...text.matchAll(expression)];
  assert.equal(matches.length, 1, `Require one explicit ${label}`);
  return matches[0][1];
}
function endpoint(value, protocol, port, path) {
  const url = new URL(value);
  assert.ok(url.protocol === protocol && url.hostname === '127.0.0.1' &&
    Number(url.port) === port && url.pathname === path && !url.username && !url.password &&
    !url.search && !url.hash, 'Refusing hosted, mismatched or credential-bearing endpoint');
}
// Writes a review plan and copied config only. Never invokes Docker, CLI or psql.
export function prepareRestore(target, destination, now = Date.now()) {
  assert.ok(isAbsolute(target.config) && isAbsolute(destination), 'Use absolute private paths');
  const archive = verify(target.backupDirectory);
  assert.equal(archive.source, STAGING_REF, 'Drill accepts only a verified staging-derived archive');
  const config = readFileSync(target.config, 'utf8');
  const project = one(config, /^project_id\s*=\s*"([a-z0-9-]+)"\s*$/gm, 'project');
  assert.match(project, /^okbite-drill-[a-f0-9]{12}$/, 'Refusing existing/source/production project identity');
  assert.ok(!existsSync(join(dirname(target.config), '.temp/project-ref')) &&
    !/^\s*(?:\[remotes[.\]]|project_ref\s*=)/m.test(config) && !target.linkedRef, 'Refusing linked target');
  const section = name => one(config, new RegExp(`^\\[${name}\\]\\s*\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))`, 'gm'), name);
  const apiPort = Number(one(section('api'), /^port\s*=\s*(\d+)\s*$/gm, 'API port'));
  const dbPort = Number(one(section('db'), /^port\s*=\s*(\d+)\s*$/gm, 'DB port'));
  assert.ok([apiPort, dbPort].every(port => Number.isInteger(port) && port >= 1024 && port <= 65535 && !knownPorts.has(port)) &&
    apiPort !== dbPort, 'Refusing known or invalid port');
  endpoint(target.apiUrl, 'http:', apiPort, '/');
  endpoint(target.dbUrl, 'postgresql:', dbPort, '/postgres');
  const evidence = target.evidence;
  const age = now - Date.parse(evidence.inspectedAt);
  assert.ok(Number.isFinite(age) && age >= 0 && age <= 5 * 60 * 1000, 'Require fresh resource evidence (within five minutes)');
  assert.equal(evidence.project, project, 'Resource evidence project mismatch');
  for (const field of ['containers', 'volumes', 'listeningPorts']) assert.ok(Array.isArray(evidence[field]), 'Missing resource evidence');
  assert.ok([...evidence.containers, ...evidence.volumes].every(name => typeof name === 'string' && !name.includes(project)) &&
    evidence.listeningPorts.every(port => Number.isInteger(port) && port !== apiPort && port !== dbPort), 'Target resources or ports already used');
  const parent = realpathSync(dirname(destination));
  const actual = join(parent, destination.split(sep).at(-1));
  const backup = realpathSync(target.backupDirectory);
  assert.ok(actual !== backup && !actual.startsWith(backup + sep), 'Do not modify the source archive directory');
  const repository = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  assert.ok(actual !== repository && !actual.startsWith(repository + sep), 'Destination must be outside repository');
  assert.ok(!existsSync(actual) && !lstatSync(dirname(destination)).isSymbolicLink(), 'Destination must not exist or reuse a link');
  const plan = { kind: 'prepare-only', status: 'blocked-until-second-operator-review', source: STAGING_REF,
    project, apiPort, database: { host: '127.0.0.1', port: dbPort, name: 'postgres' },
    preparedAt: new Date(now).toISOString(), evidence,
    gates: ['Recheck actual Docker containers/volumes and listening ports immediately before start',
      'Verify bootstrap/version, outbound isolation, verified archive and reviewed SQL',
      'After start verify actual API/DB container identity and ports; second operator approves before SQL'],
    commands: [['supabase', 'start', '--workdir', actual], ['psql', '--host', '127.0.0.1', '--port', String(dbPort),
      '--username', 'postgres', '--dbname', 'postgres', '--single-transaction', '--set', 'ON_ERROR_STOP=1',
      '--file', 'reviewed-roles.sql', '--file', 'reviewed-schema.sql', '--command', 'SET session_replication_role = replica',
      '--file', 'reviewed-data.sql', '--file', 'history-schema.sql', '--file', 'history-data.sql']] };
  mkdirSync(actual, { mode: 0o700 });
  mkdirSync(join(actual, 'supabase'), { mode: 0o700 });
  writeFileSync(join(actual, 'supabase/config.toml'), config, { flag: 'wx', mode: 0o600 });
  writeFileSync(join(actual, 'restore-plan.json'), JSON.stringify(plan, null, 2), { flag: 'wx', mode: 0o600 });
  return plan;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 4, 'Supply target descriptor and fresh directory');
    prepareRestore(JSON.parse(readFileSync(process.argv[2], 'utf8')), process.argv[3]);
    console.log('Prepared local restore review plan; no services or restore commands executed.');
  } catch {
    console.error('Restore preparation refused. Review target, fresh resource evidence and private paths.');
    process.exitCode = 1;
  }
}
