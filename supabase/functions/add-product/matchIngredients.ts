import type { IngredientEntry } from '../_shared/contract.ts';

type Key = Pick<IngredientEntry, 'slug' | 'name' | 'aliases'>;
const normalized = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/\d+(?:[.,]\d+)?\s*%/g, '').replace(/\s+/g, ' ').trim();

export function matchIngredients(
  text: string,
  kb: Key[],
): { rawName: string; slug: string | null }[] {
  const names = new Map<string, string>();
  for (const entry of kb) {
    for (const name of [entry.name, ...entry.aliases]) names.set(normalized(name), entry.slug);
  }
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(') depth++;
    if (char === ')') depth = Math.max(0, depth - 1);
    const decimal = char === ',' && /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '');
    if (!depth && (char === ';' || (char === ',' && !decimal))) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.split('(')[0].replace(/[.\s]+$/, '').trim())
    .filter(Boolean).map((rawName) => ({ rawName, slug: names.get(normalized(rawName)) ?? null }));
}
