begin;
select plan(5);

select has_index('public', 'products', 'products_verified_category', array['category_slug']);
select is(
  (select pg_get_expr(indpred, indrelid)
   from pg_index
   where indexrelid = to_regclass('public.products_verified_category')),
  '(status = ''verified''::text)',
  'the category index covers only verified products'
);

insert into public.categories (slug, name, score_kind)
values ('tap-shelf', 'Test shelf', 'general'),
       ('tap-shelf-empty', 'Empty test shelf', 'general'),
       ('tap-shelf-other', 'Other test shelf', 'general');

insert into public.products (name, brand, quantity, category_slug, unit, ingredients_text, source, status)
values ('Shelf verified', 'Test', '', 'tap-shelf', 'g', '', 'test', 'verified'),
       ('Shelf unverified', 'Test', '', 'tap-shelf', 'g', '', 'test', 'unverified'),
       ('Shelf hidden', 'Test', '', 'tap-shelf', 'g', '', 'test', 'hidden'),
       ('Other shelf verified', 'Test', '', 'tap-shelf-other', 'g', '', 'test', 'verified');

set local role anon;
select results_eq(
  $$select name from public.products where category_slug = 'tap-shelf' order by name$$,
  array['Shelf unverified', 'Shelf verified'],
  'anon can read shelf products except hidden ones'
);
select results_eq(
  $$select name from public.products where category_slug = 'tap-shelf' and status = 'verified'$$,
  array['Shelf verified'],
  'the shelf query returns only verified products in the requested category'
);
select is_empty(
  $$select id from public.products where category_slug = 'tap-shelf-empty' and status = 'verified'$$,
  'an existing empty shelf returns no products'
);

select * from finish();
rollback;
