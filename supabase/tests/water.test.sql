begin;
select plan(4);
insert into categories (slug, name, score_kind) values ('apa', 'Apă', 'water') on conflict (slug) do nothing;
insert into products (id, status, name, brand, quantity, category_slug, unit, water, ingredients_text, source)
values ('00000000-0000-4000-8000-000000000099', 'unverified', 'Apă Plată', 'Test', '500 ml', 'apa', 'ml', '{"tdsMgL": 375}'::jsonb, '', 'test');

select throws_ok(
  $$insert into products (id, status, name, brand, quantity, category_slug, unit, water, ingredients_text, source)
    values ('00000000-0000-4000-8000-000000000098', 'unverified', 'Bad', 'Test', '500 ml', 'apa', 'ml', '[]'::jsonb, '', 'test')$$,
  '23514', null, 'water column rejects non-object jsonb'
);

set local role anon;
select is(
  (select water->>'tdsMgL' from products where id = '00000000-0000-4000-8000-000000000099'),
  '375', 'anon can read public water profile'
);

reset role;
set local role authenticated;
select is(
  (select water->>'tdsMgL' from products where id = '00000000-0000-4000-8000-000000000099'),
  '375', 'authenticated can read public water profile'
);

reset role;
select is(has_function_privilege('anon', 'public.commit_product(jsonb,jsonb,bigint)', 'EXECUTE'), false, 'anon cannot execute commit_product');

select * from finish();
rollback;
