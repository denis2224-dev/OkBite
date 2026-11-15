import { describe, expect, it } from 'vitest';
import { detectAllergens } from './index';

describe('detectAllergens', () => {
  it.each([
    ['lapte normalizat, culturi lactice vii', ['Lapte'], []],
    ['făină de grâu, zahăr, lecitină din soia', ['Gluten', 'Soia'], []],
    ['ciocolată (zahăr, unt de cacao, masă de cacao)', [], []],
    ['FAINA DE GRAU, OUA', ['Gluten', 'Ouă'], []],
    ['zahăr. Poate conține urme de arahide și susan.', [], ['Arahide', 'Susan']],
    ['ovăz 32%, lapte praf. Poate conține: ouă.', ['Gluten', 'Lapte'], ['Ouă']],
    ['unt de cacao, unt 82%', ['Lapte'], []],
    ['zahăr. Poate contine urme de lapte, lapte', [], ['Lapte']],
    ['', [], []],
    ['file de pește, sare', ['Pește'], []],
    ['pește 60%, ulei', ['Pește'], []],
    ['de peste 50% fructe', [], []],
    ['cod produs 123, zahăr', [], []],
    ['vin, metabisulfit de potasiu, E-224', ['Dioxid de sulf și sulfiți'], []],
    ['anhidridă sulfuroasă', ['Dioxid de sulf și sulfiți'], []],
    ['cozonac cu nucă, alună, migdală', ['Fructe cu coajă lemnoasă'], []],
    ['nucă de cocos', [], []],
    ['arahidă prăjită, midie, calamari', ['Arahide', 'Moluște'], []],
    ['Poate conține urme de lapte. Ingrediente: făină de grâu', ['Gluten'], ['Lapte']],
    ['țelină, muștar, creveți', ['Crustacee', 'Țelină', 'Muștar'], []],
    ['telina, mustar', ['Țelină', 'Muștar'], []],
    ['poate conţine (cedilla) susan', [], ['Susan']],
    // ș/ț inside keywords
    ['extract de malț', ['Gluten'], []],
    ['griș 40%', ['Gluten'], []],
    ['albuș, gălbenuș', ['Ouă'], []],
    ['frișcă', ['Lapte'], []],
    ['grâu khorasan, alac', ['Gluten'], []],
    // Anexa II pct. 1 exceptions: (a)(b) wheat glucose syrup, dextrose, maltodextrin; (c) barley glucose syrup
    ['sirop de glucoză din grâu, dextroză din grâu', [], []],
    ['maltodextrină din grâu, sirop de glucoză din orz', [], []],
    ['sirop de glucoză din grâu, făină de grâu', ['Gluten'], []],
    ['maltodextrină din orz', ['Gluten'], []],
    // pct. 7 exception (b): lactitol
    ['lactitol', [], []],
    // review of PR #3: fish without diacritics, fish names, inflected forms, trace boundaries
    ['Poate contine urme de peste.', [], ['Pește']],
    ['Ingrediente: peste (70%), apa, sare.', ['Pește'], []],
    ['păstrăv afumat, sare', ['Pește'], []],
    ['șprot afumat, ulei', ['Pește'], []],
    ['sardină, ulei', ['Pește'], []],
    ['crabi, homari', ['Crustacee'], []],
    ['crevete decorticat', ['Crustacee'], []],
    ['stridie, scoică', ['Moluște'], []],
    ['emulsifiant: cazeinați de sodiu', ['Lapte'], []],
    ['nucile, alunele, migdalele', ['Fructe cu coajă lemnoasă'], []],
    ['nucile de cocos, alunele de pământ', ['Arahide'], []],
    [
      'Poate conține urme de arahide\nIngrediente: lapte praf, făină de grâu',
      ['Gluten', 'Lapte'],
      ['Arahide'],
    ],
    ['Poate conține urme de susan; Ingrediente: ouă', ['Ouă'], ['Susan']],
    ['poate conține urme de arahide ingrediente: lapte', ['Lapte'], ['Arahide']],
  ])('detectAllergens(%s)', (text, allergens, may) =>
    expect(detectAllergens(text)).toEqual({ allergens, mayContain: may }),
  );

  it.each<[string, string[], string[]]>([
    ['Ingredients: WHEAT flour. May contain MILK and PEANUTS.', ['Gluten'], ['Arahide', 'Lapte']],
    [
      'Ingredients: wheat flour.\nMay contain:\nMILK, PEANUTS;\nSESAME.\nServing suggestion: serve with eggs.',
      ['Gluten'], ['Arahide', 'Lapte', 'Susan'],
    ],
    [
      'Состав: пшеничная мука. Может содержать следы молока, арахиса и кунжута.',
      ['Gluten'], ['Arahide', 'Lapte', 'Susan'],
    ],
    ['Složení: pšeničná mouka. Může obsahovat stopy mléka a arašídů.', ['Gluten'], ['Arahide', 'Lapte']],
    ['Ingredients: rice and MILK. May contain milk and eggs.', ['Lapte'], ['Ouă']],
    ['May contain peanuts.\nIngredients: milk powder and wheat flour.', ['Gluten', 'Lapte'], ['Arahide']],
    ['Milk-free. Ingredients: rice, coconut milk and cocoa butter. May contain peanuts.', [], ['Arahide']],
    ['Состав: рис. Не содержит молока. Может содержать арахис.', [], ['Arahide']],
    ['Složení: rýže. Bez mléka. Může obsahovat sezam.', [], ['Susan']],
    ['Ingredients: wheat glucose syrup, dextrose from wheat, barley glucose syrup.', [], []],
    ['Biscuit cu lapte. Ingredients:wheat flour. May contain:sesame.', ['Gluten'], ['Susan']],
    ['Ingredients: sugar. Fără urme de lapte. May contain:peanuts.', [], ['Arahide']],
    ['Ingredients: rice. No traces of milk. May contain sesame.', [], ['Susan']],
    ['Ingredients: rice. Without traces of milk. May contain sesame.', [], ['Susan']],
    ['Ingredients: coconut\nmilk, rice.', [], []],
    ['Ingredients: coconut\nContains: milk.', ['Lapte'], []],
    ['Ingredients: rice. May contain coconut. May contain milk.', [], ['Lapte']],
    ['Ingredients:rice. May contain:milk and\npeanuts. Contains:egg.', ['Ouă'], ['Arahide', 'Lapte']],
    [
      'Ingrediente: fulgi de ovăz integral, făină de grâu, fructe conservate cu dioxid de sulf. Produsul poate conține urme de lapte și produse lactate, soia, arahide, nuci și semințe de susan.',
      ['Gluten', 'Dioxid de sulf și sulfiți'], ['Arahide', 'Soia', 'Lapte', 'Fructe cu coajă lemnoasă', 'Susan'],
    ],
  ])('classifies declared allergens and traces in %s', (label, allergens, mayContain) => {
    expect(detectAllergens(label)).toEqual({ allergens, mayContain });
  });
});
