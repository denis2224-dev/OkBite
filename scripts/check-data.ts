import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { CategoryEntry, IngredientEntry, ScoreFixture } from '../packages/shared/src/index';

export type DataFiles = {
  categories: unknown[];
  ingredients: unknown[];
  fixtures?: unknown[];
  fixtureReviews?: unknown[];
  readErrors?: string[];
};

const nonblank = z.string().trim().min(1);
const CheckedIngredient = IngredientEntry.extend({
  slug: nonblank.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: nonblank,
  aliases: z.array(nonblank), role: nonblank, explanation: nonblank,
  source: nonblank, checkedBy: nonblank,
  // shortcut: N1 names (Ingredient.risk/riskSource) declared here until N1's contract merges; then drop these two lines.
  risk: z.enum(['low', 'moderate', 'high']).nullable().optional(),
  riskSource: z.string().url().nullable().optional(),
}).superRefine((i, ctx) => {
  if (!i.risk) return;
  if (i.group !== 'add') ctx.addIssue({ code: 'custom', path: ['risk'], message: 'only additives (group add) carry a risk' });
  if (!i.riskSource) ctx.addIssue({ code: 'custom', path: ['riskSource'], message: 'a risk needs the riskSource a human opened' });
});

const DATA_DIR = join(import.meta.dirname, '..', 'data');

/** Reads data/; an unreadable file becomes a readErrors entry and an empty list. */
export function readData(dir = DATA_DIR): DataFiles {
  const readErrors: string[] = [];
  const read = (file: string): unknown[] => {
    try {
      const value: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      if (Array.isArray(value)) return value;
      readErrors.push(`${file}: expected a JSON array`);
    } catch (e) {
      readErrors.push(`${file}: ${(e as Error).message}`);
    }
    return [];
  };
  const fixtures = existsSync(join(dir, 'score-fixtures.json'))
    ? read('score-fixtures.json')
    : undefined;
  const categories = read('categories.json');
  const ingredients = read('ingredients.json');
  const fixtureReviews = existsSync(join(dir, 'score-fixtures.review.json'))
    ? read('score-fixtures.review.json') : undefined;
  return { categories, ingredients, fixtures, fixtureReviews, readErrors };
}

/** Validates the hand-checked data files; C5's loader refuses to run while errors is non-empty. */
export function checkData(data: DataFiles = readData()): { errors: string[] } {
  const errors = [
    ...(data.readErrors ?? []),
    ...validate('categories.json', data.categories, CategoryEntry, 'slug'),
    ...validate('ingredients.json', data.ingredients, CheckedIngredient, 'slug'),
    ...validate('score-fixtures.json', data.fixtures ?? [], ScoreFixture, 'name'),
  ];
  // Duplicate checks only look at rows whose slug/aliases parse; validate() already reported the rest.
  const categorySlugs = new Set<string>();
  for (const { slug } of parsed(data.categories, CategoryEntry.pick({ slug: true }))) {
    if (categorySlugs.has(slug)) errors.push(`categories.json: duplicate slug ${slug}`);
    categorySlugs.add(slug);
  }
  const slugs = new Set<string>();
  const aliases = new Map<string, string>();
  const keys = CheckedIngredient.innerType().pick({ slug: true, name: true, aliases: true });
  for (const { slug, name, aliases: names } of parsed(data.ingredients, keys)) {
    if (slugs.has(slug)) errors.push(`ingredients.json: duplicate slug ${slug}`);
    slugs.add(slug);
    for (const alias of [name, ...names]) {
      const key = plain(alias.replace(/\d+(?:[.,]\d+)?\s*%/g, ''));
      const owner = aliases.get(key);
      if (owner && owner !== slug)
        errors.push(`ingredients.json: duplicate alias "${alias}" in ${owner} and ${slug}`);
      aliases.set(key, slug);
    }
  }
  const fixtureNames = new Set<string>();
  for (const { name } of parsed(data.fixtures ?? [], ScoreFixture)) {
    const key = plain(name);
    if (fixtureNames.has(key)) errors.push(`score-fixtures.json: duplicate fixture ${name}`);
    fixtureNames.add(key);
  }
  return { errors };
}

/** Content identity binds human review to every scoring input and expected output. */
export function scoreFixtureDigest(fixture: unknown): string {
  return createHash('sha256').update(JSON.stringify(ScoreFixture.parse(fixture))).digest('hex');
}

const reviewedOn = nonblank.regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) => {
  const time = Date.parse(date);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date && time <= Date.now();
}, 'expected a real review date, not in the future');
const sourceLink = nonblank.refine((source) => /https:\/\/[^\s]+/.test(source) &&
  !/DE COMPLETAT|not yet checked|TODO/i.test(source), 'expected an opened source URL');
const FixtureReview = z.object({
  fixtureSha256: z.string().regex(/^[a-f0-9]{64}$/), checkedBy: nonblank,
  checkedAt: reviewedOn, source: sourceLink,
}).strict();

/** A machine-checkable content gate; recorded reviews still need independent human verification. */
export function checkReadiness(data: DataFiles = readData()): { errors: string[] } {
  const errors = checkData(data).errors;
  const ingredients = parsed(data.ingredients, CheckedIngredient);
  const fixtures = parsed(data.fixtures ?? [], ScoreFixture);
  if (ingredients.length < 150) errors.push(`release: need 150 checked ingredients; found ${ingredients.length}`);
  if (!parsed(data.categories, CategoryEntry).some((c) => c.slug === 'necunoscut'))
    errors.push('release: missing necunoscut fallback category');
  for (const [i, ingredient] of ingredients.entries()) {
    for (const field of ['source', 'checkedAt'] as const) {
      const schema = field === 'source' ? sourceLink : reviewedOn;
      if (!schema.safeParse(ingredient[field]).success)
        errors.push(`ingredients.json[${i}] ${ingredient.slug}: ${field} needs valid review evidence`);
    }
  }
  if (fixtures.length < 30) errors.push(`release: need 30 score fixtures; found ${fixtures.length}`);
  for (const letter of ['A', 'B', 'C', 'D', 'E']) {
    if (fixtures.filter((f) => f.expectedLetter === letter).length < 5)
      errors.push(`release: need at least 5 fixtures for letter ${letter}`);
  }
  for (const [kind, count] of [['beverage', 4], ['cheese', 3], ['fat', 3], ['water', 1]] as const) {
    if (fixtures.filter((f) => f.scoreKind === kind).length < count)
      errors.push(`release: need at least ${count} ${kind} fixtures`);
  }
  errors.push(...validate('score-fixtures.review.json', data.fixtureReviews ?? [], FixtureReview, 'fixtureSha256'));
  const reviews = new Set(parsed(data.fixtureReviews ?? [], FixtureReview).map((r) => r.fixtureSha256));
  for (const fixture of fixtures) {
    for (const nutrient of ['kcal', 'sat', 'sugar', 'salt'] as const) {
      if (fixture.scoreKind !== 'water' && fixture.nutrients[nutrient] === null)
        errors.push(`release: ${fixture.name}: missing ${nutrient} calculator input`);
    }
    if (!reviews.has(scoreFixtureDigest(fixture)))
      errors.push(`release: ${fixture.name}: missing current structured human review`);
  }
  return { errors };
}

function parsed<T extends z.ZodTypeAny>(entries: unknown[], schema: T): z.infer<T>[] {
  return entries.flatMap((entry) => {
    const result = schema.safeParse(entry);
    return result.success ? [result.data as z.infer<T>] : [];
  });
}

function validate(file: string, entries: unknown[], schema: z.ZodTypeAny, idKey: string): string[] {
  return entries.flatMap((entry, i) => {
    const result = schema.safeParse(entry);
    if (result.success) return [];
    const rawId = (entry as Record<string, unknown>)?.[idKey];
    const id = typeof rawId === 'string' ? rawId : `#${i}`;
    return result.error.issues.map(
      (issue) => `${file}[${i}] ${id}: ${issue.path.join('.')} ${issue.message}`,
    );
  });
}

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const release = process.argv.includes('--release');
  const { errors } = release ? checkReadiness() : checkData();
  for (const error of errors) console.error(error);
  console.log(`${release ? 'release readiness: ' : 'development validation: '}${errors.length} errors`);
  process.exitCode = errors.length ? 1 : 0;
}
