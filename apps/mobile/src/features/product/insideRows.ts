import { NUTRIENT_KEYS, type NutrientKey, type Product, type ScoreReason, type ScoreResult } from '@okbite/shared';
import { percentOfReference } from './portion';
import { packageAmount } from './packageAmount';

// Score reasons come from the score in Romanian and name their nutrient in the title; WhyScore matched sugar the same way.
const reasonKey: [RegExp, NutrientKey][] = [
  [/zah[aă]r/i, 'sugar'], [/saturate/i, 'sat'], [/\bsar[eă]\b/i, 'salt'], [/calorii|energie/i, 'kcal'],
  [/proteine/i, 'protein'], [/fibre/i, 'fiber'], [/fructe/i, 'fruitVegPct'],
];
export const reasonFor = (reasons: readonly ScoreReason[], key: NutrientKey): ScoreReason | null =>
  reasons.find(reason => reasonKey.some(([pattern, k]) => k === key && pattern.test(reason.title))) ?? null;

export type InsideRow = { key: NutrientKey; value: number; percent: number | null; reason: ScoreReason | null };

/** One row per nutrient the product declares, worked out for the whole package (its printed weight), not per 100 g. Only when the
 * weight cannot be read are the values left per 100 g. The bar is the share of the existing daily reference
 * (kcal, sugar, saturated fat, salt only); the level text is the score's own reason for that nutrient, when it has one. */
export function insideRows(product: Product, score: ScoreResult): InsideRow[] {
  return NUTRIENT_KEYS.flatMap(key => {
    const per100 = product.nutrients[key];
    if (per100 === null) return [];
    const amount = packageAmount(product);
    // The share of fruit and vegetables is a percentage of the product, so it does not grow with the weight.
    const value = amount === null || key === 'fruitVegPct' ? per100 : Math.round(per100 * amount) / 100;
    const percent = key === 'kcal' || key === 'sugar' || key === 'sat' || key === 'salt'
      ? Math.round(percentOfReference(key, value)) : null;
    return [{ key, value, percent, reason: reasonFor(score.reasons, key) }];
  });
}
