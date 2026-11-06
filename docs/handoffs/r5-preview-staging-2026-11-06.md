# R5 / preview — handoff pentru staging

6 noiembrie 2026. Ramură: `codex/r5-preview-staging`.
Bază: `1e23e7c` (pregătirea R5 din #72, peste tema/accesibilitatea din #71).
Acest handoff nu autorizează merge sau deploy și nu modifică PR-urile colegilor.

## Modificări

- Acasă deschide `/capture` și `/scan`, inclusiv în demo; elimină ruta inexistentă.
- Demo necesită explicit `EXPO_PUBLIC_PREVIEW=1`. Produsele demonstrative folosesc
  fixture-urile existente, afișează avertizarea și nu scriu în istoricul real.
- Captura, etichetele și codurile ignoră răspunsurile întârziate după plecarea de
  pe ecran. Revenirea permite reluarea; salvarea durabilă offline continuă.
- Limitele fotografiilor și retry-ul după un eșec de stocare sunt păstrate.

## Verificare și limite

- Verificare înainte de commit: `pnpm lint` (0 erori, 57 avertismente existente),
  `pnpm typecheck` și `pnpm --filter mobile test` (507 teste / 61 suite) trecute.
- Ultima verificare a exporturilor web/iOS/Android a trecut pe aceste modificări.
- Ownerul raportează T1–T8 trecute în browser pe iPhone și Android Redmi
  (posibil Redmi 10; modelul, versiunile OS/browserului nu sunt confirmate).
- Aceste rezultate privesc demo-ul. Identificarea/salvarea reale și acceptarea
  nativă B2/B3/B7 rămân de executat; taskurile nu sunt bifate complet.
- Review-ul cerut de AGENTS.md și aprobarea pentru main rămân pași separați.

## Ce pregătește R1 cu R2/R3

1. Reconciliați această ramură cu integrarea curentă și confirmați SHA-ul testat;
   păstrați aplicația aprobată, fără a crea o a doua aplicație din alte layouturi.
2. Confirmați stagingul existent și furnizați URL HTTPS/builduri pentru telefoane.
   Configurați `EXPO_PUBLIC_PREVIEW=0`, URL-ul și cheia publică de client Supabase
   în mediul buildului; cheile serverului nu intră în aplicație sau Git.
3. R2/R3 confirmă serviciile lookup, identify, read-label și add-product,
   autorizarea, CORS pentru originea HTTPS și un produs real cunoscut pentru test.
4. R5 testează pe ambele telefoane: cunoscut; necunoscut → etichete → corectare →
   salvare → același produs pe telefonul doi; apoi offline/restart/reconectare,
   întreruperea confirmării, poze mari și erori recuperabile.
