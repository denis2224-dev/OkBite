begin;
select plan(15);
select has_function('public','search_products',array['text','integer']);
insert into products (name,brand,quantity,category_slug,unit,ingredients_text,source,status)
values ('Brânză','Test','','iaurt','g','','test','verified'),
       ('Iaurt cu căpșuni 2%','Zorel','','iaurt','g','','test','hidden');
insert into products (name,brand,quantity,category_slug,unit,ingredients_text,source)
select 'Iaurt '||n,'','','iaurt','g','','test' from generate_series(1,5) n;
set local role anon;
select is((select count(*) from search_products('iaurt')),3::bigint,'default limit is three');
select is((select name from search_products('zorel iaurt capsuni') limit 1),'Iaurt cu căpșuni 2%','strawberry ranks first');
select ok((select similarity >= 0.35 from search_products('zorel iaurt capsuni') limit 1),'threshold');
select is((select name from search_products('branza') limit 1),'Brânză','folds diacritics');
select results_eq($$select id from search_products('ZOREL IAURT CĂPȘUNI')$$,$$select id from search_products('zorel iaurt capsuni')$$,'case and accent equivalent');
select is((select count(*) from search_products('zorel iaurt capsuni')),1::bigint,'hidden exact duplicate excluded');
select is((select count(*) from search_products('iaurt',999)),3::bigint,'upper limit clamped');
select is((select count(*) from search_products('iaurt',0)),0::bigint,'zero limit');
select is((select count(*) from search_products('iaurt',-1)),0::bigint,'negative limit clamped');
select is((select count(*) from search_products('iaurt',null)),3::bigint,'null limit bounded');
select is((select count(*) from search_products('')),0::bigint,'empty query');
select is((select count(*) from search_products(null)),0::bigint,'null query');
select ok(not exists(select 1 from (select similarity, lag(similarity) over () previous from search_products('iaurt')) ranked where previous < similarity),'ranked by descending similarity');
set local pg_trgm.similarity_threshold = 0.9;
select is((select count(*) from search_products('zorel iaurt capsuni')),1::bigint,'function pins threshold independently of caller');
select * from finish();
rollback;
