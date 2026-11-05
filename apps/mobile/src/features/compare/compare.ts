import type { NutrientKey, Product } from '@okbite/shared';
const keys = ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber'] as const;
export function compareRows(a: Product, b: Product): { key: NutrientKey; a: number | null; b: number | null; better: 'a' | 'b' | null }[] {
  if (a.status === 'hidden' || b.status === 'hidden' || a.category.slug !== b.category.slug || a.unit !== b.unit) return [];
  return keys.map(key => {
    const left = a.nutrients[key], right = b.nutrients[key];
    const higher = key === 'protein' || key === 'fiber';
    return { key, a: left, b: right, better: left === null || right === null || left === right ? null :
      (higher ? left > right : left < right) ? 'a' : 'b' };
  });
}
