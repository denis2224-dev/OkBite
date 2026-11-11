import { describe, expect, it } from 'vitest';
import { checkData, checkReadiness, scoreFixtureDigest, type DataFiles } from './check-data';

const ingredient = {
  slug: 'lecitina-soia',
  name: 'Lecitină din soia',
  aliases: ['E322', 'lecitină din soia'],
  group: 'add',
  role: 'Emulgator',
  explanation: 'Ajută grăsimea și apa să se amestece.',
  source: 'Reg. (UE) nr. 1333/2008',
  allergen: 'Soia',
  checkedBy: 'Sergiu',
  checkedAt: '2026-11-10',
};
const fixture = {
  name: 'Iaurt',
  scoreKind: 'general',
  expectedPoints: 1,
  expectedLetter: 'A',
  checkedWith: 'SpF calculator 2023',
  nutrients: {
    kcal: 60,
    fat: 2,
    sat: 1,
    sugar: 4,
    salt: 0.1,
    protein: 4,
    fiber: 0,
    fruitVegPct: 0,
  },
};
const ok = (): DataFiles => ({
  categories: [{ slug: 'iaurt', name: 'Iaurt', scoreKind: 'general' }],
  ingredients: [ingredient],
});

describe('checkData', () => {
  it('accepts valid data', () => expect(checkData(ok()).errors).toEqual([]));

  it('reports an ingredient without checkedBy', () => {
    const { checkedBy: _, ...unchecked } = ingredient;
    expect(checkData({ ...ok(), ingredients: [unchecked] }).errors.join()).toMatch(
      /lecitina-soia.*checkedBy/,
    );
  });

  it('reports a duplicate slug', () => {
    const errors = checkData({
      ...ok(),
      ingredients: [ingredient, { ...ingredient, aliases: ['x'] }],
    }).errors;
    expect(errors.join()).toMatch(/duplicate slug lecitina-soia/);
  });

  it('reports an alias used twice, ignoring case and diacritics', () => {
    const other = { ...ingredient, slug: 'e322', aliases: ['LECITINA DIN SOIA'] };
    expect(checkData({ ...ok(), ingredients: [ingredient, other] }).errors.join()).toMatch(
      /duplicate alias/,
    );
  });

  it('reports an allergen not in ALLERGENS', () => {
    const errors = checkData({
      ...ok(),
      ingredients: [{ ...ingredient, allergen: 'Nuci' }],
    }).errors;
    expect(errors.join()).toMatch(/lecitina-soia.*allergen/);
  });

  it('reports a category with an unknown scoreKind', () => {
    const errors = checkData({
      ...ok(),
      categories: [{ slug: 'apa', name: 'Apă', scoreKind: 'drink' }],
    }).errors;
    expect(errors.join()).toMatch(/apa.*scoreKind/);
  });

  it('reports an invalid score fixture when fixtures exist', () => {
    expect(checkData({ ...ok(), fixtures: [fixture] }).errors).toEqual([]);
    const errors = checkData({ ...ok(), fixtures: [{ ...fixture, expectedLetter: 'F' }] }).errors;
    expect(errors.join()).toMatch(/Iaurt.*expectedLetter/);
  });
});

describe('additive risk (N5)', () => {
  const efsa = 'https://www.efsa.europa.eu/en/efsajournal/pub/4787';
  const withIngredient = (extra: object) => ({ ...ok(), ingredients: [{ ...ingredient, ...extra }] });
  it('accepts an additive with a risk and its source, or with no risk', () => {
    expect(checkData(withIngredient({ risk: 'low', riskSource: efsa })).errors).toEqual([]);
    expect(checkData(withIngredient({ risk: null, riskSource: null })).errors).toEqual([]);
  });
  it('reports an additive with a risk but no riskSource', () => {
    expect(checkData(withIngredient({ risk: 'high' })).errors.join()).toMatch(/riskSource/);
    expect(checkData(withIngredient({ risk: 'high', riskSource: null })).errors.join()).toMatch(/riskSource/);
  });
  it('reports a risk on an ingredient that is not an additive', () => {
    const errors = checkData(withIngredient({ group: 'base', risk: 'low', riskSource: efsa })).errors;
    expect(errors.join()).toMatch(/only additives/);
  });
  it('reports a risk level outside low, moderate, high', () => {
    expect(checkData(withIngredient({ risk: 'none', riskSource: efsa })).errors).not.toEqual([]);
  });
});

describe('readData', () => {
  it('turns a missing file, bad JSON or a non-array into errors instead of crashing', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { readData } = await import('./check-data');
    const dir = mkdtempSync(join(tmpdir(), 'okbite-data-'));
    writeFileSync(join(dir, 'categories.json'), '{ not json');
    writeFileSync(join(dir, 'ingredients.json'), '{"a":1}');
    const errors = checkData(readData(dir)).errors.join('\n');
    expect(errors).toMatch(/categories\.json: .*JSON/);
    expect(errors).toMatch(/ingredients\.json: expected a JSON array/);
  });
});

describe('checkData categories', () => {
  it('reports a duplicate category slug', () => {
    const cat = { slug: 'iaurt', name: 'Iaurt', scoreKind: 'general' };
    expect(checkData({ ...ok(), categories: [cat, cat] }).errors.join()).toMatch(
      /duplicate slug iaurt/,
    );
  });
});

describe('checkData malformed rows', () => {
  it.each([
    ['categories', 'slug', 'categories.json'],
    ['ingredients', 'slug', 'ingredients.json'],
    ['fixtures', 'name', 'score-fixtures.json'],
  ] as const)('uses the row index for malformed identifiers in %s', (key, idKey, file) => {
    for (const id of [{ toString: 0 }, [{ toString: 0 }]]) {
      const { errors } = checkData({
        categories: [],
        ingredients: [],
        [key]: [{ [idKey]: id }],
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((error) => error.startsWith(`${file}[0] #0:`))).toBe(true);
    }
  });

  it('returns errors instead of throwing for null rows and bad alias types', () => {
    const bad = { ...ingredient, slug: 'x', aliases: [322] };
    const odd = { ...ingredient, slug: 'y', aliases: {} };
    const run = () => checkData({ categories: [null], ingredients: [null, bad, odd] });
    expect(run).not.toThrow();
    const errors = run().errors.join('\n');
    expect(errors).toMatch(/categories\.json\[0\]/);
    expect(errors).toMatch(/ingredients\.json\[1\] x: aliases/);
  });
});

describe('checked content integrity', () => {
  it.each(['LECITINĂ  DIN SOIA', 'lecitină din soia 2,5%'])('detects matcher-equivalent name/alias collisions: %s', (name) => {
    const other = { ...ingredient, slug: 'other', name, aliases: [] };
    expect(checkData({ ...ok(), ingredients: [ingredient, other] }).errors.join()).toMatch(/duplicate alias/);
  });
  it.each(['name', 'role', 'explanation', 'source', 'checkedBy'] as const)('rejects blank %s before loading', (field) => {
    expect(checkData({ ...ok(), ingredients: [{ ...ingredient, [field]: '  ' }] }).errors.join()).toContain(field);
  });
});


describe('release content readiness', () => {
  const ready = (): DataFiles => {
    const fixtures = Array.from({ length: 30 }, (_, i) => ({ ...fixture, name: `Fixture ${i}`,
      expectedLetter: ['A', 'B', 'C', 'D', 'E'][i % 5],
      scoreKind: i < 4 ? 'beverage' : i < 7 ? 'cheese' : i < 10 ? 'fat' : i === 10 ? 'water' : 'general',
    }));
    return { categories: [...ok().categories, { slug: 'necunoscut', name: 'Necunoscut', scoreKind: 'general' }],
      ingredients: Array.from({ length: 150 }, (_, i) => ({ ...ingredient, slug: `ingredient-${i}`,
        name: `Ingredient ${i}`, aliases: [], checkedAt: '2026-11-05', source: 'https://eur-lex.europa.eu/fixture' })),
      fixtures, fixtureReviews: fixtures.map((f) => ({ fixtureSha256: scoreFixtureDigest(f),
        checkedBy: 'Test reviewer', checkedAt: '2026-11-05', source: 'https://www.santepubliquefrance.fr/fixture' })),
    };
  };
  it('keeps development validation usable but blocks an empty content release', () => {
    const empty = { categories: [], ingredients: [] };
    expect(checkData(empty).errors).toEqual([]);
    expect(checkReadiness(empty).errors.join()).toMatch(/150.*checked ingredients/);
    expect(checkReadiness(empty).errors.join()).toMatch(/30.*score fixtures/);
    expect(checkReadiness(empty).errors.join()).toMatch(/necunoscut/);
  });
  it('accepts complete coverage with explicit review records', () => expect(checkReadiness(ready()).errors).toEqual([]));
  it('does not infer human approval from checkedWith prose', () => {
    const data = ready(); delete data.fixtureReviews;
    expect(checkReadiness(data).errors.join()).toMatch(/human review/);
  });
  it('invalidates review evidence when fixture nutrition changes', () => {
    const data = ready(); (data.fixtures![0] as typeof fixture).nutrients = { ...fixture.nutrients, sugar: 12 };
    expect(checkReadiness(data).errors.join()).toMatch(/human review/);
  });
  it('reports missing letter and kind coverage even with enough total fixtures', () => {
    const data = ready(); data.fixtures = Array.from({ length: 30 }, (_, i) => ({ ...fixture, name: `Only A ${i}` }));
    const errors = checkReadiness(data).errors.join();
    expect(errors).toMatch(/letter B/); expect(errors).toMatch(/beverage/); expect(errors).toMatch(/cheese/);
    expect(errors).toMatch(/fat/); expect(errors).toMatch(/water/);
  });
  it.each([
    { checkedBy: ' ' }, { source: 'DE COMPLETAT' }, { checkedAt: '2099-01-01' }, { checkedAt: '2026-02-30' },
  ])('rejects incomplete ingredient review metadata %j', (override) => {
    const data = ready(); data.ingredients[0] = { ...(data.ingredients[0] as object), ...override };
    expect(checkReadiness(data).errors.length).toBeGreaterThan(0);
  });
  it('rejects malformed review evidence', () => {
    expect(checkReadiness({ ...ready(), fixtureReviews: [null] }).errors.join()).toMatch(/fixture.*review/i);
  });
});

it('loads malformed fixture-review files as validation errors', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { readData } = await import('./check-data');
  const dir = mkdtempSync(join(tmpdir(), 'okbite-review-'));
  try {
    for (const file of ['categories.json', 'ingredients.json']) writeFileSync(join(dir, file), '[]');
    writeFileSync(join(dir, 'score-fixtures.review.json'), '{}');
    expect(checkReadiness(readData(dir)).errors.join()).toContain('score-fixtures.review.json: expected a JSON array');
  } finally { rmSync(dir, { recursive: true }); }
});

it('rejects duplicate fixture names so repeated cases cannot inflate release coverage', () => {
  expect(checkData({ ...ok(), fixtures: [fixture, { ...fixture }] }).errors.join()).toMatch(/duplicate fixture/);
});
it('requires the scoring inputs needed by the official calculator for release fixtures', () => {
  const data = { ...ok(), fixtures: [{ ...fixture, nutrients: { ...fixture.nutrients, sugar: null } }] };
  expect(checkReadiness(data).errors.join()).toMatch(/sugar/);
});

it('does not demand invented nutrient values for an official water fixture', () => {
  const water = { ...fixture, name: 'Water fixture', scoreKind: 'water', nutrients: {
    kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null,
  } };
  const errors = checkReadiness({ ...ok(), fixtures: [water] }).errors.join();
  expect(errors).not.toMatch(/missing .* calculator input/);
});

it('keeps percentage variants distinct when checking fixture names', () => {
  expect(checkData({ ...ok(), fixtures: [{ ...fixture, name: 'Iaurt 2%' }, { ...fixture, name: 'Iaurt 3%' }] }).errors).toEqual([]);
});

it('validates repository data/ingredients.json including beverage sweeteners and soda additives', async () => {
  const { readData } = await import('./check-data');
  const data = readData();
  expect(checkData(data).errors).toEqual([]);
  const slugs = new Set((data.ingredients as { slug: string }[]).map((item) => item.slug));
  for (const required of [
    'apa-carbogazoasa',
    'dioxid-de-carbon-e290',
    'colorant-caramel-e150d',
    'acid-fosforic-e338',
    'citrati-de-sodiu-e331',
    'aspartam-e951',
    'acesulfam-k-e950',
    'ciclamat-de-sodiu-e952',
    'sucraloza-e955',
    'zaharina-e954',
    'glicozide-steviolice-e960a',
    'cafeina',
  ]) {
    expect(slugs.has(required)).toBe(true);
  }
});

