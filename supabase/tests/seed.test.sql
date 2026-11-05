-- Snapshots from docs/prototype/Main.dc.html P, not simulated OCR or demo scores.
begin;
select plan(7);
select is((select count(*) from products),6::bigint,'exactly six demo fixtures');
select results_eq($$select code,name,brand,quantity,category_slug,unit,portion_amount,portion_label,
 kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct from products order by code$$,
 $$values
('4840001000014','Iaurt natural 2,5%','Livada Verde','400 g','iaurt','g',150::numeric,'1 pahar · 150 g',63::numeric,2.5::numeric,1.6::numeric,4.1::numeric,0.1::numeric,3.6::numeric,0::numeric,null::numeric),
('4840001000021','Iaurt cu căpșuni 2%','Zorel','400 g','iaurt','g',150::numeric,'1 pahar · 150 g',98::numeric,2::numeric,1.3::numeric,13.2::numeric,0.12::numeric,2.9::numeric,0.2::numeric,null::numeric),
('4840001000038','Iaurt grecesc 10%','Stâna Mică','300 g','iaurt','g',150::numeric,'1 porție · 150 g',133::numeric,10::numeric,6.6::numeric,3.5::numeric,0.1::numeric,5.2::numeric,0::numeric,null::numeric),
('4840001000045','Biscuiți de ovăz cu ciocolată','Ovăzel','180 g','biscuiti','g',30::numeric,'3 biscuiți · 30 g',478::numeric,21::numeric,9.8::numeric,26::numeric,0.7::numeric,7::numeric,5.1::numeric,null::numeric),
('4840001000052','Suc de mere 100%','Grădina Sudului','1 L','suc','ml',250::numeric,'1 pahar · 250 ml',46::numeric,0.1::numeric,null,null,null,0.1::numeric,null,null::numeric),
('4840001000069','Biscuiți integrali cu ovăz','Morărița','200 g','biscuiti','g',30::numeric,'3 biscuiți · 30 g',445::numeric,15::numeric,2.1::numeric,14::numeric,0.5::numeric,8.5::numeric,7.8::numeric,null::numeric)$$,'prototype identity, portions and nullable nutrients');
select results_eq($$select code,allergens,may_contain,ingredients_text from products order by code$$,
 $$values
('4840001000014',array['Lapte']::text[],array[]::text[],'lapte normalizat (2,5% grăsime), culturi lactice vii.'),
('4840001000021',array['Lapte']::text[],array['Fructe cu coajă lemnoasă']::text[],'lapte normalizat, preparat de căpșuni 12% (căpșuni, zahăr, amidon modificat, gelifiant: pectină, colorant: carmin), zahăr, aromă naturală, culturi lactice vii.'),
('4840001000038',array['Lapte']::text[],array[]::text[],'lapte integral, smântână, culturi lactice vii.'),
('4840001000045',array['Gluten','Lapte','Soia']::text[],array['Ouă','Arahide']::text[],'fulgi de ovăz 32%, făină de grâu, zahăr, ulei de palmier, ciocolată 15% (zahăr, masă de cacao, unt de cacao, lapte praf, emulsifiant: lecitină din soia), agent de afânare: bicarbonat de sodiu, sare.'),
('4840001000052',array[]::text[],array[]::text[],'suc de mere din concentrat, antioxidant: acid ascorbic.'),
('4840001000069',array['Gluten']::text[],array['Lapte','Susan']::text[],'făină integrală de grâu 45%, fulgi de ovăz 20%, zahăr, ulei de floarea-soarelui, agent de afânare: bicarbonat de sodiu, sare.')$$,'prototype allergens, traces and label text');
select results_eq($$select p.code,array_agg(pi.raw_name order by pi.position) from products p
 join product_ingredients pi on pi.product_id=p.id group by p.code order by p.code$$,
 $$values
('4840001000014',array['Lapte normalizat','Culturi lactice vii']::text[]),
('4840001000021',array['Lapte normalizat','Preparat de căpșuni (12%)','Zahăr','Amidon modificat','Pectină (E440)','Carmin (E120)','Aromă naturală','Culturi lactice vii']::text[]),
('4840001000038',array['Lapte integral','Smântână','Culturi lactice vii']::text[]),
('4840001000045',array['Fulgi de ovăz (32%)','Făină de grâu','Zahăr','Ulei de palmier','Ciocolată (15%)','Lecitină din soia (E322)','Bicarbonat de sodiu (E500)','Sare']::text[]),
('4840001000052',array['Suc de mere din concentrat','Acid ascorbic (E300)']::text[]),
('4840001000069',array['Făină integrală de grâu (45%)','Fulgi de ovăz (20%)','Zahăr','Ulei de floarea-soarelui','Bicarbonat de sodiu (E500)','Sare']::text[])$$,'all prototype ingredient lists retain order');
select ok((select bool_and(status='verified' and source like 'DEMO%') from products),'verified is demo fixture state only');
select is((select count(*) from products where image_path is not null or ingredients_photo_path is not null or nutrition_photo_path is not null),0::bigint,'no invented photos');
select is((select count(*) from product_ingredients where ingredient_slug is null),0::bigint,'all prototype ingredients linked');
select * from finish();
rollback;
