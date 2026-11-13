export function plural(n: number, one: string, many: string, language: 'ro' | 'en' = 'ro'): string {
  return `${n}${language === 'ro' && n >= 20 && (n % 100 === 0 || n % 100 >= 20) ? ' de' : ''} ${n === 1 ? one : many}`;
}
const gradeNames: Record<string, string> = {good:'bună',medium:'medie',low:'scăzută',unavailable:'indisponibilă'};
const legacyRo = {
 app: {admin:{"title": "Administrare", "email": "Adresa de e-mail a echipei", "sendLink": "Trimite linkul de autentificare", "signIn": "Autentificare pentru echipa de moderare", "linkSent": "Verifică e-mailul pentru linkul de autentificare.", "notConfigured": "Administrarea nu este configurată încă.", "denied": "Contul nu are drept de moderare.", "failed": "Acțiunea nu a reușit. Încearcă din nou.", "signOut": "Deconectare", "unverified": "Produse neverificate", "reports": "Rapoarte deschise", "emptyProducts": "Nu sunt produse de verificat.", "emptyReports": "Nu sunt rapoarte deschise.", "verify": "Verifică și salvează", "hide": "Ascunde produsul", "reason": "Motivul ascunderii", "open": "Deschide produsul", "closeReport": "Închide raportul", "invalid": "Verifică numele, categoria și valorile introduse.", "reload": "Reîncarcă lista", "unit": "Unitate: g sau ml", "front": "Fotografia produsului", "ingredientsPhoto": "Fotografia ingredientelor", "nutritionPhoto": "Fotografia tabelului nutrițional", "version": "Versiune", "versionLabel": "Versiunea aplicației. Ține apăsat pentru administrare."},name:'OkBite',back:'Înapoi',close:'Închide',cancel:'Anulează',retry:'Încearcă din nou',loading:'Se încarcă…',demo:'Mod demonstrativ',demoNote:'Produse fictive și scoruri ilustrative. Nu folosi aceste date pentru decizii alimentare.',open:'Deschide',done:'Gata',settings:'Aspect',light:'Luminos',dark:'Întunecat',system:'După telefon',unavailable:'Indisponibil',preview:'Explorează un exemplu',unitGram:'g',unitMl:'ml'},
 nav: {close:'Închide',home:'Acasă',compare:'Compară',history:'Istoric',about:'Despre OkBite',privacy:'Confidențialitate',terms:'Termeni de utilizare',method:'Cum calculăm scorul'},
 home: {design: {brand:'okBite',demo:'Setări',description:'Scanezi codul de bare și afli scorul nutrițional, alergenii și ce înseamnă fiecare ingredient.',photo:'Fotografiază eticheta',photoHint:'Pentru produse lipsă',compareHint:'Valori la 100 g',recent:'Scanate recent',empty:'Încă nu ai scanat nimic. Produsele analizate apar aici și rămân disponibile fără internet.',medium:'Medie',low:'Scăzută',footnote:'Scorul descrie calitatea nutrițională la 100 g, comparabilă în aceeași categorie. Nu arată probabilitatea unei boli. În prototip, scorurile sunt ilustrative.',scan:'Scanează produsul',offline:'Fără conexiune · istoricul rămâne disponibil',now:'acum',states:{online:'Conectat',offline:'Fără conexiune',empty:'Istoric gol'}},title:'Ce scrie, de fapt, pe etichetă?',eyebrow:'Asistentul tău la raft',description:'Fotografiază produsul și înțelege mai ușor ce alegi: alergeni, ingrediente și calitate nutrițională.',photoButton:'Fotografiază produsul',scanLink:'Scanează codul de bare',compare:'Compară produse',compareHint:'Alegeri din aceeași categorie',recent:'Analizate recent',allHistory:'Vezi tot istoricul',legend:'Cum citești scorul',good:'Calitate nutrițională bună',medium:'Calitate nutrițională medie',low:'Calitate nutrițională scăzută',empty:'Niciun produs analizat încă. Produsele deschise apar aici și rămân disponibile fără internet.',promise:'Mai multă claritate. Chiar la raft.',legendGood:'60–100',legendMedium:'40–59',legendLow:'0–39',how:'Din fotografie, în câțiva pași',stepPhoto:'Fotografiezi produsul',stepRead:'Confirmi produsul găsit',stepUnderstand:'Înțelegi eticheta',workflowPending:'Fotografierea și identificarea vor fi conectate de echipa responsabilă de captură.',connection:'Serviciul nu este încă configurat.'},
 capture: {shutter:'Fă fotografia',deniedTitle:'Camera nu este permisă',deniedText:'Fără acces la cameră nu putem fotografia produsul. Poți alege o fotografie din galerie sau poți permite accesul din setări.',openSettings:'Deschide setările',retry:'Am permis accesul, reîncearcă',title:'Fotografiază produsul',working:'Caut produsul…',gallery:'Alege din galerie',denied:'Accesul la cameră nu este permis.',hint:'Încadrează partea din față a ambalajului sau codul de bare.',take:'Fotografiază',permission:'Permite accesul la cameră'},
 identify: {confirmTitle:'Este acesta?',confirmHint:'Verifică numele și cantitatea.',confirmYes:'Da, arată analiza',confirmNo:'Nu, e alt produs',pickTitle:'Alege produsul',noneOfThem:'Nu e niciunul',notFoundTitle:'Nu avem încă acest produs',notFoundText:'Îl poți adăuga tu, în aproximativ un minut.',codeNotFound:(code:string)=>`Codul ${code} nu e încă în bază.`,nextSteps:['Fotografiezi lista de ingrediente','Fotografiezi tabelul nutrițional','Verifici textul extras și primești analiza'],addButton:'Adaugă produsul',checkCodeAgain:'Verifică din nou codul',confirm:'Este acesta?',choose:'Alege produsul',none:'Nu e niciunul',yes:'Da, acesta este',notFound:'Nu avem încă acest produs',add:'Fotografiază eticheta',description:'Adaugă ingredientele și tabelul nutrițional ca să înțelegi produsul.'},
 scan: {frameHint:'Încadrează codul de bare în chenar',deniedText:'Fără acces la cameră nu putem citi codul de bare. Poți permite accesul din setări sau poți introduce codul mai jos.',manualTitle:'Introdu codul manual',manualHint:'Cifrele de sub codul de bare: 8 sau 13.',manualEmpty:'Introdu cifrele de sub codul de bare.',search:'Caută',title:'Scanează codul de bare',manual:'Introdu codul de mână',manualLabel:'Cod de bare',manualPlaceholder:'Cifrele de sub codul de bare',manualInvalid:'Codul trebuie să aibă 8 sau 13 cifre.',submit:'Caută produsul',webManualOnly:'În acest browser introdu codul de mână sau fotografiază produsul.'},
 result: {
  nutritionUnavailable: 'Informațiile nutriționale nu sunt disponibile.',
  insufficientNutrition: 'Nu avem destule date pentru scor.',
  categoryUnconfirmed: 'Fără scor până confirmăm categoria.',
  transcribedLabel: 'Ingrediente',
  explainedWithSource: 'Explicate',
  missingAllergenNote: 'Verifică mereu ambalajul: lista poate fi incompletă.',
  addNutrition: 'Adaugă tabelul nutrițional',
  nutritionAdded: 'Informațiile nutriționale au fost adăugate produsului.',
insufficientData:'Date insuficiente',title:'Analiza produsului',allergens:'Alergeni declarați',mayContain:'Poate conține urme de',noAllergens:'Niciun alergen declarat pe etichetă.',scoreUnavailable:'Scor indisponibil',insufficient:'Date insuficiente',missing:'Lipsesc valori necesare scorului:',unverified:'Neverificat',verified:'Verificat de echipă',unverifiedNote:'Adăugat de un utilizator; încă neverificat.',portion:'Ce înseamnă o porție',portionNote:'Referință zilnică pentru un adult. Nevoile tale pot fi diferite.',per100:(unit:string)=>`Valori la 100 ${unit}`,portionAmount:(amount:string,unit:string)=>`Porție: ${amount} ${unit}`,daily:(n:number)=>`${n}% din referința zilnică`,undeclared:'Nedeclarat',ingredients:'Înțelege ingredientele',ingredientsHint:'Ce rol are fiecare',original:'Vezi eticheta originală',report:'Raportează o greșeală',reportLabel:'Ce ai observat?',reportHint:'Descrie diferența față de ambalaj.',reportSend:'Trimite raportul',reportSuccess:'Mulțumim! Echipa va verifica informația.',reportShort:'Scrie cel puțin 3 caractere.',source:'De unde vin datele',added:'Fotografiat la',checked:'Verificat la',compare:'Compară cu alt produs',notFound:'Produsul nu a fost găsit.',teaspoons:{underHalf:'sub jumătate de linguriță',half:'jumătate de linguriță',one:'1 linguriță',many:(n:string)=>`${n} lingurițe`},sugarNote:(n:string)=>`Aproximativ ${n} de zahăr în porție.`,nutrients:{kcal:'Energie',fat:'Grăsimi',sat:'Grăsimi saturate',sugar:'Zaharuri',salt:'Sare',protein:'Proteine',fiber:'Fibre',fruitVegPct:'Fructe și legume'}},
 score: {title:'Calitate nutrițională',ringLabel:(score:number,grade:string)=>`${score} din 100, calitate nutrițională ${gradeNames[grade] ?? grade}`,outOf:'din 100',disclaimer:'Calculat la 100 g; nu indică riscul unei boli.',good:'Bună',medium:'Medie',low:'Scăzută',unavailable:'Indisponibilă',method:'Cum interpretăm scorul',positive:'Punct bun',negative:'De urmărit',neutral:'De știut'},
 ingredients: {title:'Ingrediente explicate',explanationSoon:'Explicație în curând',source:'Sursa explicației',base:'Ingrediente de bază',fat:'Grăsimi',taste:'Gust și dulceață',add:'Aditivi',cult:'Culturi și fermenți',pending:'Ecranul ingredientelor va fi conectat de echipa responsabilă de detaliile produsului.'},
 compare: {design:{title:'Comparație',hint:'Alege două produse din aceeași categorie.',productA:'Produsul A',productB:'Produsul B',swap:'Schimbă produsul B',category:'Altă categorie',subtitle:(category:string,unit:string)=>`${category} · valori la 100 ${unit}`,table:(unit:string)=>`Tabel comparativ la 100 de ${unit==='ml'?'mililitri':'grame'}`,same:'la fel',difference:(amount:string,unit:string)=>`diferență ${amount} ${unit}`,favorable:'Valoarea mai favorabilă dintre cele două',saturated:'din care saturate',none:'niciunul declarat',footnote:'Scorurile sunt ilustrative și comparabile doar în aceeași categorie de produse.',better:'Alegere mai bună',betterValue:'Valoare mai bună',profileWarning:(allergen:string)=>`Conține ${allergen}, din lista ta`},per100:(unit:string)=>`La 100 ${unit}`,title:'Compară produse',otherCategory:'Alege două produse din aceeași categorie pentru o comparație corectă.',pending:'Comparația este gestionată de echipa responsabilă de detaliile produsului.',choose:'Alege din istoricul tău',photo:'Fotografiază alt produs'},
 add: {unitQuestion:'Produsul se vinde la greutate sau la volum?',unitGram:'Grame (g)',unitMl:'Mililitri (ml)',stepOf:(step:number,total=2)=>`Pasul ${step} din ${total}`,ingredientsTitle:'Fotografiază lista de ingrediente',ingredientsHint:'Ține telefonul paralel cu eticheta, fără reflexii.',nutritionTitle:'Acum tabelul nutrițional',nutritionHint:'Cu toate rândurile în chenar.',ingredientsDone:'Ingredientele au fost fotografiate.',reading:'Citim eticheta…',gallery:'Alege din galerie',ingredients:'Fotografiază lista de ingrediente',nutrition:'Acum tabelul nutrițional',samePhoto:'Sunt pe aceeași poză',next:'Continuă',frontTitle:'Fotografiază produsul din față',frontHint:'Include denumirea, marca și gramajul de pe ambalaj.',nutritionQuestion:'Pe ambalaj există și un tabel nutrițional?',nutritionYes:'Da, fotografiez tabelul',nutritionSame:'Tabelul este în fotografia ingredientelor',nutritionNone:'Nu există tabel nutrițional',nutritionSkip:'Sar peste pentru moment',nutritionUnreadable:'Nu am putut citi toate valorile din tabel.',continueIngredients:'Continuă doar cu ingredientele',confirmTitle:'Confirmă produsul',tapToEdit:'Apasă o informație pentru a o corecta.',retakePhoto:'Refă această fotografie',manualEntry:'Scriu eu textul',draftRestored:'Am restaurat produsul început pe acest telefon.',draftInterrupted:'Citirea anterioară nu s-a terminat. Pozele nu au fost retrimise.',resumeDraft:'Continuă produsul început',discardDraft:'Renunță la ciornă',confirmSave:'Analizează și adaugă produsul',retryRead:'Încearcă citirea din nou',categoryOptional:'Categorie (opțional)',unknownCategory:'Categorie neconfirmată',nutritionLater:'Adaugă tabelul nutrițional',nutritionSuccess:'Informațiile nutriționale au fost adăugate produsului.',readingFront:'Citim informațiile de pe ambalaj…',ingredientsOnly:'Analiză pe baza ingredientelor',nutritionUnavailable:'Informațiile nutriționale nu sunt disponibile.',notPrinted:'Informația nu este tipărită pe ambalaj.',notPhotographed:'Informația nu a fost fotografiată.',unreadableText:'Nu am putut citi acest text.',processingFailed:'Citirea nu a reușit. Fotografiile au fost păstrate.',noPer100:'Valorile sunt doar pe porție; nu le-am convertit la 100 g sau 100 ml.',basisGram:'la 100 g',basisMl:'la 100 ml',identityMissing:'Nu am putut citi denumirea produsului. Refă fotografia din față sau corectează textul.',saveFailed:'Produsul nu a fost salvat. Ciorna și fotografiile au fost păstrate.',draftSaveFailed:'Nu am putut păstra ciorna pe acest telefon. Reîncearcă înainte de a închide.',enrichUnavailable:'Tabelul nutrițional nu poate fi adăugat acum. Reîncearcă mai târziu.',savePending:'Salvăm produsul…'},
 review: {savedPendingCleanup:'Produsul e salvat. Reîncearcă pentru a termina pe acest telefon.',finishSave:'Finalizează pe telefon',hint:'Corectează greșelile înainte de analiză.',unclearTitle:'Text neclar',unclearText:'Completează câmpurile marcate sau refă poza.',unreadMark:'[?] înseamnă text necitit. Corectează-l.',name:'Denumire',brand:'Marcă',quantity:'Gramaj',category:'Categorie',ingredients:'Ingrediente',nutritionTitle:'Tabel nutrițional',per100:'la 100 g/ml',nutrients:{kcal:'Energie',fat:'Grăsimi',sat:'din care saturate',sugar:'Zaharuri',salt:'Sare',protein:'Proteine',fiber:'Fibre',fruitVegPct:'Fructe, legume și leguminoase'},allergensDetected:'Alergeni detectați în text',allergensNone:'Niciunul detectat',allergensHint:'Alergenii apar îngroșat pe etichetă.',satOverFat:'Grăsimile saturate nu pot depăși grăsimile totale.',retakePhoto:'Refă fotografia',retakePhotos:'Refă fotografiile',title:'Verifică textul extras',unclearField:'Verifică această valoare pe etichetă.',save:'Salvează produsul',retake:'Refă fotografia'},
 history: {design:{title:'Istoric',note:'Disponibil și fără internet.',emptyTitle:'Istoricul este gol',empty:'Produsele scanate apar aici.',scan:'Scanează un produs',storageNotice:'Istoricul e salvat doar în acest browser.',dismissNotice:'Închide'},title:'Istoricul tău',description:'Etichete înțelese. Alegeri mai simple.',emptyTitle:'Prima alegere începe cu o fotografie',empty:'Produsele analizate se păstrează pe acest telefon. Le poți redeschide și fără internet.',clear:'Șterge istoricul',clearTitle:'Ștergi tot istoricul?',clearBody:'Produsele vor fi șterse de pe acest telefon.',clearConfirm:'Da, șterge istoricul',cleared:'Istoricul a fost șters.',saved:'Salvat pe acest telefon',count:(n:number)=>plural(n,'produs','produse'),open:(name:string)=>`Deschide ${name}`,loadError:'Nu am putut citi istoricul. Încearcă din nou.',clearError:'Nu am putut șterge istoricul. Produsele tale rămân salvate.',savedAt:(date:string)=>`Salvat la ${date}`,score:(n:number)=>`${n} din 100`,storageError:'Nu am putut salva istoricul. Verifică spațiul disponibil.'},
 offline: {cleanupPending:'Acțiunea e gata. Încă se termină pe acest telefon.',queueTitle:'Căutări salvate',reload:'Reîncarcă lista',cached:'Rezultat salvat pe acest telefon. Poate diferi de versiunea actuală.',pendingCount:(n:number)=>`În așteptare: ${plural(n,'produs','produse')}`,photo:'Fotografie salvată',code:'Cod salvat',needsReview:'Necesită confirmarea produsului',processing:'Se procesează…',emptyQueue:'Nu sunt căutări în așteptare.',removeTitle:'Ștergi această căutare și fotografia ei salvată?',removeConfirm:'Da, șterge căutarea',photoMissing:'Fotografia salvată nu mai este disponibilă. Fotografiază din nou produsul.',subtitle:'Nu putem căuta produsul acum',retry:'Încearcă din nou',title:'Fără conexiune',description:'Istoricul rămâne disponibil. Căutările se trimit când revine internetul.',history:'Deschide istoricul',banner:'Fără conexiune. Istoricul rămâne disponibil.',queued:'Salvat pentru mai târziu.',resolved:(n:number)=>`${plural(n,'produs','produse')} procesate după reconectare.`,queueError:'Unele produse așteaptă încă procesarea.',cancel:'Renunță la această căutare'},
 errors: {offline:'Nu te poți conecta acum. Încearcă din nou sau deschide istoricul.',invalid_response:'Răspunsul nu a putut fi citit. Încearcă din nou.',rate_limited:'Prea multe căutări. Revino puțin mai târziu.',bad_request:'Verifică datele introduse.',not_found:'Produsul nu a fost găsit.',unauthorized:'Acțiunea nu este disponibilă.',upstream_failed:'Serviciul este temporar indisponibil.',duplicate:'Acest produs există deja.',configuration:'Serviciul nu este încă configurat.',generic:'Ceva nu a funcționat. Încearcă din nou.',invalidResponse:'Răspunsul nu a putut fi citit. Încearcă din nou.',rateLimited:'Prea multe căutări. Revino puțin mai târziu.',notFound:'Produsul nu a fost găsit.',upstreamFailed:'Serviciul este temporar indisponibil.',retry:'Încearcă din nou'},
 share: {button:'Distribuie produsul',copied:'Link copiat.',error:'Nu am putut distribui produsul. Încearcă din nou sau copiază manual linkul de mai jos.',text:(name:string,brand:string,score:string)=>`${name} (${brand}): ${score} pe OkBite`,score:(n:number)=>`${String(n).replace('.', ',')} din 100`},
 legal: {
  updated: 'Ultima actualizare: 5 noiembrie 2026',
  draft: 'Text în curs de verificare înainte de publicare.',
  contactPending: 'Datele de contact ale operatorului vor fi completate înainte de publicare.',
  sources: 'Sursele noastre',
  aboutLead: 'Înțelege eticheta. Alege informat.',
  aboutBody: 'OkBite te ajută să citești etichetele produselor din Moldova. Fără cont de cumpărător și fără plăți.',
  privacyLead: 'Date puține. Explicații clare.',
  termsLead: 'Un instrument de informare',
  methodLead: 'Un scor, explicat',
  backHome: 'Înapoi la Acasă',
  aboutSections: [
   { title: 'De unde provin informațiile', body: 'Etichetele producătorilor și fotografiile cumpărătorilor sunt sursele produselor. Produsele adăugate de utilizatori sunt marcate „Neverificat” până la verificarea echipei. Acest marcaj nu garantează siguranța alimentului.' },
   { title: 'Open Food Facts', body: 'Când sunt folosite date Open Food Facts, sursa trebuie indicată. Baza sa de date este disponibilă sub Open Database License (ODbL). Proveniența și condițiile de reutilizare se verifică înainte de import; nu afirmăm că toate produsele provin de acolo.' },
   { title: 'Limitele datelor', body: 'Ambalajul original are prioritate. Rețetele se pot modifica, iar citirea automată poate greși. Produsele și scorurile din modul demonstrativ sunt fictive și ilustrative; nu sunt verificări ale unor produse reale.' },
  ],
  privacySections: [
   { title: 'Identificatorul dispozitivului', body: 'Nu cerem cont, nume sau localizare cumpărătorilor. Aplicația creează un identificator aleatoriu, păstrat în spațiul securizat al aplicației pe telefon sau în localStorage în browser. Îl trimite către serviciu pentru funcționare și limitarea abuzurilor; contribuțiile și evenimentele de utilizare pot fi asociate acestuia. Nu promitem anonimat.' },
   { title: 'Fotografii și contribuții', body: 'Cererile conectate trimit fotografiile către serviciul configurat în Supabase. Fotografiile acceptate ca parte a unui produs pot deveni publice împreună cu înregistrarea produsului. Încărcările intermediare sunt private. Fotografiază numai ambalajul; evită persoane, bonuri și date personale, inclusiv în textul rapoartelor.' },
   { title: 'Citirea automată', body: 'Când serviciul de citire este configurat, fotografiile pentru identificare și citirea etichetei sunt trimise prin TokenHarbor către modelul AI configurat; configurația implicită folosește DeepSeek V4.1 Flash. TokenHarbor este un intermediar separat de furnizorul modelului. Citirea automată poate greși. Regiunile, păstrarea și transferurile trebuie confirmate înainte de activarea publică; testele locale nu confirmă practicile furnizorilor.' },
   { title: 'Istoric și căutări în așteptare', body: 'Istoricul se păstrează local, în SQLite pe telefon sau IndexedDB în browser. Codurile și fotografiile puse în așteptare se păstrează separat și pot fi retrimise la reconectare; unele rămân în așteptare până la rezolvare. Ștergerea istoricului nu șterge coada, identificatorul sau produsele și fotografiile publicate pe server. Ștergerea datelor browserului poate elimina datele locale.' },
   { title: 'Administrare și infrastructură', body: 'Echipa de moderare se autentifică prin e-mail cu Supabase Auth; acest cont este separat de utilizarea ca cumpărător. Serverele și furnizorii de găzduire pot prelucra date tehnice ale conexiunii. În această versiune nu este configurat un serviciu de producție; destinatarii și jurnalele efective se vor inventaria înainte de lansare.' },
   { title: 'Erori tehnice', body: 'Când serviciul este configurat, aplicația poate trimite mesaje și detalii tehnice despre erori, ruta ecranului, versiunea aplicației, platforma și identificatorul dispozitivului pentru diagnosticare. Parametrii și fragmentele rutei sunt eliminate. Nu introduce date personale în contribuții sau rapoarte; acestea pot apărea în mesajele de eroare.' },
   { title: 'Drepturi și păstrare', body: 'Acesta este un proiect de politică, nu o politică finală. Operatorul trebuie să completeze identitatea, contactul, scopurile și temeiurile prelucrării, destinatarii, transferurile, duratele de păstrare și procedurile pentru acces, corectare, ștergere și reclamații. Nu sunt confirmate încă termene de ștergere pentru datele de pe server.' },
  ],
  termsSections: [
   { title: 'Informare, nu sfat medical', body: 'OkBite explică informații de pe etichete și nu înlocuiește sfatul unui specialist. Scorul nu spune dacă un produs este sigur pentru tine și nu este o recomandare medicală personalizată.' },
   { title: 'Verifică ambalajul', body: 'Dacă ai alergii sau restricții alimentare, citește întotdeauna ambalajul original. Absența unui alergen din aplicație nu dovedește absența lui din produs. Datele neverificate și citirea automată pot conține greșeli.' },
   { title: 'Contribuie responsabil', body: 'Trimite numai fotografii ale produselor și etichetelor pe care le poți distribui. Nu include persoane sau date personale. Verifică textul extras înainte de trimitere și raportează diferențele față de ambalaj din ecranul produsului.' },
   { title: 'Disponibilitate', body: 'Istoricul local poate fi consultat fără internet. Căutările noi și trimiterea contribuțiilor necesită conexiune și un serviciu configurat. Modul demonstrativ nu oferă analize ale produselor reale. Nu sunt implementate plăți sau abonamente.' },
  ],
  methodSections: [
   { title: 'Ce este disponibil acum', body: 'Motorul de calcul este integrat în serviciul conectat. Scorul depinde de datele disponibile și de categoria produsului; verificarea umană a tuturor exemplelor de referință rămâne în curs. Un rezultat indisponibil nu este un scor zero. Scorurile demonstrative sunt ilustrative.' },
   { title: 'Metoda de calcul', body: 'Motorul folosește reguli Nutri-Score 2023 și o conversie proprie pe scara 0–100, în funcție de categoria produsului. Valoarea descrie calitatea nutrițională la 100 g sau 100 ml, nu riscul unei boli. OkBite nu afișează sigla Nutri-Score.' },
   { title: 'Citește explicațiile', body: 'Rezultatul include valoarea, categoria de calitate, până la trei explicații și valorile lipsă. Compară produse din aceeași categorie. Scorul nu înlocuiește lista de alergeni sau verificarea ambalajului.' },
   { title: 'Date insuficiente', body: 'Motorul prevăzut cere energie, zaharuri, grăsimi saturate și sare; categoria grăsimi cere și grăsimi totale. Apa are o regulă separată. Când lipsesc valori obligatorii, scorul este indisponibil. O valoare lipsă nu trebuie prezentată ca zero.' },
   { title: 'Referințe și porții', body: 'Procentele pe porție folosesc referințe pentru un adult: 2 000 kcal, 90 g zaharuri, 20 g grăsimi saturate și 6 g sare. Nevoile tale pot fi diferite; acestea nu sunt recomandări personalizate.' },
  ],
 },
 pwa: {
  install: {
   title: 'Instalează OkBite',
   description: 'Adaugă aplicația pe ecranul principal pentru acces mai ușor.',
   iosHint: 'Apasă Partajează, apoi Adaugă pe ecranul principal.',
   failed: 'Instalarea nu a pornit. Poți reîncerca din meniul browserului.',
  },
  update: { title: 'Versiune nouă disponibilă', apply: 'Actualizează' },
  camera: {
   browserDenied: 'Permite accesul la cameră din setările acestui site, apoi reîncearcă.',
   settingsFailed: 'Nu am putut deschide setările. Permite accesul la cameră din setările aplicației.',
   startupFailed: 'Camera nu a putut porni. Închide alte aplicații care folosesc camera și reîncearcă.',
   iosDenied: 'Pe iPhone, permite accesul din Setări > Safari > Cameră, apoi reîncearcă.',
   androidDenied: 'În Chrome, apasă lacătul de lângă adresă > Permisiuni > Cameră, apoi reîncearcă.',
   httpsRequired: 'Camera funcționează doar pe o conexiune securizată HTTPS.',
   unavailable: 'Nu am găsit o cameră disponibilă. Alege o fotografie sau introdu codul manual.',
   busy: 'Camera este folosită de altă aplicație. Închide-o și reîncearcă.',
  },
  scannerUnavailable: 'Scanarea nu este disponibilă în acest browser. Introdu codul manual.',
  analysis: {
   title: 'Rezultatul nu este încă confirmat',
   unknown: 'Durează prea mult. Rezultatul nu e încă confirmat.',
  },
 },
} as const;
// Approved N2 redesign additions.
export const redesignRo = {
 nav: {scan:'Scanează', about:'Despre', history:'Istoric', profile:'Profil', settings:'Setări', allergies:'Alergii'},
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
 allergies: {
  title:'Alergiile tale', lead:'Te avertizăm când un produs le conține.', allergensLabel:'Alergeni', avoidTitle:'Vreau să evit',
 },
 onboarding: {
  goalTitle:'Ce este important pentru tine?', allergensTitle:'Ce alergeni vrei să urmărești?', avoidTitle:'Ce vrei să eviți?',
  skip:'Omite', continue:'Continuă', done:'Gata, începem', flagNote:'Le semnalăm când scanezi un produs.',
  savedLocally:'Preferințele sunt salvate doar pe acest telefon.', step:(n:number)=>`Pasul ${n} din 3`,
 },
 settings: {
  title:'Setări', language:'Limbă', romanian:'Română', english:'English',
  install:'Instalează aplicația', clearHistory:'Șterge istoricul',
  clearHistoryTitle:'Ștergi tot istoricul?', clearHistoryBody:'Ștergem istoricul de pe acest telefon. Căutările în așteptare și contribuțiile publicate rămân.',
  clearHistoryConfirm:'Da, șterge istoricul', cancel:'Anulează', privacy:'Confidențialitate', terms:'Termeni de utilizare',
  method:'Cum calculăm scorul', version:'Versiune', resetOnboarding:'Reia configurarea profilului',
  pending:'Setările suplimentare vor fi disponibile după conectarea lor.',
  app:'Aplicație', info:'Informații',
 },
 about: {
  title:'Despre OkBite', whatTitle:'Ce face OkBite',
  whatBody:'Scanezi un produs și vezi scorul, alergenii și ce înseamnă ingredientele.',
  scoreTitle:'Scorul', sources:'Surse',
  promiseTitle:'Gratuit, fără cont', promiseBody:'Fără reclame și fără urmărire publicitară.',
 },
 scan: {aimHint:'Încadrează codul de bare în chenar', flashOn:'Pornește blițul', flashOff:'Oprește blițul', manualCode:'Cod manual', photoLabel:'Fotografiază eticheta', loadingReader:'Se pregătește cititorul…',
  labelMode:'Etichetă', seeAll:'Vezi tot'},
 result: {
  profileAllergens:'Alergeni din profilul tău', profileMayContain:'Poate conține alergeni din profilul tău',
  profileAvoid:'Ingrediente pe care vrei să le eviți', profileUnknown:'Nu putem verifica toate preferințele tale.',
  nutriScoreLabel:'Litera Nutri-Score', closeSheet:'Închide analiza produsului',
  whyLetter:(letter:string)=>`De ce ${letter}`, ingredientsTile:'Toate ingredientele', portionTile:'Porție', profileAlertSub:'Este în lista ta de alergii',
  containsAllergen:(allergen:string)=>`Conține ${allergen}`, mayContainAllergen:(allergen:string)=>`Poate conține ${allergen}`,
 },
 history: {
  search:'Caută după nume sau marcă', noMatches:'Niciun produs găsit.', remove:(name:string)=>`Șterge ${name} din istoric`,
  removed:'Produs șters din istoric.', undo:'Anulează ștergerea', removeError:'Nu am putut șterge produsul. Încearcă din nou.',
  scoreUnavailable:'Scor indisponibil', restoreError:'Nu am putut restabili produsul. Reîncearcă anularea ștergerii.',
 },
 allergens: {
  Gluten:'Gluten', Crustacee:'Crustacee', Ouă:'Ouă', Pește:'Pește', Arahide:'Arahide', Soia:'Soia', Lapte:'Lapte',
  'Fructe cu coajă lemnoasă':'Fructe cu coajă lemnoasă', Țelină:'Țelină', Muștar:'Muștar', Susan:'Susan',
  'Dioxid de sulf și sulfiți':'Dioxid de sulf și sulfiți', Lupin:'Lupin', Moluște:'Moluște',
 },
} as const;
type Widen<T> = T extends (...args: infer A) => unknown ? (...args: A) => string : T extends string ? string : {[K in keyof T]: Widen<T[K]>};
export type RedesignCopy = Widen<typeof redesignRo>;

export const roStrings = {
 ...legacyRo, ...redesignRo,
 nav: {...legacyRo.nav, ...redesignRo.nav},
 scan: {...legacyRo.scan, ...redesignRo.scan},
 result: {...legacyRo.result, ...redesignRo.result},
 history: {...legacyRo.history, ...redesignRo.history},
} as const;
type TextShape<T> = T extends string ? string : T extends (...args: infer A) => infer R ? (...args: A) => R : T extends object ? { [K in keyof T]: TextShape<T[K]> } : T;
export type Copy = TextShape<typeof roStrings>;
