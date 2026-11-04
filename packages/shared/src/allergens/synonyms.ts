import type { Allergen } from '../contract';

/**
 * Romanian label words for the 14 allergens of Reg. (UE) nr. 1169/2011, Anexa II
 * (https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32011R1169).
 * Patterns run on lower-case text without diacritics. Draft by an agent:
 * the R3 owner must check every line against Anexa II before merge.
 */
export const SYNONYMS: Record<Allergen, RegExp> = {
  // Anexa II pct. 1: grâu, secară, orz, ovăz, spelt, kamut
  Gluten: /\b(grau|gluten|secara|orz|ovaz|spelta?|kamut|malt|gris)\b/,
  // pct. 2
  Crustacee: /\b(crustacee|creveti|crab|homar|langusta|raci)\b/,
  // pct. 3
  Ouă: /\b(ou|oua|ouale|albus|galbenus)\b/,
  // pct. 4 ("peste" also means "over": only in phrases)
  Pește: /\b(de peste|peste (afumat|sarat|congelat)|ton|somon|hering|macrou|sardine|anchois|cod)\b/,
  // pct. 5
  Arahide: /\b(arahide|alune de pamant)\b/,
  // pct. 6
  Soia: /\b(soia|soya)\b/,
  // pct. 7: lapte și produse derivate; "unt de cacao", "lapte de cocos" are plant products
  Lapte: /\b(lapte(?! de (cocos|migdale|ovaz|orez))|lactoza|zer|cazeina(t)?|caseina(t)?|smantana|frisca|branza|iaurt|chefir|unt(?! de (cacao|arahide|shea)))\b/,
  // pct. 8: migdale, alune, nuci, caju, pecan, nuci braziliene, fistic, macadamia
  'Fructe cu coajă lemnoasă': /\b(migdale|alune(?! de pamant)|nuci(?! de cocos)|caju|pecan|fistic|macadamia)\b/,
  // pct. 9
  Țelină: /\btelina\b/,
  // pct. 10
  Muștar: /\bmustar\b/,
  // pct. 11
  Susan: /\bsusan\b/,
  // pct. 12: dioxid de sulf și sulfiți (E220–E228)
  'Dioxid de sulf și sulfiți': /\b(dioxid de sulf|(meta|bi)?sulfit\w*|e ?22[0-8])\b/,
  // pct. 13
  Lupin: /\blupin\b/,
  // pct. 14
  Moluște: /\b(moluste|scoici|midii|calamar|sepie|caracatita|stridii|melci)\b/,
};
