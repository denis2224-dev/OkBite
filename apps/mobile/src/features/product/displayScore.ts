import { NUTRIENT_KEYS, computeScore, computeWaterScore, resolveOffCategory, type NutrientKey, type Product, type ScoreResult } from '@okbite/shared';

/** Guard incomplete labels; re-evaluates water chemistry and stale OFF records unconditionally. */
export function displayScore(product: Product, score: ScoreResult): ScoreResult {
  const category = resolveOffCategory(product);
  if (category.slug === 'necunoscut') return { score: null, letter: null, grade: 'unavailable', reasons: [], missing: [] };
  const kind = category.scoreKind;
  if (kind === 'water') return computeWaterScore(product.water, product.status);
  const required: readonly NutrientKey[] = kind === 'fat' ? ['kcal', 'sat', 'sugar', 'salt', 'fat'] : ['kcal', 'sat', 'sugar', 'salt'];
  const missing = NUTRIENT_KEYS.filter(key => required.includes(key) && product.nutrients[key] === null);
  if (missing.length) return { score: null, letter: null, grade: 'unavailable', reasons: [], missing };
  if (category.slug !== product.category.slug || (product.source.startsWith('Open Food Facts') && kind === 'beverage' && score.letter === 'A')) {
    return computeScore(product.nutrients, kind, product.ingredientsText);
  }
  return score;
}
