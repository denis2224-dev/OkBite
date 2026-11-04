import type { Allergen } from '../contract';

/**
 * Romanian label words for the 14 allergens of Reg. (UE) nr. 1169/2011, Anexa II
 * (https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32011R1169).
 * Patterns run on lower-case text where ș → "sh", ț → "ts" and other diacritics are
 * dropped; labels printed without diacritics give plain "s"/"t", so both are accepted.
 * Draft by an agent: the R3 owner must check every line against Anexa II before merge.
 */
export const SYNONYMS: Record<Allergen, RegExp> = {
  // Anexa II pct. 1: grâu, secară, orz, ovăz, spelt, kamut (khorasan)
  Gluten: /\b(grau|alac|gluten|secara|orz|ovaz|spelta?|kamut|khorasan|malt|gris)\b/,
  // pct. 2
  Crustacee: /\b(crustacee|crevet(s)?i|crab|homar|langusta|raci)\b/,
  // pct. 3
  Ouă: /\b(ou|oua|ouale|albus|galbenus)\b/,
  // pct. 4: "peste" without diacritics also means "over", so only in phrases
  Pește: /\b(peshte|(file|ulei|carne|faina|sos|icre) de peste|peste (afumat|sarat|congelat|oceanic)|ton|somon|hering|macrou|sardine|anchois|cod(?! (produs|de bare|lot)))\b/,
  // pct. 5
  Arahide: /\b(arahid[ae]|alune de pamant)\b/,
  // pct. 6
  Soia: /\b(soia|soya)\b/,
  // pct. 7: lapte și produse derivate; "unt de cacao", "lapte de cocos" are plant products
  Lapte: /\b(lapte(?! de (cocos|migdale|ovaz|orez))|lactoza|zer|cazeina(t)?|caseina(t)?|smantana|frisca|branza|iaurt|chefir|unt(?! de (cacao|arahide|shea)))\b/,
  // pct. 8: migdale, alune, nuci, caju, pecan, nuci braziliene, fistic, macadamia
  'Fructe cu coajă lemnoasă': /\b(migdal[ae]|alun[ae](?! de pamant)|nuc[ai](?! de cocos)|caju|pecan|fistic|macadamia)\b/,
  // pct. 9
  Țelină: /\bt(s)?elina\b/,
  // pct. 10
  Muștar: /\bmus(h)?tar\b/,
  // pct. 11
  Susan: /\bsusan\b/,
  // pct. 12: dioxid de sulf și sulfiți (E220–E228)
  'Dioxid de sulf și sulfiți': /\b(dioxid de sulf|anhidrida sulfuroasa|(meta)?(bi)?sulfit\w*|e[ -]?22[0-8])\b/,
  // pct. 13
  Lupin: /\blupin\b/,
  // pct. 14
  Moluște: /\b(molus(h)?te|scoici|midi[ei]|calamar[i]?|sepie|caracatits?a|stridii|melci)\b/,
};
