# A6 — Pregătirea colectării produselor

Responsabil: R5; contribuie R1–R5. Plan: 12–29 noiembrie 2026.
Stare: **materiale de lucru, nicio colectare sau verificare declarată**.
Acest dosar nu conține produse inventate, fotografii private sau acces la conturi.

## Ce trebuie obținut

300 de produse ambalate distincte, disponibile în magazinele din Moldova,
cu fața ambalajului, ingredientele și tabelul nutrițional lizibile.
R2 verifică înregistrările; numărul de fotografii nu reprezintă numărul de
produse verificate. Lista de vânzări/top produse trebuie obținută și documentată
de echipă; această pregătire nu afirmă că avem deja un clasament comercial.

Surse de lucru: [plan R5](../../../superpowers/plans/2026-11-04-okbite-r5-capture-field.md),
[plan general](../../../superpowers/plans/2026-11-04-okbite-overall.md),
[categorii aprobate](../../../../data/categories.json),
[moderare R2](../../moderation.md).

## Repartizare și calendar

Planul general are cinci oameni × 60 produse. Titlul vechi „all four people”
din A6 este inconsistent cu această repartizare; R5 confirmă numele înaintea ieșirii.
Intervalele sunt locuri rezervate, nu produse deja colectate.

| Responsabil | Locuri | Număr | Nume confirmat de echipă |
| --- | --- | --- | --- |
| R1 | F001–F060 | 60 | de completat |
| R2 | F061–F120 | 60 | de completat |
| R3 | F121–F180 | 60 | de completat |
| R4 | F181–F240 | 60 | de completat |
| R5 | F241–F300 | 60 | de completat |

- Până la 11 noiembrie: R5 consolidează candidații reali și sursa selecției;
  R3 furnizează lista codurilor importate, R2 confirmă categoriile din staging.
- 12–18 noiembrie: prima ieșire. Folosiți aplicația integrată dacă este disponibilă;
  altfel, R2 indică procedura admin autorizată pe staging. Păstrați dovezile.
- 19–29 noiembrie: a doua ieșire utilizează fluxul foto al aplicației țintă
  `apps/mobile`; operatorul uman deschide și atribuie issue-uri cu eticheta `beta`.
  Refolosirea unui produs din prima ieșire nu crește totalul distinct.
- Zilnic: R5 elimină duplicatele și urmărește lipsurile; R2 verifică produsele
  după etichete. Echipa nu modifică producția în cadrul acestei pregătiri.

## Pregătire înainte de magazin

1. R1 furnizează linkul buildului/preview-ului pentru `apps/mobile`, SHA-ul și
   mediul staging. Preview-ul demonstrativ din rădăcină nu dovedește integrarea.
2. R3/R2 confirmă că `lookup`, `identify`, `read-label` și `add-product` funcționează
   împreună pe staging. R4 confirmă ruta produsului și comportamentul offline.
3. R5 execută un produs cunoscut și unul necunoscut cu două telefoane, folosind
   [fișa de dovadă](worksheet.md). Dacă o dependență lipsește, marcați scenariul
   blocat, nu trecut. Colectarea fotografiilor poate continua separat.
4. Alegeți produse reale din categoriile aprobate; notați categoria exactă.
   Distribuția se stabilește după oferta observată, fără a inventa cote de vânzări.
5. Verificați codul normalizat în baza staging și în lista importată de R3.
   Nu presupuneți că prefixul `484` acoperă toate produsele vândute în Moldova.
   Un produs găsit este un test de identificare, nu o contribuție nouă.

## Pentru fiecare produs

- Înregistrați locul Fxxx, persoana responsabilă, data, magazinul, marca, numele,
  cantitatea și codul citit exact. Nu deduceți codul din numele produsului.
- Utilizați normalizarea comună EAN/UPC; păstrați separat valoarea brută observată.
  Dacă nu există un cod lizibil, notați „fără cod lizibil”, nu fabricați unul.
- Fotografiați fața, ingredientele și tabelul nutrițional. Dacă ultimele două
  sunt în aceeași fotografie, înregistrați acest lucru și folosiți opțiunea aplicației.
- Verificați focalizarea, reflexiile, marginile și toate rândurile etichetei înainte
  de a pleca. Păstrați imaginile numai în spațiul privat autorizat al echipei.
  Nu fotografiați fețe, bonuri sau date de contact; nu comiteți imaginile în Git.
- Transcrieți ce scrie pe etichetă. Nutrienții lipsă rămân `null`, nu `0`.
  Respectați baza 100 g/100 ml și separatorul zecimal; nu calculați valori lipsă.
- Păstrați distinct „conține” și „poate conține”. OCR-ul, importul și presupunerile
  colectorului nu înlocuiesc verificarea umană a etichetei de către R2.
- La salvare notați UUID-ul returnat și starea „Neverificat”. Verificați pe al
  doilea telefon prin fluxul foto și consemnați UUID-ul găsit, nu doar numele.

## Duplicare și acceptare

Același cod normalizat ocupă un singur loc în total. Pentru un produs fără cod,
R5/R2 compară marca, numele, cantitatea și fotografiile înainte să-l numere.
O recaptură, o eroare de salvare sau o verificare repetată nu reprezintă produs nou.
Produsele deja importate se păstrează în jurnalul testării, dar se înlocuiesc în
lista contribuțiilor noi. Nu suprascrieți automat înregistrări verificate.

R2 furnizează zilnic un raport autorizat: mediu, moment, totaluri `verified`,
`unverified`, `hidden`, duplicate și motive de respingere. Raportul milestone-ului
de minimum 300 `verified` din plan va fi obținut de operator în mediul autorizat;
un total pe staging nu dovedește același total în producție. Nimeni nu bifează A6
doar pentru că există 300 de locuri sau 900 de fotografii.

## Handoff încă necesar

| Proprietar | Livrabil concret | Termen propus |
| --- | --- | --- |
| R5 + echipa | Nume pentru cele cinci intervale, listă reală și dovada selecției | 11 nov |
| R3 | Coduri importate și identificare/OCR disponibile în staging | înainte de testul integrat |
| R2 | Acces admin prin procedura echipei, seed categorii, verificare zilnică | înainte de prima încărcare |
| R4 | Ruta rezultatului și coada/ruta offline în aplicația țintă | înainte de scenariile respective |
| R1 | Builduri/URL staging, SHA, două dispozitive și coordonarea integrării | înainte de testul integrat |

Datele sunt ținte de planificare; lipsa livrabilului se înregistrează ca blocaj.
