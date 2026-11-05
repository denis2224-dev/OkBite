# A7 — Pregătirea beta și trierea feedbackului

Responsabil: R5; interval din plan: 23 noiembrie–1 decembrie 2026.
Stare: **materiale pregătite; niciun tester recrutat și nicio sesiune declarată**.
Ținta este 25 de persoane distincte, nu 25 de instalări sau rulări automate.

Surse: [plan R5](../../../superpowers/plans/2026-11-04-okbite-r5-capture-field.md),
[specificație](../../../superpowers/specs/2026-11-03-okbite-design.md).
Folosiți [scenariile și fișa de dovadă](scenarios.md) și
[formularul cu cinci întrebări](feedback.md).

## Condiții înainte de invitații

- R1 confirmă buildurile EAS preview și URL-ul HTTPS pentru **apps/mobile**,
  SHA-ul, mediul staging și proprietarul fiecărui build. Preview-ul demonstrativ
  din rădăcina proiectului nu este aplicația integrată pentru această acceptare.
- R2/R3 confirmă pe staging funcțiile de identificare, OCR, salvare, căutare,
  categoriile și limitele de upload. Nu trimiteți chei server către testeri.
- R4 confirmă rezultatul, istoricul și coada offline; R5 execută gate-ul P2:
  produs necunoscut adăugat, „Neverificat”, găsit de al doilea telefon și verificat
  de moderator. Un gate blocat nu devine trecut prin folosirea mock-urilor.
- R1 desemnează persoana care distribuie buildurile în conturile autorizate.
  Android primește linkul intern EAS; pentru iPhone, R1 gestionează înregistrarea
  dispozitivului și buildul intern, sau oferă Safari. Nu se trimite la magazine.
- R5 și echipa aleg canalul privat și persoana care primește feedbackul.
  Aceste materiale nu creează un formular public și nu trimit invitații automat.

## Recrutare și acoperire

Echipa invită colegi, familie și, dacă există contact autorizat, o comunitate
interesată de alergeni. Participarea nu cere divulgarea unui diagnostic.
R5 atribuie T01–T25 persoanelor reale și păstrează contactele separat, privat.
Un participant poate verifica mai multe platforme, dar este numărat o singură dată.

| Suprafață necesară | Dovadă cerută | Stare inițială |
| --- | --- | --- |
| iPhone, aplicație internă | model, iOS, SHA, scenarii, rezultat | neexecutat |
| iPhone, Safari | model, iOS/Safari, URL, SHA, scenarii | neexecutat |
| Android, aplicație internă | model, Android, SHA, scenarii | neexecutat |
| Android, Chrome | model, Android/Chrome, URL, SHA, scenarii | neexecutat |

R5 stabilește distribuția reală după dispozitivele disponibile. Nu înlocuiți
acceptarea aplicației iPhone cu un test Safari; consemnați lipsa separat.
Folosiți limitele de OS/browser din specificație și notați versiunile exacte.

## Invitație propusă (de trimis numai de echipă)

„Salut! Testăm o versiune beta OkBite în limba română. Te invităm să încerci
fotografierea unui produs, citirea etichetei și istoricul, apoi să răspunzi la
cinci întrebări. Folosim un mediu de test și rezultatele pot avea erori.
Compară informațiile cu ambalajul produsului. Nu trimite date medicale, parole,
bonuri sau fotografii cu alte persoane. Îți trimitem separat linkul potrivit
telefonului tău și canalul privat pentru feedback.”

Înlocuiți linkurile și confirmați canalul înainte de trimitere. Un exemplu de
invitație nu dovedește că cineva a fost contactat sau și-a dat acordul.

## Rutina zilnică și severități

R5 citește feedbackul zilnic și deduplică; operatorul uman deschide și atribuie
issue-uri `beta` cu mediul,
SHA-ul, pașii, rezultatul așteptat/observat, dovada redactată și proprietarul.
Publicarea unui issue nu trebuie să expună contacte, chei sau fotografii private.
R1 coordonează integrarea; fiecare rol repară numai propriile căi.

| Severitate | Exemple din plan / impact | Acțiune |
| --- | --- | --- |
| P1 | alergen afișat greșit, crash, pierdere de date | anunțați imediat proprietarul prin canalul agreat; opriți scenariul afectat și prioritizați remedierea/retestarea |
| P2 | flux principal blocat, rezultat/rutare greșită, eroare fără recuperare | proprietar și reproducere în aceeași triere zilnică |
| P3 | problemă cosmetică sau inconvenient cu soluție de ocolire | păstrați reproducerea și prioritizați în backlog |

O suspiciune de alergen greșit se tratează ca P1 până la verificarea etichetei.
Lipsa unui scor când lipsesc datele necesare este comportament așteptat.
Nu transformați totalul de zaharuri în „zaharuri adăugate” și nu interpretați
numărul de aditivi ca recomandare de sănătate; acestea nu sunt câmpuri promise
de contractul actual. O cerere nouă merge la owner ca decizie de produs.

| Proprietar | Domeniu pentru issue |
| --- | --- |
| R5 | captură, scanare, confirmare, fotografii etichetă, review și salvare UI |
| R4 | client API/UI comun, rezultat, istoric, coadă offline, copy și accesibilitate comună |
| R3 | identificare/OCR server, scor, date/import, potrivire alergeni |
| R2 | contract, DB/RLS, salvare server, moderare, configurație backend |
| R1 | build/CI, hosting/PWA, comparație/detalii, teste end-to-end și merge |

Tranziții: `nou → reprodus → atribuit → remediere propusă → retestat → închis`.
Un P1 se închide numai după reproducerea inițială și dovada retestării pe
buildul corectat. „Nu am mai văzut problema” fără aceiași pași nu este retestare.

## Registru privat și criteriu de ieșire

Registrul per tester: ID, data sesiunii, platformele, SHA, scenariile efectuate,
rezultatele, formular primit și issue-urile aferente. Nu păstrați în Git contacte
sau răspunsuri care pot identifica persoana.
Raport zilnic: persoane distincte care chiar au folosit aplicația / 25, acoperirea
celor patru suprafețe, scenarii trecute/eșuate/blocate/neexecutate, P1/P2/P3 deschise.

Gate-ul din 1 decembrie cere 25 de utilizatori reali și **zero P1 deschise**,
împreună cu celelalte condiții din planul general. R5 raportează dovezile către R1;
nu declară întreaga aplicație completă și nu publică builduri de producție.
