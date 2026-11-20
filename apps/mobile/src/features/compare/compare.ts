import type { NutrientKey, Product, ScoreResult } from '@okbite/shared';
import { productScoreFor } from '../product/productScoreFor';
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
/** The higher product score wins, only when both are scored and comparable (same category and unit). */
export function betterOverall(a: Scored, b: Scored): 'a' | 'b' | null {
  if (!compareRows(a.product, b.product).length) return null;
  const left = productScoreFor(a.product, a.score).score, right = productScoreFor(b.product, b.score).score;
  if (left === null || right === null || left === right) return null;
  return left > right ? 'a' : 'b';
}

/** Where a product photographed from Compare goes: slot A while it is empty, otherwise slot B (replacing what is there).
 * A product that already fills a slot leaves both unchanged. */
export function placeAdded<T extends { product: Product }>(a: T | undefined, b: T | undefined, added: T): { a: T | undefined; b: T | undefined } {
  if (a?.product.id === added.product.id || b?.product.id === added.product.id) return { a, b };
  return a ? { a, b: added } : { a: added, b };
}

/** A tap on a recent product: one already in slot A or B is taken out again, any other goes to the next free slot. */
export function togglePick<T extends { product: Product }>(a: T | undefined, b: T | undefined, entry: T): { a: T | undefined; b: T | undefined } {
  if (a?.product.id === entry.product.id) return { a: undefined, b };
  if (b?.product.id === entry.product.id) return { a, b: undefined };
  return placeAdded(a, b, entry);
}

/** Which recent products can still be picked for the next slot: none is the one already in A or B,
 * and once A is chosen only A's category stays available, so B is always comparable. */
export function pickable<T extends { product: Product }>(a: T | undefined, b: T | undefined, entry: T): boolean {
  if (entry.product.id === a?.product.id || entry.product.id === b?.product.id) return false;
  return !a || entry.product.category.slug === a.product.category.slug;
}
