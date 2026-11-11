import type { IngredientGroup, Nutrients, ScoreKind, ScoreResult } from '../contract';
import { letterFor, nutriScorePoints } from './nutriscore';
import { hasNonNutritiveSweetener } from './sweeteners';
import { toHundred } from './toHundred';

// Weights and tiers: data/README.md "Product score (N4)". Decided by Sergiu, 2026-11-10.
const NUTRITION = 60;
const NUTRITION_SHARE = NUTRITION / 100;
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
  ingredients: {
    name: string; slug?: string | null; group: IngredientGroup | null; risk?: 'low' | 'moderate' | 'high' | null;
  }[];
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

// Nutri-Score 0-100 of the same product with every negative component at 0 (no energy, sugar,
// saturated fat, salt or sweeteners); its favourable points stay, including protein that the
// "negatives >= 11" rule took away. Never below the real score.
function scoreWithoutNegatives(p: ScoredProduct): number {
  const kind = p.category.scoreKind;
  const n = { ...p.nutrients, kcal: 0, sugar: 0, sat: 0, salt: 0 };
  const { points } = nutriScorePoints(n, kind, false);
  return toHundred(points, kind === 'water' ? 'A' : letterFor(points, kind), kind);
}

// The nutrition loss has two parts. What the negatives cost (score without them minus the real
// score) is split across them in proportion to their points. The rest is the Nutri-Score baseline
// (missing fibre, protein, fruit and vegetables, or a category that cannot reach A): nutrition_other.
function nutritionDeductions(p: ScoredProduct, score: number, loss: number): Deduction[] {
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
  const negatives = Math.min(loss, Math.max(0, scoreWithoutNegatives(p) * NUTRITION_SHARE - Math.round(score * NUTRITION_SHARE)));
  const out: Deduction[] = [...weights].map(([key, w]) => ({ key, points: (negatives * w) / total }));
  out.push({ key: 'nutrition_other', points: loss - negatives });
  return out;
}

// Additives counted once each (same slug, or same name ignoring case and spaces), in order of
// first appearance. If copies disagree on risk, the highest one counts, so a duplicate can never
// hide a high-risk additive from the cap.
const RISK_RANK = { high: 3, moderate: 2, low: 1 } as const;
const rank = (risk: ScoredProduct['ingredients'][number]['risk']) => (risk ? RISK_RANK[risk] : 0);

function scoredAdditives(p: ScoredProduct): ScoredProduct['ingredients'] {
  const byKey = new Map<string, ScoredProduct['ingredients'][number]>();
  for (const i of p.ingredients) {
    if (i.group !== 'add') continue;
    const key = (i.slug ?? i.name).trim().toLowerCase();
    const seen = byKey.get(key);
    if (!seen) byKey.set(key, i);
    else if (rank(i.risk) > rank(seen.risk)) byKey.set(key, { ...seen, risk: i.risk });
  }
  return [...byKey.values()].filter((i) => i.risk !== 'low');
}

// Rounds deductions to whole points that add up to `total` (largest remainder): each one is
// rounded down, then the points still missing go one each to the biggest fractions (ties: the
// bigger deduction). A whole-number deduction (−10 processing, −5 additive) stays exact, and no
// deduction moves more than 1 point from its true value.
function roundToTotal(raw: Deduction[], total: number): Deduction[] {
  const out = raw.map((d) => ({ ...d, points: Math.floor(d.points + 1e-9) }));
  const order = out
    .map((d, i) => ({ d, frac: (raw[i]?.points ?? 0) - d.points, size: raw[i]?.points ?? 0, i }))
    .sort((a, b) => b.frac - a.frac || b.size - a.size || a.i - b.i);
  let left = total - out.reduce((s, d) => s + d.points, 0);
  for (let k = 0; left > 0 && order.length; k = (k + 1) % order.length, left--) order[k]!.d.points += 1;
  return out;
}

export function productScore(product: ScoredProduct, nutrition: ScoreResult): ProductScore {
  if (nutrition.score === null) return { score: null, tier: null, deductions: [] };

  const raw: Deduction[] = nutritionDeductions(
    product, nutrition.score, NUTRITION - Math.round(nutrition.score * NUTRITION_SHARE),
  );
  let additiveLeft = ADDITIVES;
  let highRisk = false;
  for (const i of scoredAdditives(product)) {
    highRisk ||= i.risk === 'high';
    const points = Math.min(i.risk ? RISK_POINTS[i.risk] : 0, additiveLeft); // not assessed: listed, 0 off
    additiveLeft -= points;
    raw.push({ key: 'additive', points, detail: i.name });
  }
  const level = product.processing?.level;
  // NOVA has groups 1 to 4 only; anything else (0, 5, 2.5, NaN) counts as unknown, never as group 1.
  const processingLoss = level === undefined ? undefined : PROCESSING_LOSS[level];
  if (processingLoss !== undefined) raw.push({ key: 'processing', points: processingLoss });
  else raw.forEach((d) => { d.points *= 100 / (NUTRITION + ADDITIVES); }); // unknown NOVA: rescale to 100

  const score0 = Math.round(100 - raw.reduce((s, d) => s + d.points, 0));
  const deductions = roundToTotal(raw, 100 - score0);

  const kept = deductions.filter((d) => d.key === 'additive' || d.points > 0);
  if (highRisk && score0 > HIGH_RISK_CAP) {
    kept.push({ key: 'cap', points: score0 - HIGH_RISK_CAP });
    return { score: HIGH_RISK_CAP, tier: tierFor(HIGH_RISK_CAP), deductions: kept };
  }
  return { score: score0, tier: tierFor(score0), deductions: kept };
}
