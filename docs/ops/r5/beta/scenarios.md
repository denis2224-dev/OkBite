# A7 — Scenarii și dovadă manuală

Executați pe staging cu produse reale/documentate, după gate-urile din README.
Testele automate și exporturile de bundle au un raport separat. Niciun scenariu
de mai jos nu este executat prin simpla existență a acestei fișe.

| ID | Pași | Rezultat observabil așteptat |
| --- | --- | --- |
| S01 | fotografiați codul unui produs cunoscut | același UUID ca în lookup, rezultat cu datele sale |
| S02 | fotografiați fața aceluiași produs, fără cod lizibil | răspuns found → rezultat direct; candidates → confirmați/alegeți; în ambele cazuri UUID-ul corect |
| S03 | scanați live EAN-8/EAN-13/UPC-A și introduceți manual un cod valid/invalid | codurile valide normalizate; invalidul nu pornește lookup; fără bucle la eroare |
| S04 | pe un browser fără BarcodeDetector, fotografiați și deschideți scanarea | fotografia merge la identify; scanarea oferă introducere manuală și alternativa foto |
| S05 | refuzați camera, alegeți galerie, apoi reveniți la permisiune | alternativă utilizabilă, fără blocare; testați și eroarea de pornire a camerei |
| S06 | folosiți o fotografie reală cu potrivire ambiguă/negăsită | alegere/respingere → /add cu photoPath real și numai valorile prezente în read; valorile OCR lipsă rămân goale |
| S07 | produs necunoscut: ingrediente + tabel, apoi aceeași poză | ambele variante duc la review; la aceeași poză nutritionImage este null |
| S08 | corectați „0,3”, un câmp gol, un nutrient zero și unitatea necunoscută | 0.3, null și 0 rămân distincte; unitatea trebuie aleasă; save invalid rămâne blocat |
| S09 | schimbați ingredientele și reveniți să refaceți fotografia | alergeni actualizați; identitatea editată păstrată; nu se pierde front photoPath |
| S10 | salvați produsul necunoscut, apoi găsiți-l cu telefonul 2 și cereți verificarea de către R2 | produs vizibil „Neverificat”, același UUID pe telefonul 2; R2 consemnează verificarea |
| S11 | deschideți un produs online; opriți rețeaua; deschideți istoricul; fotografiați offline; reporniți aplicația și rețeaua | istoricul și fotografia persistă; o singură intrare în coadă; retry rezolvă fără pierdere; candidates/not_found au reluare explicită |
| S12 | provocați controlat offline/rate limit/eroare server pe staging, apoi retry | mesaj corect, aceeași fotografie reutilizabilă, fără salvări duplicate |
| S13 | font 200%, light/dark, VoiceOver/TalkBack și navigare tastatură web | text lizibil, controale etichetate, fără clipping sau acțiuni inaccesibile |
| S14 | cronometrați fotografia unui produs cunoscut → răspuns pe 4G real | sub 3 secunde conform spec; notați fiecare măsurătoare și condițiile rețelei |
| S15 | fotografiați un cod estompat/înclinat pe care dispozitivul nu îl citește | fotografia este trimisă la identify; eșecul detectorului singur nu deschide direct „produs negăsit” |
| S16 | trimiteți fotografii reale de 12 MP prin captură/galerie la identify și read-label, cu una și două etichete | fiecare JPEG are latura maximă ≤1600 px și ≤1,5 MB; fiecare request JSON total ≤2.000.000 bytes; fotografiile rămân lizibile |

Implementarea cozii/rutei offline este integrată prin #63 și #68–#70.
S11 rămâne neexecutat pe dispozitive până există staging și builduri configurate;
testele automate de recuperare nu înlocuiesc această dovadă.
S02/S04/S06–S10 cer funcțiile R3 reale; nu înlocuiți rezultatul cu un răspuns mock.
R1 furnizează metoda autorizată pentru condițiile de eroare, fără atacarea serviciului.
Pentru S16 R1/R2 ajută la măsurarea dimensiunilor și a numărului de bytes trimis;
păstrați numai măsurătorile, fără chei sau corpuri de request cu fotografii private.
Pentru S13 testați mărirea fontului și cu texte lungi; zoom-ul browserului singur
nu dovedește Dynamic Type pe telefon. Defectele din afara R5 se atribuie ownerului.

## Fișă per execuție (copiați privat)

| Câmp | De completat |
| --- | --- |
| Tester Txx / facilitator / dată și oră | |
| Scenariu / build SHA / mediu / URL sau build intern | |
| Model / OS / browser și versiune / tip rețea | |
| Produs / cod / UUID așteptat / sursa etichetei | |
| Permisiuni / stare rețea / condiții inițiale | |
| Pași exacți / rezultat observat / timp măsurat | |
| Stare: trecut, eșuat, blocat sau neexecutat | neexecutat |
| Dovadă privată redactată / issue / owner | |
| Retest: SHA corectat / dispozitiv / moment / rezultat | |

Un scenariu blocat trebuie să numească interfața, configurația sau dispozitivul
lipsă și proprietarul. Nu completați timpi, dispozitive sau dovezi din presupuneri.
