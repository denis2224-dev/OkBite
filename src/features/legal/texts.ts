import { ro } from "../../core/constants/strings_ro";
export const texts = {
  about: [
    { title: ro.legal.aboutLead, body: ro.legal.aboutBody },
    {
      title: ro.legal.sources,
      body: "Datele provin din etichetele producătorilor, fotografiile cumpărătorilor, verificările echipei și, când este folosită această sursă, Open Food Facts. Datele Open Food Facts sunt disponibile sub licența Open Database License (ODbL).",
      url: "https://world.openfoodfacts.org/data",
    },
    {
      title: "Limitele datelor",
      body: "Un produs adăugat de un utilizator este marcat „Neverificat” până la verificarea echipei. Informațiile de pe ambalaj au prioritate. Modul demonstrativ conține produse fictive și scoruri ilustrative.",
    },
  ],
  privacy: [
    {
      title: ro.legal.privacyLead,
      body: "Nu este necesar un cont de cumpărător. Nu solicităm numele sau localizarea. Un identificator aleatoriu al dispozitivului este folosit pentru limitarea abuzurilor și funcționarea serviciului.",
    },
    {
      title: "Fotografiile etichetelor",
      body: "În versiunea conectată, fotografiile sunt trimise serviciului extern Anthropic pentru citirea ambalajului și sunt păstrate în înregistrarea produsului. Nu fotografia persoane, bonuri sau alte date personale. În modul demonstrativ nu sunt încărcate fotografii.",
    },
    {
      title: "Pe acest telefon",
      body: "Istoricul este păstrat local și poate fi șters din ecranul Istoric. Codurile și fotografiile puse în așteptare sunt păstrate local până la procesare sau renunțare. Ștergerea istoricului nu șterge un produs deja adăugat în baza publică.",
    },
    {
      title: "Drepturi și contact",
      body: "Înainte de publicare, operatorul va preciza datele de contact, temeiurile prelucrării, duratele de păstrare, destinatarii, transferurile și procedura pentru acces, corectare și ștergere. Acest proiect nu reprezintă încă o politică finală de confidențialitate.",
    },
    {
      title: "Cadrul aplicabil",
      body: "Legea nr. 195/2024 privind protecția datelor cu caracter personal a intrat în vigoare la 23 august 2026. Textul final trebuie verificat în raport cu legislația aplicabilă și cu serviciile efectiv configurate.",
      url: "https://www.justice.gov.md/ro/content/noua-lege-privind-protectia-datelor-cu-caracter-personal-reprezinta-un-pas-esential",
    },
  ],
  terms: [
    {
      title: ro.legal.termsLead,
      body: "OkBite oferă informații despre etichete și nu înlocuiește recomandările unui specialist. Scorul descrie calitatea nutrițională, nu siguranța unui aliment pentru o anumită persoană.",
    },
    {
      title: "Verifică ambalajul",
      body: "Pentru alergii sau restricții alimentare, citește întotdeauna ambalajul original. Rețetele și etichetele se pot modifica. Datele adăugate de cumpărători rămân marcate „Neverificat” până la verificare.",
    },
    {
      title: "Contribuții",
      body: "Trimite numai fotografii ale produselor și etichetelor pe care le poți distribui. Nu include persoane sau date personale. Raportează diferențele față de ambalaj prin opțiunea din ecranul produsului.",
    },
    {
      title: "Disponibilitate",
      body: "Aplicația poate funcționa temporar fără conexiune pentru produsele salvate în istoric. O căutare nouă necesită conexiune. Nu sunt implementate abonamente sau plăți.",
    },
  ],
  method: [
    {
      title: ro.legal.methodLead,
      body: "Metoda prevăzută pentru versiunea conectată folosește regulile Nutri-Score 2023, apoi exprimă rezultatul pe o scară de la 0 la 100. Valoarea este calculată la 100 g sau 100 ml, în funcție de produs. Scorurile din modul demonstrativ sunt ilustrative.",
    },
    {
      title: ro.home.legend,
      body: "60–100: calitate nutrițională bună. 40–59: medie. 0–39: scăzută. Comparațiile sunt relevante între produse din aceeași categorie.",
    },
    {
      title: ro.result.insufficient,
      body: "Dacă lipsesc energia, zaharurile, grăsimile saturate sau sarea, scorul nu este calculat. O valoare lipsă nu este înlocuită cu zero.",
    },
    {
      title: "Referințe și porții",
      body: "Procentele pe porție folosesc referințele zilnice pentru un adult: 2 000 kcal, 90 g zaharuri, 20 g grăsimi saturate și 6 g sare. Acestea nu sunt recomandări personalizate.",
    },
    { title: ro.score.title, body: ro.score.disclaimer },
  ],
} as const;
export type LegalKind = keyof typeof texts;
