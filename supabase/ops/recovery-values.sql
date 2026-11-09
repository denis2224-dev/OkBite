-- psql -XqAt: hash complete canonical rows, retaining duplicates and NULLs.
-- No row values leave PostgreSQL. Local fixture/restore comparison only.
select format(
  'select jsonb_build_object(''relation'',%L,''count'',count(*),''sha256'',encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(%s,''UTF8'')),''hex''),'''' order by %s collate "C"),''''),''UTF8'')),''hex'')) from %I.%I t;',
  n.nspname || '.' || c.relname,
  case when c.relkind='S' then 'jsonb_build_object(''last_value'',t.last_value,''is_called'',t.is_called)::text' else 'to_jsonb(t)::text' end,
  case when c.relkind='S' then 'jsonb_build_object(''last_value'',t.last_value,''is_called'',t.is_called)::text' else 'to_jsonb(t)::text' end,
  n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private','auth','storage','extensions','supabase_migrations')
  and c.relkind in ('r','p','S')
order by n.nspname collate "C", c.relname collate "C"
\gexec
