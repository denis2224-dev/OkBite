import type { Allergen } from '../contract';

/**
 * Romanian label words for the 14 allergens of Reg. (UE) nr. 1169/2011, Anexa II
 * (https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32011R1169).
 * Patterns run on lower-case text where ș → "sh", ț → "ts" and other diacritics are
 * dropped; labels printed without diacritics give plain "s"/"t", so both are accepted.
 * Stems end in \w* where Romanian adds plural or article endings (nucile, crabi, cazeinați).
 */
export const SYNONYMS: Record<Allergen, RegExp> = {
  // Anexa II pct. 1: grâu (spelt, khorasan), secară, orz, ovăz. Exceptions: (a) glucose syrups
  // from wheat incl. dextrose, (b) maltodextrins from wheat, (c) glucose syrups from barley
  Gluten:
    /\b(?<!(sirop de glucoza|dextroza|maltodextrina) din )grau\b|\b(?<!sirop de glucoza din )orz\b|\b(alac|gluten|secara|ovaz|spelta?|kamut|khorasan|malts?|gris(h)?)\b/,
  // pct. 2
  Crustacee: /\b(crustace\w*|crevet\w*|crab\w*|homar\w*|langust\w*|rac|raci|racii)\b/,
  // pct. 3
  Ouă: /\b(ou|oua|ouale|albus(h)?|galbenus(h)?)\b/,
  // pct. 4: unaccented "peste" before a number means "over" ("peste 50%"), otherwise fish
  Pește:
    /\b(peshte|peste(?!\s+\d)|ton|somon\w*|hering\w*|macrou\w*|sardin\w*|anchois|hamsi\w*|s(h)?prot\w*|pastrav\w*|stavrid\w*|scrumbi\w*|merluciu|cod(?! (produs|de bare|lot)))\b/,
  // pct. 5
  Arahide: /\b(arahid\w*|alune(le)? de pamant)\b/,
  // pct. 6
  Soia: /\b(soia|soya)\b/,
  // pct. 7: lapte și produse derivate (incl. lactoză), except lactitol; "unt de cacao", "lapte de
  // cocos" are plant products
  Lapte:
    /\b(lapte(?! de (cocos|migdale|ovaz|orez))|lactoza|zer|cazein\w*|casein\w*|smantan\w*|fris(h)?ca|branz\w*|iaurt\w*|chefir|unt(?! de (cacao|arahide|shea)))\b/,
  // pct. 8: migdale, alune, nuci, caju, pecan, nuci braziliene, fistic, macadamia
  'Fructe cu coajă lemnoasă':
    /\b(migdal\w*|alun(a|e|ele|elor)(?! de pamant)|nuc(a|i|ile|ilor)(?! de cocos)|caju|pecan|fistic|macadamia)\b/,
  // pct. 9
  Țelină: /\bt(s)?elin\w*/,
  // pct. 10
  Muștar: /\bmus(h)?tar\w*/,
  // pct. 11
  Susan: /\bsusan\w*/,
  // pct. 12: dioxid de sulf și sulfiți (E220–E228)
  'Dioxid de sulf și sulfiți':
    /\b(dioxid de sulf|anhidrida sulfuroasa|(meta)?(bi)?sulfit\w*|e[ -]?22[0-8])\b/,
  // pct. 13
  Lupin: /\blupin\w*/,
  // pct. 14
  Moluște:
    /\b(molus(h)?t\w*|scoic\w*|midi\w*|calamar\w*|sepi[ae]|caracatits?\w*|stridi\w*|melc\w*)\b/,
};
