# R1 — pregătirea preview-ului staging

6 noiembrie 2026. Stare: configurație pentru review; publicarea HTTPS și
acceptarea cu backendul real sunt în așteptarea accesului și confirmărilor.

## Ramură și reconciliere

- Ramură R1 mutată pe 7 noiembrie direct pe main după #78 (`c9629742`).
  Commitul R1 original (`7584833d`) pornea din `codex/r5-preview-staging` la
  `564f60ad`; corecțiile acelui commit R5 (flag preview explicit, gardă la
  pierderea focusului) sunt deja în main prin #78, iar singura parte lipsă
  (scanarea după o eroare în fundal) este în #79.
- #71/#72 rămân deschise separat; această ramură nu le mai include.
- Interfața și fluxurile din R5 sunt păstrate. Aplicația exportată rămâne
  `apps/mobile`; sursele preview-ului de la rădăcină nu au fost mutate.
- SHA-ul candidatului R1 se obține cu `git rev-parse D2-staging-preview`.
  După publicare, înregistrați separat SHA-ul și ID-ul deploymentului/buildului.

## Configurație pregătită

Exemplele `.env.example` și profilele EAS development/preview folosesc explicit
`EXPO_PUBLIC_PREVIEW=0`. URL-ul și cheia publică Supabase rămân necompletate
în exemple; valorile reale se setează privat în mediul aplicației și al Pages.
EAS `preview` trebuie să aibă același flag pentru actualizările JS.
Instrucțiunile sunt în `.github/SETUP.md`.

Publicați un preview de ramură în proiectul Pages existent, după confirmarea
ownerului. CORS-ul din main admite `https://<deployment>.okbite.pages.dev`;
R2 trebuie să confirme originea HTTPS efectivă. Nu a fost publicat un site,
modificat backendul, făcut merge în main sau deploy în producție.

## Dovezi din această verificare

- Instalare frozen cu pnpm 11.25.0; lint: 0 erori / 57 avertismente existente.
  TypeScript și `pnpm test` trec, inclusiv 507 teste mobile / 61 suite.
- Exporturile web/PWA și iOS/Android trec cu `EXPO_PUBLIC_PREVIEW=0`.
  Sunt bundle-uri locale, fără URL/cheie staging configurate, nu versiuni
  conectate, builduri semnate sau linkuri de instalare.
- `pnpm data:check`: 0 erori; cele 8 teste browser WebKit/Chromium trec.
  Acestea folosesc profile emulate și fixture-uri locale.
- Proiectul menționat în R2 #75, `vspdhdqaneofutsvavlc`, răspunde la OPTIONS
  pentru lookup, identify, read-label și add-product cu HTTP 204, originea
  `http://localhost:8081`, GET/POST și headerele aplicației permise.
  Preflightul nu a trimis chei/fotografii și nu dovedește fluxurile AI/salvare.
- Lookup HTTP direct pentru Dandar / semințe de floarea-soarelui prăjite,
  barcode `4840490000311`, returnează HTTP 200 / `not_found`, validat cu schema
  comună. Produsul are o sursă reală în `data/score-fixtures.draft.json`, dar
  nu este un produs cunoscut disponibil pentru acceptarea în staging.
  Cererea a folosit un device-id temporar, fără mediul client configurat;
  lookup poate înregistra telemetria normală.

## Resurse și confirmări necesare

- R2: aprobarea proiectului staging, valorile publice în mediul privat,
  SHA-ul backendului, schema/Storage și add-product cu fotografii persistente.
  #73/#74 sunt încă deschise; trebuie precizat codul efectiv găzduit.
- R3: identify/read-label reale, provider/model aprobat, fotografii autorizate,
  produs real încărcat în staging cu nume/barcode/ID și sursa verificată de om.
- Owner/R1: acces Cloudflare Pages și proiectul existent. Wrangler nu este
  autentificat; GitHub nu are secrete/variabile preview configurate.
- Pentru runda nativă: autentificare Expo, project ID și mediul EAS preview;
  `eas whoami` raportează „Not logged in”. iOS necesită echipa Apple și dispozitive
  înregistrate. Nu există încă builduri instalabile.
- Claude cross-review și aprobarea umană rămân necesare. T1–T8 raportate de R5
  privesc demo-ul; nu certifică această configurație sau fluxurile staging.

Coordonare trimisă către R2 în #75 și R3 în #37. Confirmările lor sunt în
așteptare. După deployment, R5 testează pe Safari/Chrome: cunoscut → identificare;
necunoscut → etichete → corectare → salvare → găsire pe telefonul doi; apoi
offline/restart/reconectare. Vizibilitatea produselor/fotografiilor pe al doilea
telefon și acceptarea nativă nu au fost verificate în această sesiune.
