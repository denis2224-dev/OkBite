import { NUTRIENT_KEYS, type Letter, type NutrientKey, type Nutrients, type ScoreKind, type ScoreResult } from '../contract';
import { nutriScorePoints } from './nutriscore';
import { scoreReasons } from './reasons';
import { hasNonNutritiveSweetener } from './sweeteners';
import { toHundred } from './toHundred';

export { nutriScorePoints } from './nutriscore';
export { toHundred } from './toHundred';
export { hasNonNutritiveSweetener } from './sweeteners';

const GRADE: Record<Letter, ScoreResult['grade']> = { A: 'good', B: 'good', C: 'medium', D: 'low', E: 'low' };
const REQUIRED: NutrientKey[] = ['kcal', 'sat', 'sugar', 'salt'];

/**
 * Spec §4. Water is always A; other kinds need kcal, sugar, sat and salt (fats also fat, for the sat/fat ratio).
 * `ingredientsText` is required so beverages get their non-nutritive sweetener points.
 */
export function computeScore(n: Nutrients, kind: ScoreKind, ingredientsText: string): ScoreResult {
  const required = kind === 'water' ? [] : kind === 'fat' ? [...REQUIRED, 'fat'] : REQUIRED;
  const missing = NUTRIENT_KEYS.filter((k) => required.includes(k) && n[k] === null);
  if (missing.length) return { score: null, letter: null, grade: 'unavailable', reasons: [], missing };
  const { points, letter, components } = nutriScorePoints(n, kind, hasNonNutritiveSweetener(ingredientsText));
  return {
    score: toHundred(points, letter, kind), letter, grade: GRADE[letter],
    reasons: scoreReasons(components, n, kind), missing: [],
  };
}
