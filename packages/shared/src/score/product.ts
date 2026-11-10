import type { IngredientGroup, Nutrients, ScoreKind, ScoreResult } from '../contract';
import { nutriScorePoints } from './nutriscore';
import { hasNonNutritiveSweetener } from './sweeteners';

// Weights and tiers: data/README.md "Product score (N4)". Decided by Sergiu, 2026-11-10.
const NUTRITION = 60;
const ADDITIVES = 30;
const RISK_POINTS = { high: 10, moderate: 5, low: 0 } as const;
const PROCESSING_LOSS: Record<number, number> = { 1: 0, 2: 0, 3: 5, 4: 10 }; // NOVA group, out of 10
const HIGH_RISK_CAP = 49;

export type Tier = 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
export type DeductionKey = 'sugar' | 'sat' | 'salt' | 'kcal' | 'nutrition_other' | 'additive' | 'processing' | 'cap';
export type Deduction = { key: DeductionKey; points: number; detail?: string };
export type ProductScore = { score: number | null; tier: Tier | null; deductions: Deduction[] };

// shortcut: risk and processing mirror the N1 contract names (Ingredient.risk, Product.processing);
// switch to Pick<Product, ...> once N1 merges. Structural, so today's and N1's Product both fit.
export type ScoredProduct = {
  nutrients: Nutrients;
  category: { scoreKind: ScoreKind };
  ingredientsText: string;
  ingredients: { name: string; group: IngredientGroup | null; risk?: 'low' | 'moderate' | 'high' | null }[];
  processing?: { level: number } | null;
};

export function tierFor(score: number): Tier {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'bad';
}

type NutritionKey = 'sugar' | 'sat' | 'salt' | 'kcal' | 'nutrition_other';

// Splits the nutrition loss across the Nutri-Score negative components, in proportion to their points.
function nutritionDeductions(p: ScoredProduct, loss: number): Deduction[] {
  const kind = p.category.scoreKind;
  const { components } = nutriScorePoints(p.nutrients, kind, hasNonNutritiveSweetener(p.ingredientsText));
  const keyOf: Record<string, NutritionKey> = {
    energy: kind === 'fat' ? 'sat' : 'kcal', // for fats "energy" is energy from saturates
    sugar: 'sugar', sat: 'sat', satRatio: 'sat', salt: 'salt', sweeteners: 'nutrition_other',
  };
  const weights = new Map<NutritionKey, number>();
  for (const [c, v] of Object.entries(components)) {
    const key = keyOf[c];
    if (key && v > 0) weights.set(key, (weights.get(key) ?? 0) + v);
  }
  const total = [...weights.values()].reduce((s, v) => s + v, 0);
  if (!total) return [{ key: 'nutrition_other', points: loss }];
  return [...weights].map(([key, w]) => ({ key, points: (loss * w) / total }));
}

export function productScore(product: ScoredProduct, nutrition: ScoreResult): ProductScore {
  if (nutrition.score === null) return { score: null, tier: null, deductions: [] };

  const raw: Deduction[] = nutritionDeductions(product, NUTRITION - Math.round(nutrition.score * 0.6));
  let additiveLeft = ADDITIVES;
  let highRisk = false;
  for (const i of product.ingredients) {
    if (i.risk === 'low' || (i.group !== 'add' && !i.risk)) continue;
    highRisk ||= i.risk === 'high';
    const points = Math.min(i.risk ? RISK_POINTS[i.risk] : 0, additiveLeft); // not assessed: listed, 0 off
    additiveLeft -= points;
    raw.push({ key: 'additive', points, detail: i.name });
  }
  const level = product.processing?.level;
  if (level !== undefined) raw.push({ key: 'processing', points: PROCESSING_LOSS[level] ?? 0 });
  else raw.forEach((d) => { d.points *= 100 / (NUTRITION + ADDITIVES); }); // unknown NOVA: rescale to 100

  const score0 = Math.round(100 - raw.reduce((s, d) => s + d.points, 0));
  const deductions = raw.map((d) => ({ ...d, points: Math.round(d.points) }));
  const diff = 100 - score0 - deductions.reduce((s, d) => s + d.points, 0);
  if (diff) deductions.reduce((a, b) => (b.points > a.points ? b : a)).points += diff; // rounding goes to the largest

  const kept = deductions.filter((d) => d.key === 'additive' || d.points > 0);
  if (highRisk && score0 > HIGH_RISK_CAP) {
    kept.push({ key: 'cap', points: score0 - HIGH_RISK_CAP });
    return { score: HIGH_RISK_CAP, tier: tierFor(HIGH_RISK_CAP), deductions: kept };
  }
  return { score: score0, tier: tierFor(score0), deductions: kept };
}
