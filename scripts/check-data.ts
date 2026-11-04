import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { z } from 'zod';
import { CategoryEntry, IngredientEntry, ScoreFixture } from '../packages/shared/src/index';

export type DataFiles = {
  categories: unknown[];
  ingredients: unknown[];
  fixtures?: unknown[];
  readErrors?: string[];
};

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
  return { categories, ingredients, fixtures, readErrors };
}

/** Validates the hand-checked data files; C5's loader refuses to run while errors is non-empty. */
export function checkData(data: DataFiles = readData()): { errors: string[] } {
  const errors = [
    ...(data.readErrors ?? []),
    ...validate('categories.json', data.categories, CategoryEntry, 'slug'),
    ...validate('ingredients.json', data.ingredients, IngredientEntry, 'slug'),
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
  const keys = IngredientEntry.pick({ slug: true, aliases: true });
  for (const { slug, aliases: names } of parsed(data.ingredients, keys)) {
    if (slugs.has(slug)) errors.push(`ingredients.json: duplicate slug ${slug}`);
    slugs.add(slug);
    for (const alias of names) {
      const key = plain(alias);
      const owner = aliases.get(key);
      if (owner && owner !== slug)
        errors.push(`ingredients.json: duplicate alias "${alias}" in ${owner} and ${slug}`);
      aliases.set(key, slug);
    }
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
    const id = (entry as Record<string, unknown>)?.[idKey] ?? `#${i}`;
    return result.error.issues.map(
      (issue) => `${file}[${i}] ${String(id)}: ${issue.path.join('.')} ${issue.message}`,
    );
  });
}

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { errors } = checkData();
  for (const error of errors) console.error(error);
  console.log(`${errors.length} errors`);
  process.exitCode = errors.length ? 1 : 0;
}
