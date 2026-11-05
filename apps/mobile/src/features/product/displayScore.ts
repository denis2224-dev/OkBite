import { NUTRIENT_KEYS, type NutrientKey, type Product, type ScoreResult } from '@okbite/shared';

/** Guard incomplete labels; the backend owns score calculation and reasons. */
export function displayScore(product: Product, score: ScoreResult): ScoreResult {
  const kind = product.category.scoreKind;
  const required: readonly NutrientKey[] = kind === 'water' ? []
    : kind === 'fat' ? ['kcal', 'sat', 'sugar', 'salt', 'fat'] : ['kcal', 'sat', 'sugar', 'salt'];
  const missing = NUTRIENT_KEYS.filter(key => required.includes(key) && product.nutrients[key] === null);
  return missing.length ? { score: null, letter: null, grade: 'unavailable', reasons: [], missing } : score;
}
