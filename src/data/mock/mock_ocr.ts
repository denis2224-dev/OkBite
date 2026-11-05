import { ro } from "../../core/constants/strings_ro";
import type { Allergen } from "../models/contract";
export const ocrExamples = {
  nap: {
    ing: "Făină de grâu, zahăr, grăsime vegetală de palmier, cacao degresată pudră 6%, lapte praf, emulsifiant: lecitină din soia, sare, aromă.",
    n: {
      kcal: "530",
      fat: "30",
      sat: "14",
      sugar: "35",
      salt: "0,3",
      protein: "6",
      fiber: "2",
    },
  },
  napU: {
    ing: "Făină de grâu, zah[?]r, grăsime vegetală de palmier, cacao degresată pudră [?]%, lapte praf, emulsifiant: lecitină din soia, sare, aromă.",
    n: {
      kcal: "",
      fat: "30",
      sat: "14",
      sugar: "",
      salt: "0,3",
      protein: "6",
      fiber: "2",
    },
  },
  juice: {
    ing: "Suc de mere din concentrat, antioxidant: acid ascorbic (E300).",
    n: {
      kcal: "46",
      fat: "0,1",
      sat: "0",
      sugar: "10,4",
      salt: "0,01",
      protein: "0,1",
      fiber: "0,2",
    },
  },
  juiceU: {
    ing: "Suc de mere din concentrat, antioxidant: acid ascorbic (E300).",
    n: {
      kcal: "46",
      fat: "0,1",
      sat: "0",
      sugar: "",
      salt: "",
      protein: "0,1",
      fiber: "0,2",
    },
  },
} as const;
export function ocrFor(unclear: boolean, tableOnly = false) {
  const sample = tableOnly
    ? unclear
      ? ocrExamples.juiceU
      : ocrExamples.juice
    : unclear
      ? ocrExamples.napU
      : ocrExamples.nap;
  return { ingredients: sample.ing, ...sample.n };
}
export const mockOcr = ocrFor(false);
export function detectAllergens(text: string): Allergen[] {
  const t = text.toLowerCase(),
    r: Allergen[] = [];
  if (/grâu|gluten|ovăz|orz|secară/.test(t)) r.push("Gluten");
  if (/lapte|smântână|zer|lactoză/.test(t)) r.push("Lapte");
  if (/soia/.test(t)) r.push("Soia");
  if (/ouă|ou praf|gălbenuș/.test(t)) r.push("Ouă");
  if (/arahide|alune/.test(t)) r.push("Arahide");
  if (/nuci|migdale|caju|fistic/.test(t)) r.push("Fructe cu coajă lemnoasă");
  if (/susan/.test(t)) r.push("Susan");
  return r;
}
export const mockIngredientLabel = ro.capture.preview.sampleIngredients;
