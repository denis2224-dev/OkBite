begin;
select plan(24);
insert into categories (slug, name, score_kind) values ('apa', 'Apă', 'water') on conflict (slug) do nothing;
insert into categories (slug, name, score_kind) values ('iaurt', 'Iaurt', 'general') on conflict (slug) do nothing;

insert into auth.users(id) values ('d0000000-0000-4000-8000-000000000001') on conflict do nothing;
insert into public.moderators values ('d0000000-0000-4000-8000-000000000001') on conflict do nothing;

select has_table('public', 'water_submissions', 'water_submissions table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.water_submissions'::regclass), 'water_submissions has RLS');
select ok(not has_table_privilege('anon', 'public.water_submissions', 'SELECT'), 'anon cannot read water_submissions');
select ok(
  not has_column_privilege('authenticated', 'public.water_submissions', 'device_id', 'SELECT'),
  'authenticated clients cannot read submission device_id'
);
select ok(has_table_privilege('service_role', 'public.water_submissions', 'SELECT'), 'service_role can read water_submissions');

-- Seed an unverified partial water (created by device 1) and a verified water, plus upload objects.
insert into products (id, status, name, brand, quantity, category_slug, unit, water, ingredients_text, source, added_by_device)
values
  ('d0000000-0000-4000-8000-000000000010', 'unverified', 'Apă Parțială', 'BrandA', '1,5 L', 'apa', 'ml',
    '{"tdsMgL": 375, "dryResidueMgL": null, "ph": null, "carbonation": "still", "classification": "drinking", "caMgL": null, "mgMgL": null, "naMgL": null, "kMgL": null, "naPlusKMgL": null, "hco3MgL": null, "so4MgL": null, "clMgL": null, "fMgL": null, "no3MgL": null, "bMgL": null, "h3bo3MgL": null, "iUgL": null}'::jsonb,
    '', 'Fotografiile utilizatorului', 'd1111111-1111-4111-8111-111111111111'),
  ('d0000000-0000-4000-8000-000000000011', 'verified', 'OM Plată', 'OM', '1,5 L', 'apa', 'ml',
    '{"tdsMgL": 375, "dryResidueMgL": 305, "ph": 6.56, "carbonation": "still", "classification": "drinking", "caMgL": 32.5, "mgMgL": 12.5, "naMgL": null, "kMgL": null, "naPlusKMgL": 72.5, "hco3MgL": 140, "so4MgL": 115, "clMgL": 15.5, "fMgL": null, "no3MgL": null, "bMgL": null, "h3bo3MgL": null, "iUgL": null}'::jsonb,
    '', 'apaom.md', null),
  ('d0000000-0000-4000-8000-000000000012', 'unverified', 'Iaurt', 'BrandF', '100 g', 'iaurt', 'g',
    null, 'lapte', 'Fotografiile utilizatorului', 'd1111111-1111-4111-8111-111111111111');

insert into storage.objects(bucket_id, name) values
  ('uploads', 'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000001-nutrition.jpg'),
  ('uploads', 'd3333333-3333-4333-8333-333333333333/00000000-0000-4000-8000-000000000002-nutrition.jpg'),
  ('uploads', 'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000003-nutrition.jpg'),
  ('uploads', 'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000004-nutrition.jpg');

-- Device 2 fills missing caMgL (32.5) and explicit 0 no3MgL on the unverified water.
do $$
declare ev bigint;
begin
  ev := public.reserve_usage('d2222222-2222-4222-8222-222222222222', 'added');
  perform public.enrich_product(
    'd0000000-0000-4000-8000-000000000010',
    'd2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000001-nutrition.jpg',
    'nutrition-aaaa1111aaaa1111aaaa',
    ev,
    null,
    null
  );
  perform public.enrich_product(
    'd0000000-0000-4000-8000-000000000010',
    'd2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000001-nutrition.jpg',
    'nutrition-aaaa1111aaaa1111aaaa',
    ev,
    '{"water":{"caMgL":32.5,"no3MgL":0}}'::jsonb,
    'ml'
  );
end $$;

select is(
  (select water->>'caMgL' from products where id = 'd0000000-0000-4000-8000-000000000010'),
  '32.5', 'second device immediately fills missing caMgL on unverified bottle'
);
select is(
  (select water->>'no3MgL' from products where id = 'd0000000-0000-4000-8000-000000000010'),
  '0', 'explicit 0 is stored cleanly and not treated as null'
);
select is(
  (select water->'evidence'->'caMgL'->>'status' from products where id = 'd0000000-0000-4000-8000-000000000010'),
  'unverified', 'second-device fill is stamped as unverified evidence'
);

-- Device 3 submits a conflicting reading for caMgL (88 vs 32.5) and fills mgMgL (12.5).
do $$
declare ev bigint;
begin
  ev := public.reserve_usage('d3333333-3333-4333-8333-333333333333', 'added');
  perform public.enrich_product(
    'd0000000-0000-4000-8000-000000000010',
    'd3333333-3333-4333-8333-333333333333',
    'd3333333-3333-4333-8333-333333333333/00000000-0000-4000-8000-000000000002-nutrition.jpg',
    'nutrition-bbbb2222bbbb2222bbbb',
    ev,
    null,
    null
  );
  perform public.enrich_product(
    'd0000000-0000-4000-8000-000000000010',
    'd3333333-3333-4333-8333-333333333333',
    'd3333333-3333-4333-8333-333333333333/00000000-0000-4000-8000-000000000002-nutrition.jpg',
    'nutrition-bbbb2222bbbb2222bbbb',
    ev,
    '{"water":{"caMgL":88,"mgMgL":12.5}}'::jsonb,
    'ml'
  );
end $$;

select is(
  (select water->>'caMgL' from products where id = 'd0000000-0000-4000-8000-000000000010'),
  '32.5', 'conflicting write preserves existing caMgL on product'
);
select is(
  (select water->>'mgMgL' from products where id = 'd0000000-0000-4000-8000-000000000010'),
  '12.5', 'non-conflicting missing mgMgL from same submission is still applied'
);
select is(
  (select count(*) from public.water_submissions where product_id = 'd0000000-0000-4000-8000-000000000010' and kind = 'conflict' and status = 'pending'),
  1::bigint, 'conflicting reading queued in water_submissions'
);
select is(
  (select proposed_water->>'caMgL' from public.water_submissions where product_id = 'd0000000-0000-4000-8000-000000000010' and kind = 'conflict' and status = 'pending' limit 1),
  '88', 'pending conflict retains second device reading alongside first device reading on product'
);
select is(
  (select count(*) from public.enrichment_receipts where product_id = 'd0000000-0000-4000-8000-000000000010'),
  2::bigint, 'enrichment_receipts allows multiple devices on the same water product'
);

-- Submission against verified product keeps products.water untouched and queues verified_update.
do $$
declare ev bigint;
begin
  ev := public.reserve_usage('d2222222-2222-4222-8222-222222222222', 'added');
  perform public.enrich_product(
    'd0000000-0000-4000-8000-000000000011',
    'd2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000003-nutrition.jpg',
    'nutrition-cccc3333cccc3333cccc',
    ev,
    null,
    null
  );
  perform public.enrich_product(
    'd0000000-0000-4000-8000-000000000011',
    'd2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000003-nutrition.jpg',
    'nutrition-cccc3333cccc3333cccc',
    ev,
    '{"water":{"no3MgL":2,"tdsMgL":390}}'::jsonb,
    'ml'
  );
end $$;

select is(
  (select water->>'no3MgL' from products where id = 'd0000000-0000-4000-8000-000000000011'),
  null, 'verified product is never directly mutated by shopper submission'
);
select is(
  (select kind || ':' || status from public.water_submissions where product_id = 'd0000000-0000-4000-8000-000000000011' limit 1),
  'verified_update:pending', 'verified product change goes to pending moderation queue'
);

-- Moderator resolves conflict and verified_update cleanly.
select lives_ok(
  $$select public.moderate_product('d0000000-0000-4000-8000-000000000001', 'resolve_water_submission',
    (select id from public.water_submissions where product_id = 'd0000000-0000-4000-8000-000000000010' and kind = 'conflict' limit 1),
    null, null, 'accept')$$,
  'moderator can accept conflicting water submission'
);
select is(
  (select water->>'caMgL' from products where id = 'd0000000-0000-4000-8000-000000000010'),
  '88', 'accepted submission updates caMgL'
);
select is(
  (select water->'evidence'->'caMgL'->>'status' from products where id = 'd0000000-0000-4000-8000-000000000010'),
  'verified', 'accepted submission stamps field evidence as verified'
);
select lives_ok(
  $$select public.moderate_product('d0000000-0000-4000-8000-000000000001', 'resolve_water_submission',
    (select id from public.water_submissions where product_id = 'd0000000-0000-4000-8000-000000000011' limit 1),
    null, null, 'reject')$$,
  'moderator can reject verified_update'
);
select is(
  (select water->>'tdsMgL' from products where id = 'd0000000-0000-4000-8000-000000000011'),
  '375', 'rejected submission preserves verified tdsMgL'
);

-- Non-water (food) keeps strict single-device rule.
select throws_ok(
  $$select public.enrich_product(
    'd0000000-0000-4000-8000-000000000012',
    'd2222222-2222-4222-8222-222222222222',
    'd2222222-2222-4222-8222-222222222222/00000000-0000-4000-8000-000000000004-nutrition.jpg',
    'nutrition-dddd4444dddd4444dddd',
    null,
    null,
    null
  )$$,
  'P0003', 'Product cannot be enriched', 'food products still reject foreign-device enrichment'
);

select throws_ok(
  $$insert into products (id, status, name, brand, quantity, category_slug, unit, water, ingredients_text, source)
    values ('d0000000-0000-4000-8000-000000000098', 'unverified', 'Bad', 'Test', '500 ml', 'apa', 'ml', '[]'::jsonb, '', 'test')$$,
  '23514', null, 'water column still rejects non-object jsonb'
);

set local role authenticated;
select is(
  (select count(*) from public.water_submissions),
  0::bigint, 'non-moderator authenticated users cannot read pending water submissions'
);
reset role;
select throws_ok(
  $$select public.moderate_product('d9999999-9999-4999-8999-999999999999', 'resolve_water_submission',
    (select id from public.water_submissions limit 1), null, null, 'accept')$$,
  '42501', 'Unauthorized', 'non-moderator cannot resolve water submissions'
);

select * from finish();
rollback;
