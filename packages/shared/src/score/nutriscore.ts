import type { Letter, Nutrients, ScoreKind } from '../contract';

// Nutri-Score 2023, from the Scientific Committee's update reports:
// - general foods, cheese, red meat, fats/oils/nuts/seeds: "Update report from the Scientific Committee
//   of the Nutri-Score 2022" (voted 29 June 2022), "Algorithm modifications – recap" §1 and §2.
// - beverages: "Update of the Nutri-Score algorithm for beverages. Second update report" (voted
//   31 Jan 2023), "Points allocation" and "Final Nutri-Score thresholds".
// Each list holds the "> x" thresholds: points = how many of them the value exceeds.

const ENERGY_KJ = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]; // recap 1.1
const SUGAR = [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51]; // recap 1.1, 2.2
const SAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // recap 1.1; beverages report 1.1
const SALT = [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4]; // recap 1.1, 2.2; beverages 1.1
const PROTEIN = [2.4, 4.8, 7.2, 9.6, 12, 14, 17]; // recap 1.2.1, 2.3.1
const FIBER = [3, 4.1, 5.2, 6.3, 7.4]; // recap 1.2.1, 2.3.1; beverages 1.2
const SAT_ENERGY_KJ = [120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200]; // recap 2.2, kJ = sat × 37
const SAT_RATIO = [10, 16, 22, 28, 34, 40, 46, 52, 58, 64]; // recap 2.2, "< x" rows → points = how many x ≤ ratio
const BEV_ENERGY_KJ = [30, 90, 150, 210, 240, 270, 300, 330, 360, 390]; // beverages 1.1
const BEV_SUGAR = [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11]; // beverages 1.1
const BEV_PROTEIN = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3]; // beverages 1.2

// 5,8 / 10 × 100 is 57.99999999999999 in floating point; round so "< 58 %" rows stay exact.
const satPercent = (sat: number, fat: number) => Math.round((sat / fat) * 100 * 1e6) / 1e6;

const above = (value: number | null, thresholds: number[]) =>
  value === null ? 0 : thresholds.filter((t) => value > t).length;

// Fruit, vegetables, legumes %: general/fats 0/1/2/5 (recap 1.2.1), beverages 0/2/4/6 (beverages 1.2).
const fruitVeg = (pct: number | null, beverage: boolean) => {
  const steps = above(pct, [40, 60, 80]);
  return beverage ? steps * 2 : steps === 3 ? 5 : steps;
};

export type PointsKind = Exclude<ScoreKind, 'water'>;

// Upper bound of A, B, C, D; anything above D is E. Recap 1.4 and 2.1; beverages "Final thresholds"
// (A is for water only, so beverages start at B).
export const LETTER_CUTOFFS: Record<PointsKind, [number, number, number, number]> = {
  general: [0, 2, 10, 18], cheese: [0, 2, 10, 18], red_meat: [0, 2, 10, 18],
  fat: [-6, 2, 10, 18], beverage: [-Infinity, 2, 6, 9],
};

// Lowest and highest points each kind can reach (all favourable maxima, all unfavourable maxima;
// beverages include the 4 non-nutritive sweetener points).
export const POINTS_RANGE: Record<PointsKind, [number, number]> = {
  general: [-17, 55], cheese: [-17, 55], red_meat: [-12, 55], fat: [-17, 55], beverage: [-18, 54],
};

const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

export function letterFor(points: number, kind: PointsKind): Letter {
  const i = LETTER_CUTOFFS[kind].findIndex((max) => points <= max);
  return LETTERS[i] ?? 'E';
}

/**
 * Missing favourable values count as 0; computeScore rejects missing kcal, sugar, sat and salt first.
 * `sweeteners`: the beverage contains a non-nutritive sweetener (beverages report §6.6.2, 4 A points).
 */
export function nutriScorePoints(n: Nutrients, kind: ScoreKind, sweeteners = false): {
  points: number; letter: Letter; components: Record<string, number>;
} {
  if (kind === 'water') return { points: 0, letter: 'A', components: {} };
  const beverage = kind === 'beverage';
  const negative: Record<string, number> = kind === 'fat'
    ? {
      energy: above(n.sat === null ? null : n.sat * 37, SAT_ENERGY_KJ),
      sugar: above(n.sugar, SUGAR),
      satRatio: n.sat === null || !n.fat ? 0 : SAT_RATIO.filter((t) => satPercent(n.sat!, n.fat!) >= t).length,
      salt: above(n.salt, SALT),
    }
    : {
      energy: above(n.kcal === null ? null : n.kcal * 4.184, beverage ? BEV_ENERGY_KJ : ENERGY_KJ),
      sugar: above(n.sugar, beverage ? BEV_SUGAR : SUGAR),
      sat: above(n.sat, SAT),
      salt: above(n.salt, SALT),
      ...(beverage ? { sweeteners: sweeteners ? 4 : 0 } : {}),
    };
  const a = Object.values(negative).reduce((s, v) => s + v, 0);
  const protein = above(n.protein, beverage ? BEV_PROTEIN : PROTEIN);
  // Protein is not counted when A ≥ 11 (≥ 7 for fats), except cheese (recap 1.3, 2.4); beverages have no cap (§6.4).
  const countProtein = beverage || kind === 'cheese' || a < (kind === 'fat' ? 7 : 11);
  const positive = {
    protein: countProtein ? (kind === 'red_meat' ? Math.min(protein, 2) : protein) : 0, // red meat max 2 (recap 1.2.1)
    fiber: above(n.fiber, FIBER),
    fruitVeg: fruitVeg(n.fruitVegPct, beverage),
  };
  const points = a - positive.protein - positive.fiber - positive.fruitVeg;
  return { points, letter: letterFor(points, kind), components: { ...negative, ...positive } };
}
