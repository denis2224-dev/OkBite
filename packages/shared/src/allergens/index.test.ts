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
    // Anexa II pct. 1 exceptions (a)–(c): glucose syrups, dextrose, maltodextrins from wheat or barley
    ['sirop de glucoză din grâu, dextroză din grâu', [], []],
    ['maltodextrină din grâu, sirop de glucoză din orz', [], []],
    ['sirop de glucoză din grâu, făină de grâu', ['Gluten'], []],
    // pct. 7 exception (b): lactitol
    ['lactitol', [], []],
  ])('detectAllergens(%s)', (text, allergens, may) =>
    expect(detectAllergens(text)).toEqual({ allergens, mayContain: may }),
  );
});
