import { describe, expect, it } from 'vitest';
import { allergenPatch } from './backfill-allergens';

const row = (ingredients_text: string, allergens: string[] = [], may_contain: string[] = []) =>
  ({ code: '1', ingredients_text, allergens, may_contain }) as Parameters<typeof allergenPatch>[0];

describe('allergenPatch', () => {
  it('adds the tree-nut group name that older rows missed, as a trace', () => {
    expect(allergenPatch(row('făină. Poate conține urme de fructe cu coajă lemnoasă.'))).toEqual({
      allergens: [],
      may_contain: ['Fructe cu coajă lemnoasă'],
    });
  });

  it('adds a declared allergen the old matcher missed', () => {
    expect(allergenPatch(row('făină, fructe cu coajă lemnoasă', ['Gluten']))).toEqual({
      allergens: ['Gluten', 'Fructe cu coajă lemnoasă'],
      may_contain: [],
    });
  });

  it('never removes an allergen, such as one taken from Open Food Facts tags', () => {
    expect(allergenPatch(row('zahăr, apă', ['Lapte'], ['Soia']))).toBeNull();
  });

  it('moves a trace to declared when the text now declares it', () => {
    expect(allergenPatch(row('zahăr, alune', [], ['Fructe cu coajă lemnoasă']))).toEqual({
      allergens: ['Fructe cu coajă lemnoasă'],
      may_contain: [],
    });
  });

  it('returns null when nothing changes', () => {
    expect(allergenPatch(row('lapte, zahăr', ['Lapte']))).toBeNull();
    expect(allergenPatch(row('nucă de cocos', []))).toBeNull();
  });
});
