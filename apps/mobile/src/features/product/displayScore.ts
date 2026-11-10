import { NUTRIENT_KEYS, computeScore, resolveOffCategory, type NutrientKey, type Product, type ScoreResult } from '@okbite/shared';

/** Guard incomplete labels; the backend owns score calculation and reasons. */
export function displayScore(product: Product, score: ScoreResult): ScoreResult {
  const category = resolveOffCategory(product);
  if (category.slug === 'necunoscut') return { score: null, letter: null, grade: 'unavailable', reasons: [], missing: [] };
  const kind = category.scoreKind;
  const required: readonly NutrientKey[] = kind === 'water' ? []
    : kind === 'fat' ? ['kcal', 'sat', 'sugar', 'salt', 'fat'] : ['kcal', 'sat', 'sugar', 'salt'];
  const missing = NUTRIENT_KEYS.filter(key => required.includes(key) && product.nutrients[key] === null);
  if (missing.length) return { score: null, letter: null, grade: 'unavailable', reasons: [], missing };
  if (category.slug !== product.category.slug || (product.source.startsWith('Open Food Facts') && kind === 'beverage' && score.letter === 'A')) {
    return computeScore(product.nutrients, kind, product.ingredientsText);
  }
  return score;
}
