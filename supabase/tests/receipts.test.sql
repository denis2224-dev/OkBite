begin;
select plan(7);
select has_table('public', 'contribution_receipts', 'private receipt table exists');
select ok((select relrowsecurity from pg_class
  where oid='public.contribution_receipts'::regclass), 'receipts have RLS');
select ok(not has_table_privilege('anon','public.contribution_receipts','SELECT'),
  'shoppers cannot read private upload receipts');
select ok(not has_table_privilege('authenticated','public.contribution_receipts','SELECT'),
  'staff sessions cannot read device receipts');
select ok(not has_table_privilege('anon','public.contribution_receipts','INSERT'),
  'shoppers cannot forge receipts');
select ok(not has_function_privilege('authenticated',
  'public.commit_product(jsonb,jsonb,bigint)','EXECUTE'), 'RPC remains service-only');
select ok(has_table_privilege('service_role','public.contribution_receipts','SELECT'),
  'server can recover before reserving quota');
select * from finish();
rollback;
