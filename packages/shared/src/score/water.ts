import {
  WATER_FIELD_KEYS,
  type Carbonation,
  type Grade,
  type ProductStatus,
  type ScoreReason,
  type ScoreResult,
  type WaterNumericKey,
  type WaterProfile,
} from '../contract';

export type WaterUsageTier =
  | 'daily_low_sodium'
  | 'daily'
  | 'moderate_sport'
  | 'occasional_high_mineral'
  | 'therapeutic';

export interface WaterSummary {
  tier: WaterUsageTier;
  effectiveTds: number | null;
  effectiveNa: number | null;
  equivBoron: number | null;
  lowSodium: boolean;
  magnesiumRich: boolean;
  highCalcium: boolean;
  iodized: boolean;
  carbonated: boolean;
}

const comma = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

function intervalFor(w: WaterProfile, key: WaterNumericKey): [number, number] | null {
  const r = w.ranges?.[key];
  if (r) return [r.min, r.max];
  const v = w[key];
  return v !== null && v !== undefined ? [v, v] : null;
}

/** Sum of dissolved major ions when declared (fallback for missing TDS / g/L typos). */
function dissolvedIonBounds(w: WaterProfile): { count: number; loSum: number; hiSum: number } {
  const keys: WaterNumericKey[] = ['caMgL', 'mgMgL', 'hco3MgL', 'so4MgL', 'clMgL'];
  const naInt = intervalFor(w, 'naMgL');
  const kInt = intervalFor(w, 'kMgL');
  const npkInt = intervalFor(w, 'naPlusKMgL');

  const items: ([number, number] | null)[] = [
    ...keys.map((k) => intervalFor(w, k)),
    naInt ?? npkInt,
    naInt ? kInt : null,
  ];

  let count = 0;
  let loSum = 0;
  let hiSum = 0;
  for (const it of items) {
    if (it) {
      count++;
      loSum += it[0];
      hiSum += it[1];
    }
  }
  return { count, loSum, hiSum };
}

/** Resolves effective mineralization (mg/L), rejecting unit-contradictory TDS (<50 vs ionSum >500). */
export function effectiveWaterTds(w: WaterProfile): number | null {
  const { count, loSum, hiSum } = dissolvedIonBounds(w);
  const rawTds = intervalFor(w, 'tdsMgL');
  const rawDry = intervalFor(w, 'dryResidueMgL');
  const usableTds = rawTds && !(rawTds[1] < 50 && count >= 2 && loSum > 500) ? rawTds : null;
  const usableDry = rawDry && !(rawDry[1] < 50 && count >= 2 && loSum > 500) ? rawDry : null;

  let effectiveTdsInt: [number, number] | null = null;
  if (usableTds) effectiveTdsInt = usableTds;
  else if (usableDry) effectiveTdsInt = usableDry;
  else if ((count >= 4 || w.classification === 'therapeutic') && loSum > 0) {
    effectiveTdsInt = [Math.round(loSum), Math.round(hiSum)];
  }
  if (!effectiveTdsInt) return null;
  return Math.round((effectiveTdsInt[0] + effectiveTdsInt[1]) / 2);
}

export function summarizeWater(w: WaterProfile): WaterSummary {
  const effectiveTds = effectiveWaterTds(w);
  const effectiveNa = w.naMgL ?? w.naPlusKMgL;
  const equivBoron = w.bMgL ?? (w.h3bo3MgL !== null ? w.h3bo3MgL * 0.1748 : null);
  // Strict combined-ion rule: never badge Na+K as lowSodium unless total Na+K < 20 mg/L.
  const naHi = intervalFor(w, 'naMgL')?.[1] ?? intervalFor(w, 'naPlusKMgL')?.[1];
  const lowSodium = naHi !== undefined && naHi < 20;
  const magnesiumRich =
    w.mgMgL !== null &&
    w.mgMgL >= 50 &&
    (w.so4MgL === null || w.so4MgL <= 250) &&
    (effectiveNa === null || effectiveNa <= 100);
  const highCalcium = w.caMgL !== null && w.caMgL >= 50;
  const iodized = w.iUgL !== null && w.iUgL >= 20;
  const carbonated = w.carbonation === 'sparkling' || w.carbonation === 'lightly_sparkling';

  let tier: WaterUsageTier = 'daily';
  if (
    w.classification === 'therapeutic' ||
    (effectiveTds !== null && effectiveTds > 5000) ||
    (effectiveNa !== null && effectiveNa > 1000) ||
    (equivBoron !== null && equivBoron > 5.2) ||
    (w.so4MgL !== null && w.so4MgL > 1500)
  ) {
    tier = 'therapeutic';
  } else if (
    (effectiveTds !== null && effectiveTds > 1500) ||
    (effectiveNa !== null && effectiveNa > 200) ||
    (w.so4MgL !== null && w.so4MgL > 250 && (effectiveTds === null || effectiveTds > 1000))
  ) {
    tier = 'occasional_high_mineral';
  } else if (
    (effectiveTds !== null && effectiveTds > 500) ||
    w.carbonation === 'sparkling' ||
    w.classification === 'table_mineral'
  ) {
    tier = 'moderate_sport';
  } else if (
    lowSodium &&
    (w.fMgL === null || w.fMgL <= 1.5) &&
    (w.no3MgL === null || w.no3MgL <= 10)
  ) {
    tier = 'daily_low_sodium';
  }

  return {
    tier,
    effectiveTds,
    effectiveNa,
    equivBoron,
    lowSodium,
    magnesiumRich,
    highCalcium,
    iodized,
    carbonated,
  };
}

function tdsPenalty(tds: number | null, magnesiumRich: boolean, isTherapeutic: boolean): number {
  if (tds === null) return isTherapeutic ? 65 : 0;
  if (tds < 50) return 5;
  if (tds <= 500) return 0;
  if (tds <= 1000) return magnesiumRich && tds <= 900 ? 6 : 8;
  if (tds <= 1500) return 16;
  if (tds <= 3500) return 30;
  if (tds <= 5000) return 42;
  return 55;
}

function naPenalty(na: number | null): number {
  if (na === null || na <= 20) return 0;
  if (na <= 50) return 4;
  if (na <= 100) return 8;
  if (na <= 200) return 14;
  if (na <= 500) return 24;
  return 36;
}

function phPenalty(ph: number | null, carbonation: Carbonation | null): number {
  if (ph === null) return 0;
  if (carbonation === 'sparkling') return ph < 4.5 ? 10 : 0;
  if (ph < 6 || ph > 9.5) return 14;
  if (ph < 6.5 || ph > 8.5) return 2;
  return 0;
}

function buildWaterReasons(w: WaterProfile, s: WaterSummary, score: number): ScoreReason[] {
  const reasons: ScoreReason[] = [];
  if (s.tier === 'therapeutic') {
    reasons.push({
      tone: 'bad',
      title: 'Apă terapeutică / medicinală',
      detail: s.effectiveTds !== null ? `${comma(s.effectiveTds)} mg/l minerale; nu pentru uz zilnic nelimitat` : 'Utilizare ocazională conform recomandărilor',
    });
  } else if (s.effectiveTds !== null && s.effectiveTds > 1500) {
    reasons.push({ tone: 'bad', title: 'Mineralizare ridicată', detail: `${comma(s.effectiveTds)} mg/l săruri dizolvate` });
  }
  if (w.naMgL !== null && w.naMgL > 200 && reasons.length < 2) {
    reasons.push({ tone: 'bad', title: 'Conținut ridicat de sodiu', detail: `${comma(w.naMgL)} mg/l Na` });
  }
  if (w.so4MgL !== null && w.so4MgL > 250 && reasons.length < 2) {
    reasons.push({ tone: 'bad', title: 'Conținut ridicat de sulfați', detail: `${comma(w.so4MgL)} mg/l SO₄` });
  }
  if ((w.fMgL !== null && w.fMgL > 1.5) || (s.equivBoron !== null && s.equivBoron > 5.2)) {
    if (reasons.length < 2) {
      const detail = w.h3bo3MgL !== null && w.h3bo3MgL > 30
        ? `${comma(w.h3bo3MgL)} mg/l acid boric; nerecomandată copiilor`
        : `${comma(w.fMgL ?? s.equivBoron ?? 0)} mg/l; atenție la consumul zilnic`;
      reasons.push({ tone: 'bad', title: 'Elemente cu limitare de vârstă', detail });
    }
  }
  if (w.no3MgL !== null && w.no3MgL > 10 && reasons.length < 2) {
    reasons.push({ tone: 'bad', title: 'Nitrați peste pragul pentru sugari', detail: `${comma(w.no3MgL)} mg/l NO₃` });
  }
  if (s.tier !== 'therapeutic' && s.tier !== 'occasional_high_mineral') {
    if (s.magnesiumRich) {
      reasons.push({ tone: 'good', title: 'Sursă naturală de magneziu', detail: `${comma(w.mgMgL!)} mg/l Mg` });
    } else if (s.lowSodium) {
      const sodium = intervalFor(w, w.naMgL === null ? 'naPlusKMgL' : 'naMgL')!;
      const label = w.naMgL === null ? 'Na + K' : 'Na';
      const amount = sodium[0] === sodium[1] ? comma(sodium[1]) : `${comma(sodium[0])}–${comma(sodium[1])}`;
      reasons.push({ tone: 'good', title: 'Săracă în sodiu', detail: `${amount} mg/l ${label}` });
    } else if (score >= 70 && s.effectiveTds !== null && s.effectiveTds >= 50 && s.effectiveTds <= 500) {
      reasons.push({ tone: 'good', title: 'Mineralizare echilibrată zilnic', detail: `${comma(s.effectiveTds)} mg/l` });
    }
  }
  if (reasons.length < 2 && s.carbonated) {
    reasons.push({
      tone: 'neutral',
      title: w.carbonation === 'lightly_sparkling' ? 'Slab carbogazoasă' : 'Carbogazoasă',
      detail: 'Dioxidul de carbon poate irita refluxul gastric',
    });
  } else if (reasons.length < 2 && s.iodized) {
    reasons.push({ tone: 'neutral', title: 'Îmbogățită cu iod', detail: `${comma(w.iUgL!)} µg/l I` });
  }
  return reasons.slice(0, 3);
}

function hasUnverifiedEvidence(w: WaterProfile | null | undefined, productStatus?: ProductStatus): boolean {
  if (!w) return productStatus === 'unverified';
  for (const key of WATER_FIELD_KEYS) {
    const val = w[key];
    if (val === null || val === undefined) continue;
    const evStatus = w.evidence?.[key]?.status;
    if (evStatus === 'unverified') return true;
    if (evStatus === undefined && productStatus === 'unverified') return true;
  }
  return false;
}

/** Evaluates water suitability from available mineral readings directly as a single 0–100 score. */
export function computeWaterScore(
  w: WaterProfile | null | undefined,
  productStatus?: ProductStatus,
): ScoreResult {
  const unverifiedUsed = hasUnverifiedEvidence(w, productStatus);
  if (!w) {
    return {
      score: null, letter: null, grade: 'unavailable', reasons: [], missing: [],
      range: null, waterMissing: [], unverifiedUsed,
    };
  }
  const effectiveTds = effectiveWaterTds(w);
  if (effectiveTds === null && w.classification !== 'therapeutic') {
    return {
      score: null, letter: null, grade: 'unavailable', reasons: [], missing: [],
      range: null, waterMissing: [], unverifiedUsed,
    };
  }

  const s = summarizeWater(w);
  const isTherapeutic = s.tier === 'therapeutic';

  let raw = 100;
  raw -= tdsPenalty(s.effectiveTds, s.magnesiumRich, isTherapeutic);
  raw -= naPenalty(s.effectiveNa);
  raw -= phPenalty(w.ph, w.carbonation);
  raw -= w.carbonation === 'sparkling' ? 6 : w.carbonation === 'lightly_sparkling' ? 2 : 0;
  raw -= w.so4MgL !== null ? (w.so4MgL > 1000 ? 18 : w.so4MgL > 250 ? 10 : 0) : 0;
  const safetyTriggered =
    (w.fMgL !== null && w.fMgL > 1.5) ||
    (w.no3MgL !== null && w.no3MgL > 10) ||
    (s.equivBoron !== null && s.equivBoron > 5.2);
  if (safetyTriggered) raw -= 16;

  if (
    s.effectiveTds !== null &&
    s.effectiveTds >= 50 &&
    s.effectiveTds <= 1000 &&
    (s.effectiveNa === null || s.effectiveNa <= 100) &&
    (w.so4MgL === null || w.so4MgL <= 250)
  ) {
    const balance =
      (w.caMgL !== null && w.caMgL >= 30 ? 2 : 0) +
      (w.mgMgL !== null && w.mgMgL >= 50 ? 4 : w.mgMgL !== null && w.mgMgL >= 10 ? 2 : 0) +
      (s.lowSodium ? 2 : 0);
    raw += Math.min(4, balance);
  }

  const toxicViolation =
    (w.ph !== null && (w.ph < 4 || w.ph > 10.5)) ||
    (w.no3MgL !== null && w.no3MgL > 50);
  const cap = isTherapeutic ? 40 : 100;
  const floor = isTherapeutic && !toxicViolation ? 20 : 0;
  const score = Math.max(floor, Math.min(cap, Math.round(raw)));
  const grade: Grade = score >= 60 ? 'good' : score >= 40 ? 'medium' : 'low';

  return {
    score,
    letter: null,
    grade,
    reasons: buildWaterReasons(w, s, score),
    missing: [],
    range: null,
    waterMissing: [],
    unverifiedUsed,
  };
}
