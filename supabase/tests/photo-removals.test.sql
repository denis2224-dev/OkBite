begin;
select plan(12);
-- A prior completed withdrawal must not change this fixture's retry assertions.
insert into public.photo_removals(product_id,bucket_id,path,completed_at)
values('cc000000-0000-4000-8000-000000000004','products','unrelated/retained.jpg',now());
select has_table('public','photo_removals','durable photo removal queue exists');
select ok(not has_table_privilege('authenticated','public.products','UPDATE'), 'even current moderators cannot bypass moderation transaction');
insert into auth.users(id) values ('cc000000-0000-4000-8000-000000000001');
insert into public.moderators values ('cc000000-0000-4000-8000-000000000001');
insert into public.products(id,name,brand,quantity,category_slug,unit,ingredients_text,source,image_path,ingredients_photo_path,nutrition_photo_path)
values ('cc000000-0000-4000-8000-000000000002','Fixture','','','iaurt','g','test','test','shared/front.jpg','shared/ingredients.jpg','shared/nutrition.jpg'),
('cc000000-0000-4000-8000-000000000003','Shared','','','iaurt','g','test','test','shared/front.jpg',null,null);
insert into public.contribution_receipts values('device','device/ingredients.jpg','cc000000-0000-4000-8000-000000000002');
select lives_ok($$select public.moderate_product('cc000000-0000-4000-8000-000000000001','hide','cc000000-0000-4000-8000-000000000002',null,null,'test')$$,'hide queues storage work');
select is((select status from public.products where id='cc000000-0000-4000-8000-000000000002'),'hidden','hidden before deleting bytes');
select is((select count(*) from public.photo_removals where product_id='cc000000-0000-4000-8000-000000000002'),4::bigint,'all three public photos and receipt private original queued');
select is((select count(*) from public.products where image_path='shared/front.jpg'),0::bigint,'shared references cleared too');
select lives_ok($$select public.moderate_product('cc000000-0000-4000-8000-000000000001','hide','cc000000-0000-4000-8000-000000000002',null,null,'retry')$$,'repeat hide recovers pending work');
select is((select count(*) from public.photo_removals where product_id='cc000000-0000-4000-8000-000000000002'),4::bigint,'retries do not duplicate tombstones');
select throws_ok($$update public.products set image_path='shared/front.jpg' where id='cc000000-0000-4000-8000-000000000003'$$,'23514','Removed photo cannot be referenced','deleted public paths cannot be republished');
select throws_ok($$select public.moderate_product('cc000000-0000-4000-8000-000000000001','verify','cc000000-0000-4000-8000-000000000002','{}','[]',null)$$,'P0002','Not found','verify is not an unhide action');
delete from public.moderators where user_id='cc000000-0000-4000-8000-000000000001';
select throws_ok($$select public.moderate_product('cc000000-0000-4000-8000-000000000001','hide','cc000000-0000-4000-8000-000000000002',null,null,'retry')$$,'42501','Unauthorized','revocation blocks existing identity');
select ok(not has_table_privilege('anon','public.photo_removals','SELECT'),'queue paths stay private');
select * from finish();
rollback;
