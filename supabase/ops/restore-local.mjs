import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, chmodSync, openSync, closeSync, realpathSync, fchmodSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { localProject } from '../local-project.mjs';

// Local Docker only. Never accepts a hosted URL, source database or container override.
const config = readFileSync(new URL('../config.toml', import.meta.url), 'utf8');
const project = localProject(config);
const port = config.match(/\[db\]\s*\nport\s*=\s*(\d+)/)?.[1];
if (!project || !port) throw new Error('Expected an explicit OkBite local project and DB port');
const container = `supabase_db_${project}`;
const target = `okbite_restore_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const directory = resolve(process.argv[2] ?? join(tmpdir(), target));
mkdirSync(directory, { recursive: true, mode: 0o700 });
const repository = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const actual = realpathSync(directory);
if (actual === repository || actual.startsWith(repository + sep)) throw new Error('Backups must stay outside the repository');
chmodSync(directory, 0o700);
const archive = join(directory, 'application.dump');
function run(command, args, { input, stdinFile, stdoutFile, env } = {}) {
  const source = stdinFile ? openSync(stdinFile, 'r') : null;
  const destination = stdoutFile ? openSync(stdoutFile, 'w', 0o600) : null;
  try {
    if (destination !== null) fchmodSync(destination, 0o600);
    const result = spawnSync(command, args, { input, env, maxBuffer: 16 * 1024 * 1024,
      stdio: [source ?? 'pipe', destination ?? 'pipe', 'pipe'] });
    if (result.status !== 0) throw new Error(result.stderr?.toString() || result.error?.message || 'Command failed');
    return result.stdout?.toString() ?? '';
  } finally { if (source !== null) closeSync(source); if (destination !== null) closeSync(destination); }
}
const docker = (command, options) => run('docker', ['exec', '-i', container, 'sh', '-c',
  `export PGPASSWORD="$POSTGRES_PASSWORD"; exec ${command}`], options);
const sql = (database, input) => docker(`psql -U supabase_admin -d ${database} -v ON_ERROR_STOP=1 -At`, { input });
const snapshot = (database) => sql(database, `select jsonb_build_object(
  'categories',(select count(*) from public.categories),'products',(select count(*) from public.products),'ingredients',(select count(*) from public.ingredients),
  'links',(select count(*) from public.product_ingredients),'reports',(select count(*) from public.reports),
  'moderators',(select count(*) from public.moderators),'events',(select count(*) from public.usage_events),
  'receipts',(select count(*) from public.contribution_receipts),
  'client_errors',(select count(*) from public.client_errors),'objects',(select count(*) from storage.objects),'users',(select count(*) from auth.users),'buckets',(select count(*) from storage.buckets));`);
const accessSnapshot = (database) => sql(database, `
  with namespaces as (
    select oid, nspname, nspowner, nspacl from pg_namespace
    where nspname in ('public','auth','storage','extensions')
  ), access as (
    select 'schema' kind, nspname::text identity, pg_get_userbyid(nspowner) owner, coalesce(nspacl,acldefault('n',nspowner)) acl from namespaces
    union all
    select 'relation', n.nspname || '.' || c.relname, pg_get_userbyid(c.relowner), coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))
      from pg_class c join namespaces n on n.oid=c.relnamespace
    union all
    select 'column', n.nspname || '.' || c.relname || '.' || a.attname, null, a.attacl
      from pg_attribute a join pg_class c on c.oid=a.attrelid join namespaces n on n.oid=c.relnamespace
      where a.attnum > 0 and not a.attisdropped and a.attacl is not null
    union all
    select 'routine', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
      pg_get_userbyid(p.proowner), coalesce(p.proacl,acldefault('f',p.proowner))
      from pg_proc p join namespaces n on n.oid=p.pronamespace
    union all
    select 'default', n.nspname || ':' || d.defaclobjtype::text || ':' || pg_get_userbyid(d.defaclrole),
      pg_get_userbyid(d.defaclrole), d.defaclacl
      from pg_default_acl d join namespaces n on n.oid=d.defaclnamespace
  ) select jsonb_agg(jsonb_build_object('kind',kind,'identity',identity,'owner',owner,
    'acl',(select jsonb_agg(x::text order by x::text) from unnest(acl) x)) order by kind,identity)::text from access;`);
// pg_dump omits extension members; replay their source grants after recreation.
const supplementalGrants = () => sql('postgres', `
  with objects as (
    select 'schema' kind, format('%I',nspname) identity, coalesce(nspacl,acldefault('n',nspowner)) acl
      from pg_namespace where nspname in ('public','auth','storage','extensions')
    union all
    select case when c.relkind='S' then 'sequence' else 'table' end,
      format('%I.%I',n.nspname,c.relname),coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname in ('public','auth','storage','extensions') and c.relkind in ('r','v','m','S','f','p')
        and exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
    union all
    select 'function', format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),
      coalesce(p.proacl,acldefault('f',p.proowner)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname in ('public','auth','storage','extensions')
        and exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  ) select format('grant %s on %s %s to %s%s;',a.privilege_type,kind,identity,
    case when a.grantee=0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end,
    case when a.is_grantable then ' with grant option' else '' end)
    from objects cross join lateral aclexplode(acl) a order by kind,identity,a.grantee,a.privilege_type;`);
let created = false;
try {
  const before = snapshot('postgres');
  const accessBefore = accessSnapshot('postgres');
  const databaseOwner = sql('postgres', 'select pg_get_userbyid(datdba) from pg_database where datname=current_database();').trim();
  if (!/^[a-z_][a-z0-9_]*$/.test(databaseOwner)) throw new Error('Unsupported local database owner');
  const grants = supplementalGrants();
  writeFileSync(join(directory, 'supplemental-grants.sql'), grants, { mode: 0o600 });
  docker('pg_dump -U supabase_admin -d postgres --format=custom --schema=public --schema=auth --schema=storage --schema=extensions', { stdoutFile: archive });
  const extensions = sql('postgres', `select format('create extension if not exists %I with schema %I;',e.extname,n.nspname)
    from pg_extension e join pg_namespace n on n.oid=e.extnamespace
    where n.nspname in ('public','extensions') order by e.extname;`);
  writeFileSync(join(directory, 'extensions.sql'), extensions, { mode: 0o600 });
  docker(`createdb -U supabase_admin --owner=${databaseOwner} --template=template0 ${target}`); created = true;
  if (sql(target, 'select pg_get_userbyid(datdba) from pg_database where datname=current_database();').trim() !== databaseOwner) {
    throw new Error('Restored database owner differs');
  }
  sql(target, 'drop schema public;');
  docker(`pg_restore -U supabase_admin -d ${target} --exit-on-error --section=pre-data`, { stdinFile: archive });
  sql(target, extensions);
  docker(`pg_restore -U supabase_admin -d ${target} --exit-on-error --section=data`, { stdinFile: archive });
  docker(`pg_restore -U supabase_admin -d ${target} --exit-on-error --section=post-data`, { stdinFile: archive });
  sql(target, grants);
  if (snapshot(target) !== before) throw new Error('Restored application/Auth/Storage counts differ');
  if (accessSnapshot(target) !== accessBefore) throw new Error('Restored owners or grants differ');
  const tests = run(process.env.SUPABASE_CLI_BIN ?? 'supabase', ['test', 'db', '--db-url',
    `postgresql://postgres:postgres@127.0.0.1:${port}/${target}?sslmode=disable`],
    // CLI 2.65.5 drops URL sslmode while rebuilding connection options.
    // This subprocess always targets the guarded local disposable database.
    { env: { ...process.env, PGSSLMODE: 'disable' } });
  process.stdout.write(tests);
  const report = { date: new Date().toISOString(), scope: 'Local application/Auth/Storage schemas; not hosted recovery',
    project, databaseOwner, restoredDatabase: target, counts: JSON.parse(before), archive,
    archiveSha256: createHash('sha256').update(readFileSync(archive)).digest('hex'),
    pgTap: 'passed', ownersAndGrants: 'matched source schemas, relations, columns, routines and defaults', storageFiles: 'Separate binary round-trip required; SQL does not contain photo bytes',
    staging: 'pending: local-only drill does not establish hosted recovery' };
  writeFileSync(join(directory, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(`Local restore verified. Private evidence: ${directory}`);
} finally {
  if (created) docker(`dropdb -U supabase_admin ${target}`);
}
