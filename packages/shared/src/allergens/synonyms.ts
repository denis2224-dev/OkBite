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

// Additional label vocabulary, grouped under the existing allergens:
// EN and CS: https://eur-lex.europa.eu/eli/reg/2011/1169/oj/eng
// https://eur-lex.europa.eu/legal-content/CS/ALL/?uri=celex%3A32011R1169
// RU: Moldova Law 279/2017, Appendix 1, https://faolex.fao.org/docs/pdf/mol183760_2017.pdf
// Unicode word boundaries keep terms such as "milk" and "молоко" inside whole words.
function word(pattern: RegExp): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern.source})(?![\\p{L}\\p{N}])`, 'u');
}

export const MULTILINGUAL_SYNONYMS: Record<Allergen, RegExp> = {
  Gluten: word(/wheat|rye|barley|oats?|spelt|lepk(?:u|em)|lepek|psenic(?:e|i|na|ne|ny)|zit(?:o|a|ne)|jecmen(?:e|ny)?|oves|ovsa|ovesne|глютен(?:а|ом)?|пшениц(?:а|ы|у)|пшеничн(?:ая|ой|ые|ый)|рожь|ржи|ячмен(?:ь|я)|ов[её]с|овса/),
  Crustacee: word(/crustaceans?|shrimps?|prawns?|lobsters?|korys[ui]|ракообразн(?:ые|ых)/),
  Ouă: word(/eggs?|vejce|vajec|яйц(?:о|а)|яиц/),
  Pește: word(/fish|ryb(?:a|y|i)?|рыб(?:а|ы|у|н(?:ый|ая|ое|ые))/),
  Arahide: word(/peanuts?|arasid(?:y|u)?|burske\s+orisky|арахис(?:а|ом)?/),
  Soia: word(/soy(?:a|beans?)?|soj(?:a|i|e|ove|ovych)|соя|сои|сою|соев(?:ый|ая|ое|ые)/),
  Lapte: word(/(?<!coconut |almond |soy |soya |oat |rice )milk|whey|lactose|(?<!kokosove |mandlove |sojove |ovesne |ryzove )mlek(?:o|a|em)|laktoz(?:a|y)|(?<!кокосовое |кокосового |миндальное |миндального |соевое |соевого |овсяное |овсяного |рисовое |рисового )молок(?:о|а|ом)|лактоз(?:а|ы|у)/),
  'Fructe cu coajă lemnoasă': word(/nuts?|almonds?|hazelnuts?|walnuts?|cashews?|pecans?|pistachios?|orech(?:y|u)|mandl(?:e|i)|pistaci(?:e|i)|(?<!кокосовые |кокосовых )орех(?:и|ов)|миндал(?:ь|я)|кешью|фисташ(?:ки|ек)/),
  Țelină: word(/celery|celer(?:u|em)?|сельдер(?:ей|ея)/),
  Muștar: word(/mustard|horcic(?:e|i)|горчиц(?:а|ы|у)/),
  Susan: word(/sesame|sezam(?:u|ove|ovych)?|кунжут(?:а|ом)?/),
  'Dioxid de sulf și sulfiți': word(/sul(?:f|ph)ur\s+dioxide|sulphites?|oxid\s+siricity|siricitany|диоксид\s+серы|сульфит(?:ы|ов)?/),
  Lupin: word(/lupins?|lupina|lupiny|vlci\s+bob|люпин(?:а|ом)?/),
  Moluște: word(/mollus(?:c|k)s?|mekkys(?:i|u)|моллюск(?:и|ов)/),
};
