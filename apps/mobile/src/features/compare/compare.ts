import type { NutrientKey, Product, ScoreResult } from '@okbite/shared';
import { displayScore } from '../product/displayScore';
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
type Scored = { product: Product; score: ScoreResult };
/** The higher displayed score wins, only when both are scored and comparable (same category and unit). */
export function betterOverall(a: Scored, b: Scored): 'a' | 'b' | null {
  if (!compareRows(a.product, b.product).length) return null;
  const left = displayScore(a.product, a.score).score, right = displayScore(b.product, b.score).score;
  if (left === null || right === null || left === right) return null;
  return left > right ? 'a' : 'b';
}
