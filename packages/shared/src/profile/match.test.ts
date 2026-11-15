import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Allergen } from '../contract';
import { matchIngredients, type IngredientKey } from '../ingredients';
import { matchProfile, type MatchableProduct } from './match';
import type { AvoidKey, Profile } from './types';

const KB: IngredientKey[] = JSON.parse(readFileSync(new URL('../../../../data/ingredients.json', import.meta.url), 'utf8'));
// A product as the database stores it: ingredients resolved against the knowledge base.
const resolved = (text: string) => product(text, {
  ingredients: matchIngredients(text, KB).map((m) => ({ name: m.rawName, slug: m.slug })),
});

const ALL_AVOID: AvoidKey[] = ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'];

function product(ingredientsText: string, extra: Partial<MatchableProduct> = {}): MatchableProduct {
  return { ingredientsText, ingredients: [], allergens: [], mayContain: [], processing: { level: 1 }, ...extra };
}
const profile = (avoid: AvoidKey[], allergens: Allergen[] = []): Pick<Profile, 'allergens' | 'avoid'> => ({ avoid, allergens });
const hit = (p: MatchableProduct, key: AvoidKey) => matchProfile(p, profile([key])).avoid.find((a) => a.key === key);

describe('avoid keys', () => {
  it.each<[AvoidKey, string, string[]]>([
    ['added_sugar', 'Făină de grâu, zahăr, sare', ['zahăr']],
    ['added_sugar', 'apă, sirop de glucoză-fructoză, arome', ['sirop de glucoză-fructoză']],
    ['added_sugar', 'iaurt, dextroză, miere', ['dextroză', 'miere']],
    ['sweeteners', 'apă, îndulcitori: aspartam, acesulfam K', ['aspartam', 'acesulfam K']],
    ['sweeteners', 'apă, E955', ['E955']],
    ['colourings', 'apă, colorant: caramel (E150d)', ['E150d', 'caramel']],
    ['colourings', 'suc, colorant (caroteni), arome', ['caroteni']],
    ['colourings', 'chipsuri, coloranţi: extract de ardei roşu, sare', ['extract de ardei roşu']],
    ['palm_oil', 'conţine ulei de floarea-soarelui și/sau ulei de palmier', ['ulei de palmier']],
    ['colourings', 'zahăr, E 102, E-129', ['E 102', 'E-129']],
    ['palm_oil', 'făină, ulei de palmier, sare', ['ulei de palmier']],
    ['palm_oil', 'grăsime vegetală (palmist, cocos)', ['palmist']],
  ])('%s hits on "%s"', (key, text, because) => {
    expect(hit(product(text), key)).toEqual({ key, because });
  });

  it.each<[AvoidKey, string]>([
    ['added_sugar', 'lapte, lactoză, fermenți'],
    ['added_sugar', 'iaurt, fără zahăr adăugat'],
    ['sweeteners', 'apă, zahăr, sorbitol'],
    ['colourings', 'amidon modificat (E1404, E1422), sare'],
    ['colourings', 'apă, fără coloranți, E202'],
    ['palm_oil', 'lapte, palmitat de retinol, vitamina D'],
    ['palm_oil', 'biscuiți fără ulei de palmier, ulei de floarea-soarelui'],
  ])('%s does not hit on "%s"', (key, text) => {
    const result = matchProfile(product(text), profile([key]));
    expect(result.avoid).toEqual([]);
    expect(result.unknown).toEqual([]);
  });

  it('ignores ingredients that only appear in a may-contain clause', () => {
    const p = product('Cacao, lapte. Poate conține urme de zahăr și ulei de palmier.');
    expect(hit(p, 'added_sugar')).toBeUndefined();
    expect(hit(p, 'palm_oil')).toBeUndefined();
  });

  it('keeps multilingual traces out of profile ingredient matches', () => {
    const p = product('Ingredients: rice. May contain milk and E102.');
    const result = matchProfile(p, profile(['colourings'], ['Lapte']));
    expect(result.avoid).toEqual([]);
    expect(result.allergens).toEqual([]);
    expect(result.mayContain).toEqual(['Lapte']);
  });

  it('uses knowledge-base slugs when the text alone misses', () => {
    const p = product('', {
      ingredients: [{ name: 'Grăsime vegetală', slug: 'ulei-de-palmier' }, { name: 'Zahăr alb', slug: 'zahar' }],
    });
    expect(hit(p, 'palm_oil')).toEqual({ key: 'palm_oil', because: ['Grăsime vegetală'] });
    expect(hit(p, 'added_sugar')).toEqual({ key: 'added_sugar', because: ['Zahăr alb'] });
  });

  it('does not take a caramel filling resolved to the E150d entry for a colouring', () => {
    const p = product('caramel 11% (lapte condensat, zahăr), alune', {
      ingredients: [{ name: 'caramel 11%', slug: 'colorant-caramel-e150d' }, { name: 'alune', slug: null }],
    });
    expect(hit(p, 'colourings')).toBeUndefined();
  });

  it('lists each cause once', () => {
    expect(hit(product('zahăr, cacao, Zahăr'), 'added_sugar')).toEqual({ key: 'added_sugar', because: ['zahăr'] });
  });

  it('ultra_processed hits on NOVA 4 and passes on 1 to 3', () => {
    expect(hit(product('x', { processing: { level: 4 } }), 'ultra_processed')).toEqual({ key: 'ultra_processed', because: [] });
    for (const level of [1, 2, 3]) expect(hit(product('x', { processing: { level } }), 'ultra_processed')).toBeUndefined();
  });
});

describe('exclusions (Codex review of #164)', () => {
  it('negates only the substance after "fără", not the rest of the item', () => {
    expect(hit(product('apă, lapte praf fără grăsimi și miere'), 'added_sugar'))
      .toEqual({ key: 'added_sugar', because: ['lapte praf fără grăsimi și miere'] });
    expect(hit(product('iaurt, fără zahăr adăugat'), 'added_sugar')).toBeUndefined();
  });

  it('does not let resolved slugs bring back trace-clause ingredients', () => {
    const traceText = 'apă, poate conține urme de zahăr, ulei de palmier';
    expect(resolved(traceText).ingredients.map((i) => i.slug)).not.toContain('ulei-de-palmier');
    expect(hit(resolved(traceText), 'palm_oil')).toBeUndefined();
    expect(hit(resolved('apă, poate conține urme de ulei de palmier, zahăr'), 'added_sugar')).toBeUndefined();
    // Older product links may already contain terms from an excluded trace clause.
    const legacy = product(traceText, {
      ingredients: [{ name: 'zahăr', slug: 'zahar' }, { name: 'ulei de palmier', slug: 'ulei-de-palmier' }],
    });
    expect(hit(legacy, 'palm_oil')).toBeUndefined();
    expect(hit(legacy, 'added_sugar')).toBeUndefined();
    const p = product('ulei (rapiță). Poate conține urme de ulei de palmier.', { ingredients: [{ name: 'ulei de palmier', slug: 'ulei-de-palmier' }] });
    expect(hit(p, 'palm_oil')).toBeUndefined(); // a shorter label item ("ulei") does not vouch for it
  });

  it('does not let resolved slugs bring back negated ingredients', () => {
    expect(hit(resolved('biscuiți, fără ulei de palmier'), 'palm_oil')).toBeUndefined();
  });

  it('keeps resolved slugs that are on the label', () => {
    expect(hit(resolved('făină, grăsime de palmier, sare'), 'palm_oil'))
      .toEqual({ key: 'palm_oil', because: ['grăsime de palmier'] });
  });

  it('does not count a negated colouring role', () => {
    expect(hit(product('apă, fără coloranți: caroteni'), 'colourings')).toBeUndefined();
  });
});

describe('unknown', () => {
  it('puts ultra_processed in unknown when processing is null or missing, never a pass', () => {
    expect(matchProfile(product('x', { processing: null }), profile(['ultra_processed'])).unknown).toEqual(['ultra_processed']);
    expect(matchProfile(product('x', { processing: undefined }), profile(['ultra_processed'])).unknown).toEqual(['ultra_processed']);
  });

  it('puts text keys in unknown when there is no ingredients text', () => {
    const result = matchProfile(product('  '), profile(ALL_AVOID));
    expect(result.avoid).toEqual([]);
    expect(result.unknown).toEqual(['added_sugar', 'sweeteners', 'colourings', 'palm_oil']);
  });

  it('only checks keys the profile asks for', () => {
    expect(matchProfile(product('', { processing: null }), profile(['palm_oil'])).unknown).toEqual(['palm_oil']);
  });
});

describe('allergens', () => {
  it('returns only the profile allergens, from the product fields and the text', () => {
    const p = product('Făină de grâu, lapte praf, ouă. Poate conține urme de alune.', { allergens: ['Soia'] });
    const result = matchProfile(p, profile([], ['Gluten', 'Soia', 'Fructe cu coajă lemnoasă', 'Pește']));
    expect(result.allergens).toEqual(['Gluten', 'Soia']);
    expect(result.mayContain).toEqual(['Fructe cu coajă lemnoasă']);
  });

  it('never lists an allergen as may-contain when it is also contained', () => {
    const p = product('lapte. Poate conține urme de lapte.', { mayContain: ['Lapte'] });
    expect(matchProfile(p, profile([], ['Lapte']))).toMatchObject({ allergens: ['Lapte'], mayContain: [] });
  });

  it('returns no allergens when the profile has none', () => {
    expect(matchProfile(product('lapte, ouă', { allergens: ['Lapte', 'Ouă'] }), profile([])).allergens).toEqual([]);
  });
});

it('no profile gives empty results', () => {
  const empty = { allergens: [], mayContain: [], avoid: [], unknown: [] };
  const p = product('zahăr, ulei de palmier, lapte', { allergens: ['Lapte'], processing: null });
  expect(matchProfile(p, null)).toEqual(empty);
  expect(matchProfile(p, undefined)).toEqual(empty);
  expect(matchProfile(p, profile([]))).toEqual(empty);
});
