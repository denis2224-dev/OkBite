import { scoreGrade } from "../../core/utils/score_grade";
import { LookupResponse, AddProductRequest } from "../models/contract";
import records from "./mock_products.json";
export const previewEntries = records
  .map((entry) =>
    LookupResponse.parse({
      status: "found",
      ...entry,
      score: { ...entry.score, grade: scoreGrade(entry.score.score) },
    }),
  )
  .filter(
    (entry): entry is Extract<LookupResponse, { status: "found" }> =>
      entry.status === "found",
  );
export const foundYogurt = previewEntries[0]!;
export const validAdd = AddProductRequest.parse({
  code: null,
  name: "Biscuiți",
  brand: "Exemplu",
  quantity: "200 g",
  unit: "g",
  categorySlug: "biscuiti",
  ingredientsText: "făină, zahăr",
  nutrients: foundYogurt.product.nutrients,
  photoPath: null,
  ingredientsPhotoPath: "demo/i.jpg",
  nutritionPhotoPath: null,
});

export const demoMeta: Record<
  string,
  {
    key: string;
    short: string;
    ini: string;
    kind: string;
    tint: string;
    lid: string;
    photo: string;
    checked: string;
    sugarNote: string;
    missing: string;
  }
> = {
  "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f": {
    key: "livada",
    short: "LIVADA",
    ini: "LV",
    kind: "jar",
    tint: "#DCE8F1",
    lid: "#2F5D86",
    photo: "12.10.2026, magazin din Chișinău",
    checked: "28.10.2026",
    sugarNote: "natural din lapte",
    missing: "",
  },
  "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e2f": {
    key: "zorel",
    short: "ZOREL",
    ini: "Z",
    kind: "jar",
    tint: "#F6D9DE",
    lid: "#A3324C",
    photo: "09.10.2026, magazin din Bălți",
    checked: "27.10.2026",
    sugarNote: "în mare parte adăugat",
    missing: "",
  },
  "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e3f": {
    key: "stana",
    short: "STÂNA",
    ini: "SM",
    kind: "jar",
    tint: "#ECE8D8",
    lid: "#4E5D2F",
    photo: "14.10.2026, magazin din Chișinău",
    checked: "29.10.2026",
    sugarNote: "natural din lapte",
    missing: "",
  },
  "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e4f": {
    key: "ovazel",
    short: "OVĂZEL",
    ini: "O",
    kind: "box",
    tint: "#F1E0C6",
    lid: "#7A4A24",
    photo: "02.10.2026, magazin din Cahul",
    checked: "20.10.2026",
    sugarNote: "adăugat",
    missing: "",
  },
  "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e5f": {
    key: "morarita",
    short: "MORĂRIȚA",
    ini: "M",
    kind: "box",
    tint: "#E5ECD3",
    lid: "#4D5F24",
    photo: "05.10.2026, magazin din Chișinău",
    checked: "21.10.2026",
    sugarNote: "adăugat",
    missing: "",
  },
  "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f": {
    key: "gradina",
    short: "GRĂDINA",
    ini: "GS",
    kind: "carton",
    tint: "#F3EBC2",
    lid: "#5E6B12",
    photo: "11.10.2026, magazin din Orhei",
    checked: "25.10.2026",
    sugarNote: "",
    missing:
      "Eticheta nu declară zaharurile, grăsimile saturate și sarea. Fără ele nu putem calcula corect scorul.",
  },
};
export const demoHistory = [
  { id: "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e2f", time: "Azi, 14:32" },
  { id: "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f", time: "Azi, 14:30" },
  { id: "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e4f", time: "Ieri, 18:05" },
  { id: "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f", time: "Ieri, 18:01" },
] as const;
export const packSvgs: Record<string, string> = {
  jar: '<svg viewBox="0 0 96 116" aria-hidden="true"><rect x="14" y="4" width="68" height="16" rx="6" fill="{{v.lid}}"></rect><path d="M18 20h60v80a12 12 0 0 1-12 12H30a12 12 0 0 1-12-12z" fill="#FFFFFF"></path><rect x="18" y="46" width="60" height="34" fill="{{v.lid}}" opacity="0.14"></rect><text x="48" y="67" text-anchor="middle" font-family="Manrope, sans-serif" font-size="10" font-weight="800" fill="{{v.lid}}">{{v.short}}</text></svg>',
  box: '<svg viewBox="0 0 116 96" aria-hidden="true"><rect x="6" y="12" width="104" height="72" rx="8" fill="#FFFFFF"></rect><rect x="6" y="34" width="104" height="26" fill="{{v.lid}}" opacity="0.15"></rect><circle cx="88" cy="24" r="7" fill="{{v.lid}}" opacity="0.35"></circle><circle cx="74" cy="72" r="6" fill="{{v.lid}}" opacity="0.25"></circle><text x="58" y="51" text-anchor="middle" font-family="Manrope, sans-serif" font-size="10" font-weight="800" fill="{{v.lid}}">{{v.short}}</text></svg>',
  carton:
    '<svg viewBox="0 0 80 120" aria-hidden="true"><path d="M16 22l8-14h32l8 14v90H16z" fill="#FFFFFF"></path><path d="M16 22h48" stroke="{{v.lid}}" stroke-width="2"></path><circle cx="40" cy="44" r="10" fill="{{v.lid}}" opacity="0.4"></circle><rect x="16" y="62" width="48" height="26" fill="{{v.lid}}" opacity="0.15"></rect><text x="40" y="79" text-anchor="middle" font-family="Manrope, sans-serif" font-size="8" font-weight="800" fill="{{v.lid}}">{{v.short}}</text></svg>',
};
export const napIngredients: import("../models/contract").Ingredient[] = [
  {
    slug: "demo-0",
    name: "Făină de grâu",
    group: "base",
    role: "Cereale",
    explanation: "Făină albă, rafinată. Conține gluten.",
    source: "Fișă explicativă Pe Etichetă (date demo)",
    allergen: "Gluten",
  },
  {
    slug: "demo-1",
    name: "Zahăr",
    group: "taste",
    role: "Îndulcitor",
    explanation:
      "Adăugat de producător pentru gust. În tabelul nutrițional apare împreună cu zaharurile naturale, la „din care zaharuri”.",
    source: "Fișă explicativă Pe Etichetă (date demo)",
    allergen: null,
  },
  {
    slug: "demo-2",
    name: "Grăsime vegetală de palmier",
    group: "fat",
    role: "Grăsime",
    explanation:
      "Grăsime vegetală solidă la temperatura camerei, bogată în grăsimi saturate.",
    source: "Fișă explicativă Pe Etichetă (date demo)",
    allergen: null,
  },
  {
    slug: "demo-3",
    name: "Cacao degresată (6%)",
    group: "taste",
    role: "Gust",
    explanation: "Pudră de cacao din care s-a extras o parte din grăsime.",
    source: "Fișă explicativă Pe Etichetă (date demo)",
    allergen: null,
  },
  {
    slug: "demo-4",
    name: "Lapte praf",
    group: "base",
    role: "Ingredient lactat",
    explanation: "Lapte deshidratat; conține lactoză și proteine din lapte.",
    source: "Fișă explicativă Pe Etichetă (date demo)",
    allergen: "Lapte",
  },
  {
    slug: "demo-5",
    name: "Lecitină din soia (E322)",
    group: "add",
    role: "Emulsifiant",
    explanation:
      "Ajută grăsimea și apa să se amestece uniform. Provine din soia, alergen declarat.",
    source: "Reg. (UE) nr. 1333/2008 privind aditivii alimentari",
    allergen: "Soia",
  },
  {
    slug: "demo-6",
    name: "Sare",
    group: "taste",
    role: "Gust",
    explanation:
      "Adăugată pentru gust. Valoarea din tabel include și sodiul din alte ingrediente.",
    source: "Fișă explicativă Pe Etichetă (date demo)",
    allergen: null,
  },
  {
    slug: "demo-7",
    name: "Aromă",
    group: "taste",
    role: "Aromă",
    explanation: "Eticheta nu precizează dacă aroma este naturală.",
    source: "Fișă explicativă Pe Etichetă (date demo)",
    allergen: null,
  },
];
export function visualFor(product: import("../models/contract").Product) {
  return (
    demoMeta[product.id] ?? {
      key: "nou",
      short: "FOTO",
      ini: "N",
      kind: "box",
      tint: "#E9DED6",
      lid: "#6A4B3A",
      photo: "03.11.2026, de tine",
      checked: "în așteptarea echipei",
      sugarNote: "din tabelul fotografiat",
      missing: "",
    }
  );
}
