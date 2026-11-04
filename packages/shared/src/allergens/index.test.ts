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
  ])('detectAllergens(%s)', (text, allergens, may) =>
    expect(detectAllergens(text)).toEqual({ allergens, mayContain: may }));
});
