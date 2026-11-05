-- LOCAL/STAGING DEMO ONLY. Copied from docs/prototype/Main.dc.html P (2026-11-04).
-- "verified" reproduces prototype state; these are not verified real products or human-checked facts.
-- Sources/explanations below are prototype copy; production content comes from R3/C5.
-- added_at maps the prototype photo date; verified_at maps its demo checked date. No photos exist.
-- Generated fixture snapshot; no demo scores, OCR values or unknown fruit percentages are invented.
insert into public.categories (slug,name,score_kind) values
 ('iaurt','Iaurturi','general'),('biscuiti','Biscuiți','general'),('suc','Sucuri','beverage');
insert into public.ingredients (slug,name,grp,role,explanation,source,allergen) values
('lapte-normalizat','Lapte normalizat','base','Ingredient de bază','Lapte de vacă cu grăsimea ajustată la valoarea de pe etichetă. Aduce proteine, calciu și lactoză, zahărul natural din lapte.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Lapte'),
('culturi-lactice-vii','Culturi lactice vii','cult','Fermentare','Bacterii care transformă laptele în iaurt și îi dau gustul acrișor.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)',null),
('preparat-de-capsuni-12','Preparat de căpșuni (12%)','taste','Fructe','Amestec de căpșuni, zahăr și îngroșători. Procentul de 12% se referă la tot preparatul, nu doar la fructe.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)',null),
('zahar','Zahăr','taste','Îndulcitor','Adăugat de producător pentru gust. În tabelul nutrițional apare împreună cu zaharurile naturale, la „din care zaharuri”.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)',null),
('amidon-modificat','Amidon modificat','add','Îngroșător','Amidon, de obicei din porumb, tratat ca să rămână cremos la frig și la amestecare.','DEMO — docs/prototype/Main.dc.html — Reg. (UE) nr. 1333/2008 privind aditivii alimentari',null),
('pectina-e440','Pectină (E440)','add','Gelifiant','Fibră extrasă din fructe, care leagă preparatul de căpșuni. Se folosește și în gemuri.','DEMO — docs/prototype/Main.dc.html — Reg. (UE) nr. 1333/2008 privind aditivii alimentari',null),
('carmin-e120','Carmin (E120)','add','Colorant','Colorant roșu obținut din insecte (coșenilă). Important dacă eviți produsele de origine animală.','DEMO — docs/prototype/Main.dc.html — Reg. (UE) nr. 1333/2008 privind aditivii alimentari',null),
('aroma-naturala','Aromă naturală','taste','Aromă','Substanțe de aromă din surse naturale, care nu provin neapărat din căpșuni.','DEMO — docs/prototype/Main.dc.html — Reg. (CE) nr. 1334/2008 privind aromele',null),
('lapte-integral','Lapte integral','base','Ingredient de bază','Lapte de vacă cu grăsimea ajustată la valoarea de pe etichetă. Aduce proteine, calciu și lactoză, zahărul natural din lapte.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Lapte'),
('smantana','Smântână','fat','Grăsime și cremozitate','Partea grasă a laptelui. Explică cele 10% grăsimi și textura densă.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Lapte'),
('fulgi-de-ovaz-32','Fulgi de ovăz (32%)','base','Cereale','Ovăz presat, sursa principală de fibre din acești biscuiți. Conține gluten.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Gluten'),
('faina-de-grau','Făină de grâu','base','Cereale','Făină albă, rafinată, cu mai puține fibre decât cea integrală. Conține gluten.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Gluten'),
('ulei-de-palmier','Ulei de palmier','fat','Grăsime','Grăsime vegetală solidă la temperatura camerei, bogată în grăsimi saturate.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)',null),
('ciocolata-15','Ciocolată (15%)','taste','Gust','Zahăr, masă de cacao, unt de cacao și lapte praf. Aduce și zahăr, și grăsimi saturate.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Lapte'),
('lecitina-din-soia-e322','Lecitină din soia (E322)','add','Emulsifiant','Ajută grăsimea și apa să se amestece uniform. Provine din soia, alergen declarat.','DEMO — docs/prototype/Main.dc.html — Reg. (UE) nr. 1333/2008 privind aditivii alimentari','Soia'),
('bicarbonat-de-sodiu-e500','Bicarbonat de sodiu (E500)','add','Agent de afânare','Face aluatul să crească la coacere. Conține sodiu, deci contribuie puțin la cantitatea de sare.','DEMO — docs/prototype/Main.dc.html — Reg. (UE) nr. 1333/2008 privind aditivii alimentari',null),
('sare','Sare','taste','Gust','Adăugată pentru gust. Valoarea din tabel include și sodiul din alte ingrediente.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)',null),
('faina-integrala-de-grau-45','Făină integrală de grâu (45%)','base','Cereale','Făină din bobul întreg, cu tărâțe. Are mult mai multe fibre decât făina albă. Conține gluten.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Gluten'),
('fulgi-de-ovaz-20','Fulgi de ovăz (20%)','base','Cereale','Ovăz presat, sursă de fibre. Conține gluten.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)','Gluten'),
('ulei-de-floarea-soarelui','Ulei de floarea-soarelui','fat','Grăsime','Ulei vegetal lichid, cu puține grăsimi saturate.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)',null),
('suc-de-mere-din-concentrat','Suc de mere din concentrat','base','Ingredient de bază','Sucul a fost concentrat prin eliminarea apei, apoi apa a fost adăugată la loc. Conține zaharurile naturale ale merelor.','DEMO — docs/prototype/Main.dc.html — Fișă explicativă Pe Etichetă (date demo)',null),
('acid-ascorbic-e300','Acid ascorbic (E300)','add','Antioxidant','Vitamina C, adăugată ca sucul să nu se închidă la culoare.','DEMO — docs/prototype/Main.dc.html — Reg. (UE) nr. 1333/2008 privind aditivii alimentari',null);
insert into public.products (id,code,status,name,brand,quantity,category_slug,unit,portion_amount,portion_label,
 kcal,fat,sat,sugar,salt,protein,fiber,fruit_veg_pct,ingredients_text,source,added_at,verified_at,allergens,may_contain) values
('c2000000-0000-4000-8000-000000000001','4840001000014','verified','Iaurt natural 2,5%','Livada Verde','400 g','iaurt','g',150,'1 pahar · 150 g',63,2.5,1.6,4.1,0.1,3.6,0,null,'lapte normalizat (2,5% grăsime), culturi lactice vii.','DEMO — docs/prototype/Main.dc.html — Eticheta producătorului','2026-10-12T00:00:00Z','2026-10-28T00:00:00Z',array['Lapte']::text[],array[]::text[]),
('c2000000-0000-4000-8000-000000000002','4840001000021','verified','Iaurt cu căpșuni 2%','Zorel','400 g','iaurt','g',150,'1 pahar · 150 g',98,2,1.3,13.2,0.12,2.9,0.2,null,'lapte normalizat, preparat de căpșuni 12% (căpșuni, zahăr, amidon modificat, gelifiant: pectină, colorant: carmin), zahăr, aromă naturală, culturi lactice vii.','DEMO — docs/prototype/Main.dc.html — Eticheta producătorului','2026-10-09T00:00:00Z','2026-10-27T00:00:00Z',array['Lapte']::text[],array['Fructe cu coajă lemnoasă']::text[]),
('c2000000-0000-4000-8000-000000000003','4840001000038','verified','Iaurt grecesc 10%','Stâna Mică','300 g','iaurt','g',150,'1 porție · 150 g',133,10,6.6,3.5,0.1,5.2,0,null,'lapte integral, smântână, culturi lactice vii.','DEMO — docs/prototype/Main.dc.html — Eticheta producătorului','2026-10-14T00:00:00Z','2026-10-29T00:00:00Z',array['Lapte']::text[],array[]::text[]),
('c2000000-0000-4000-8000-000000000004','4840001000045','verified','Biscuiți de ovăz cu ciocolată','Ovăzel','180 g','biscuiti','g',30,'3 biscuiți · 30 g',478,21,9.8,26,0.7,7,5.1,null,'fulgi de ovăz 32%, făină de grâu, zahăr, ulei de palmier, ciocolată 15% (zahăr, masă de cacao, unt de cacao, lapte praf, emulsifiant: lecitină din soia), agent de afânare: bicarbonat de sodiu, sare.','DEMO — docs/prototype/Main.dc.html — Eticheta producătorului','2026-10-02T00:00:00Z','2026-10-20T00:00:00Z',array['Gluten','Lapte','Soia']::text[],array['Ouă','Arahide']::text[]),
('c2000000-0000-4000-8000-000000000006','4840001000069','verified','Biscuiți integrali cu ovăz','Morărița','200 g','biscuiti','g',30,'3 biscuiți · 30 g',445,15,2.1,14,0.5,8.5,7.8,null,'făină integrală de grâu 45%, fulgi de ovăz 20%, zahăr, ulei de floarea-soarelui, agent de afânare: bicarbonat de sodiu, sare.','DEMO — docs/prototype/Main.dc.html — Eticheta producătorului','2026-10-05T00:00:00Z','2026-10-21T00:00:00Z',array['Gluten']::text[],array['Lapte','Susan']::text[]),
('c2000000-0000-4000-8000-000000000005','4840001000052','verified','Suc de mere 100%','Grădina Sudului','1 L','suc','ml',250,'1 pahar · 250 ml',46,0.1,null,null,null,0.1,null,null,'suc de mere din concentrat, antioxidant: acid ascorbic.','DEMO — docs/prototype/Main.dc.html — Eticheta producătorului (tabel incomplet)','2026-10-11T00:00:00Z','2026-10-25T00:00:00Z',array[]::text[],array[]::text[]);
insert into public.product_ingredients (product_id,position,raw_name,ingredient_slug) values
('c2000000-0000-4000-8000-000000000001',0,'Lapte normalizat','lapte-normalizat'),
('c2000000-0000-4000-8000-000000000001',1,'Culturi lactice vii','culturi-lactice-vii'),
('c2000000-0000-4000-8000-000000000002',0,'Lapte normalizat','lapte-normalizat'),
('c2000000-0000-4000-8000-000000000002',1,'Preparat de căpșuni (12%)','preparat-de-capsuni-12'),
('c2000000-0000-4000-8000-000000000002',2,'Zahăr','zahar'),
('c2000000-0000-4000-8000-000000000002',3,'Amidon modificat','amidon-modificat'),
('c2000000-0000-4000-8000-000000000002',4,'Pectină (E440)','pectina-e440'),
('c2000000-0000-4000-8000-000000000002',5,'Carmin (E120)','carmin-e120'),
('c2000000-0000-4000-8000-000000000002',6,'Aromă naturală','aroma-naturala'),
('c2000000-0000-4000-8000-000000000002',7,'Culturi lactice vii','culturi-lactice-vii'),
('c2000000-0000-4000-8000-000000000003',0,'Lapte integral','lapte-integral'),
('c2000000-0000-4000-8000-000000000003',1,'Smântână','smantana'),
('c2000000-0000-4000-8000-000000000003',2,'Culturi lactice vii','culturi-lactice-vii'),
('c2000000-0000-4000-8000-000000000004',0,'Fulgi de ovăz (32%)','fulgi-de-ovaz-32'),
('c2000000-0000-4000-8000-000000000004',1,'Făină de grâu','faina-de-grau'),
('c2000000-0000-4000-8000-000000000004',2,'Zahăr','zahar'),
('c2000000-0000-4000-8000-000000000004',3,'Ulei de palmier','ulei-de-palmier'),
('c2000000-0000-4000-8000-000000000004',4,'Ciocolată (15%)','ciocolata-15'),
('c2000000-0000-4000-8000-000000000004',5,'Lecitină din soia (E322)','lecitina-din-soia-e322'),
('c2000000-0000-4000-8000-000000000004',6,'Bicarbonat de sodiu (E500)','bicarbonat-de-sodiu-e500'),
('c2000000-0000-4000-8000-000000000004',7,'Sare','sare'),
('c2000000-0000-4000-8000-000000000006',0,'Făină integrală de grâu (45%)','faina-integrala-de-grau-45'),
('c2000000-0000-4000-8000-000000000006',1,'Fulgi de ovăz (20%)','fulgi-de-ovaz-20'),
('c2000000-0000-4000-8000-000000000006',2,'Zahăr','zahar'),
('c2000000-0000-4000-8000-000000000006',3,'Ulei de floarea-soarelui','ulei-de-floarea-soarelui'),
('c2000000-0000-4000-8000-000000000006',4,'Bicarbonat de sodiu (E500)','bicarbonat-de-sodiu-e500'),
('c2000000-0000-4000-8000-000000000006',5,'Sare','sare'),
('c2000000-0000-4000-8000-000000000005',0,'Suc de mere din concentrat','suc-de-mere-din-concentrat'),
('c2000000-0000-4000-8000-000000000005',1,'Acid ascorbic (E300)','acid-ascorbic-e300');
