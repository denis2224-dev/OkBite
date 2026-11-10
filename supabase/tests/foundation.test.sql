-- Foundation guarantees apply to every write path, including privileged imports.
begin;
select plan(29);

select throws_ok(format(
  'update public.products set %I = %L::numeric where code = ''4840001000014''',
  nutrient, invalid), '23514', null, nutrient || ' rejects ' || invalid)
from unnest(array['kcal','fat','sat','sugar','salt','protein','fiber']) nutrient
cross join unnest(array['-0.1','NaN','Infinity']) invalid;

select lives_ok($$
  update public.products set kcal=0,fat=0,sat=0,sugar=0,salt=0,protein=0,fiber=0
  where code='4840001000014'
$$, 'zero nutrients remain valid');
select lives_ok($$
  update public.products set kcal=null,fat=null,sat=null,sugar=null,salt=null,
    protein=null,fiber=null where code='4840001000014'
$$, 'missing nutrients remain null');

select is((select prosecdef from pg_proc
  where oid='public.search_products(text,integer)'::regprocedure), false,
  'search uses caller privileges');
select is((select prosecdef from pg_proc
  where oid='public.is_moderator()'::regprocedure), false,
  'public moderator RPC uses caller privileges');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='is_moderator' and p.prosecdef),
  'privileged membership lookup is in the private schema');

-- A future restrictive policy must apply to searches as well as direct reads.
create policy foundation_search_scope on public.products as restrictive
  for select to anon using (brand <> 'Zorel');
set local role anon;
select is((select count(*) from public.search_products('zorel iaurt capsuni')),
  0::bigint, 'search obeys restrictive product RLS');
select throws_ok('select public.is_moderator()', '42501', null,
  'anonymous callers cannot execute moderator RPC');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
select is(public.is_moderator(),false,'signed-in nonmember cannot gain moderator access');
reset role;
select * from finish();
rollback;
