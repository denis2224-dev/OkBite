// N2 additions only. N17 owns moving the legacy copy and selecting the language.
export const redesignRo = {
 nav: {scan:'Scanează', about:'Despre', history:'Istoric', profile:'Profil', settings:'Setări'},
 tiers: {excellent:'Excelent', good:'Bun', fair:'Moderat', poor:'Slab', bad:'Foarte slab', why:'De ce?', nutriScore:'Nutri-Score'},
 ledger: {
  sugar:'Zaharuri', sat:'Grăsimi saturate', salt:'Sare', kcal:'Energie', nutrition_other:'Alte valori nutriționale',
  additive:'Aditiv', processing:'Procesare', cap:'Limită pentru un aditiv cu risc ridicat', points:(n:number)=>`−${n} puncte`,
 },
 processing: {
  title:'Nivel de procesare', 1:'Neprocesat sau minim procesat', 2:'Ingrediente culinare procesate',
  3:'Procesat', 4:'Ultraprocesat', unknown:'Nivel de procesare necunoscut',
  level1:'Alimente neprocesate sau cu prelucrare minimă.', level2:'Ingrediente culinare obținute din alimente.',
  level3:'Alimente procesate prin combinarea alimentelor cu ingrediente culinare.',
  level4:'Formulări industriale cu ingrediente și procese specifice ultraprocesării.',
 },
 additives: {
  title:'Aditivi', low:'Risc scăzut', moderate:'Risc moderat', high:'Risc ridicat', notAssessed:'Neevaluat',
  source:'Sursa evaluării', explanationSource:'Sursa explicației', role:'Rol', romanianOnly:'Explicația este disponibilă în română.',
  open:(name:string)=>`Vezi detalii despre ${name}`, empty:'Nu avem informații despre aditivi pentru acest produs.',
 },
 profile: {
  title:'Profil', goalTitle:'Ce este important pentru tine?', allergensTitle:'Alergeni de urmărit', avoidTitle:'Alimente și ingrediente de evitat',
  health:'Alegeri alimentare mai echilibrate', allergies:'Alergii alimentare', family:'Alegeri pentru familie',
  weight:'Gestionarea greutății', other:'Alt obiectiv', added_sugar:'Zahăr adăugat', sweeteners:'Îndulcitori',
  ultra_processed:'Produse ultraprocesate', colourings:'Coloranți', palm_oil:'Ulei de palmier',
  flagNote:'Le semnalăm când scanezi un produs.', savedLocally:'Salvat doar pe acest telefon',
  pending:'Profilul va fi disponibil după conectarea preferințelor locale.',
 },
 onboarding: {
  goalTitle:'Ce este important pentru tine?', allergensTitle:'Ce alergeni vrei să urmărești?', avoidTitle:'Ce vrei să eviți?',
  skip:'Omite', continue:'Continuă', done:'Gata, începem', flagNote:'Le semnalăm când scanezi un produs.',
  savedLocally:'Preferințele sunt salvate doar pe acest telefon.', step:(n:number)=>`Pasul ${n} din 3`,
 },
 settings: {
  title:'Setări', language:'Limbă', romanian:'Română', english:'English', theme:'Aspect', system:'După telefon',
  light:'Luminos', dark:'Întunecat', install:'Instalează aplicația', clearHistory:'Șterge istoricul',
  clearHistoryTitle:'Ștergi tot istoricul?', clearHistoryBody:'Ștergem istoricul de pe acest telefon. Căutările în așteptare și contribuțiile publicate rămân.',
  clearHistoryConfirm:'Da, șterge istoricul', cancel:'Anulează', privacy:'Confidențialitate', terms:'Termeni de utilizare',
  method:'Cum calculăm scorul', version:'Versiune', resetOnboarding:'Reia configurarea profilului',
  pending:'Setările suplimentare vor fi disponibile după conectarea lor.',
 },
 about: {
  title:'Despre OkBite', whatTitle:'Înțelege eticheta',
  whatBody:'Scanează un produs pentru a vedea informațiile nutriționale, alergenii și explicațiile ingredientelor, cu sursele lor.',
  methodTitle:'Cum funcționează scorul',
  methodBody:'Scorul folosește informațiile disponibile despre produs. Datele lipsă nu sunt estimate. Consultă metoda de calcul pentru regulile aplicate.',
  tiersTitle:'Cinci niveluri, explicate', tiersBody:'Excelent, bun, moderat, slab și foarte slab. Scorul nu arată dacă un produs este sigur pentru o persoană cu alergii.',
  nutriScoreTitle:'Litera Nutri-Score', nutriScoreBody:'Scara de la A la E descrie calitatea nutrițională. Afișăm o reprezentare proprie, fără sigla oficială.',
  sourcesTitle:'Sursele noastre', sourcesBody:'Ambalajele produselor, Open Food Facts și explicațiile verificate, fiecare cu sursa indicată.',
  promiseTitle:'Acces simplu', promiseBody:'Gratuit, fără reclame și fără urmărire publicitară. Nu ai nevoie de cont.',
 },
 scan: {aimHint:'Încadrează codul de bare în chenar', flashOn:'Pornește blițul', flashOff:'Oprește blițul', manualCode:'Cod manual', photoLabel:'Fotografiază eticheta', loadingReader:'Se pregătește cititorul…'},
 result: {
  profileAllergens:'Alergeni din profilul tău', profileMayContain:'Poate conține alergeni din profilul tău',
  profileAvoid:'Ingrediente pe care vrei să le eviți', profileUnknown:'Nu putem verifica toate preferințele tale.',
  nutriScoreLabel:'Litera Nutri-Score', closeSheet:'Închide analiza produsului',
 },
 history: {
  search:'Caută după nume sau marcă', noMatches:'Niciun produs găsit.', remove:(name:string)=>`Șterge ${name} din istoric`,
  removed:'Produs șters din istoric.', undo:'Anulează ștergerea', removeError:'Nu am putut șterge produsul. Încearcă din nou.',
  scoreUnavailable:'Scor indisponibil',
 },
 allergens: {
  Gluten:'Gluten', Crustacee:'Crustacee', Ouă:'Ouă', Pește:'Pește', Arahide:'Arahide', Soia:'Soia', Lapte:'Lapte',
  'Fructe cu coajă lemnoasă':'Fructe cu coajă lemnoasă', Țelină:'Țelină', Muștar:'Muștar', Susan:'Susan',
  'Dioxid de sulf și sulfiți':'Dioxid de sulf și sulfiți', Lupin:'Lupin', Moluște:'Moluște',
 },
} as const;
type Widen<T> = T extends (...args: infer A) => unknown ? (...args: A) => string : T extends string ? string : {[K in keyof T]: Widen<T[K]>};
export type RedesignCopy = Widen<typeof redesignRo>;
