import {
  WATER_FIELD_KEYS,
  type Carbonation,
  type Grade,
  type ProductStatus,
  type ScoreReason,
  type ScoreResult,
  type WaterFieldKey,
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
const round3 = (v: number) => Math.round(v * 1000) / 1000;

function intervalFor(w: WaterProfile, key: WaterNumericKey): [number, number] | null {
  const r = w.ranges?.[key];
  if (r) return [r.min, r.max];
  const v = w[key];
  return v !== null && v !== undefined ? [v, v] : null;
}

function pointsInInterval(interval: [number, number], breaks: readonly number[]): number[] {
  const [lo, hi] = interval;
  if (lo === hi) return [lo];
  const pts = new Set<number>([lo, hi]);
  for (const b of breaks) {
    if (b >= lo && b <= hi) pts.add(b);
  }
  return [...pts];
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

/** Resolves effective mineralization interval [lo, hi] (mg/L), rejecting unit-contradictory TDS (<50 vs ionSum >500). */
function resolveTdsContext(w: WaterProfile): {
  effectiveTdsInt: [number, number] | null;
  unallocatedBudget: number;
} {
  const { count, loSum, hiSum } = dissolvedIonBounds(w);
  const rawTds = intervalFor(w, 'tdsMgL');
  const rawDry = intervalFor(w, 'dryResidueMgL');
  const usableTds = rawTds && !(rawTds[1] < 50 && count >= 2 && loSum > 500) ? rawTds : null;
  const usableDry = rawDry && !(rawDry[1] < 50 && count >= 2 && loSum > 500) ? rawDry : null;

  const usingDry = usableTds === null && usableDry !== null;
  let effectiveTdsInt: [number, number] | null = null;
  if (usableTds) effectiveTdsInt = usableTds;
  else if (usableDry) effectiveTdsInt = usableDry;
  else if ((count >= 4 || w.classification === 'therapeutic') && loSum > 0) {
    effectiveTdsInt = [Math.round(loSum), Math.round(hiSum)];
  }

  const massBaseHi = usableTds ? usableTds[1] : usableDry ? usableDry[1] : null;
  if (massBaseHi === null) {
    return { effectiveTdsInt, unallocatedBudget: Number.POSITIVE_INFINITY };
  }

  const naLo = intervalFor(w, 'naMgL')?.[0];
  const kLo = intervalFor(w, 'kMgL')?.[0];
  const npkLo = intervalFor(w, 'naPlusKMgL')?.[0];
  const bLo = intervalFor(w, 'bMgL')?.[0] ?? 0;
  const h3bo3Lo = intervalFor(w, 'h3bo3MgL')?.[0] ?? 0;
  const hco3Lo = intervalFor(w, 'hco3MgL')?.[0] ?? 0;

  const accountedLo =
    (intervalFor(w, 'caMgL')?.[0] ?? 0) +
    (intervalFor(w, 'mgMgL')?.[0] ?? 0) +
    (intervalFor(w, 'clMgL')?.[0] ?? 0) +
    (intervalFor(w, 'so4MgL')?.[0] ?? 0) +
    (intervalFor(w, 'fMgL')?.[0] ?? 0) +
    (intervalFor(w, 'no3MgL')?.[0] ?? 0) +
    Math.max(bLo, h3bo3Lo) +
    (naLo !== undefined ? naLo + (kLo ?? 0) : npkLo ?? 0) +
    hco3Lo * (usingDry ? 0.492 : 1);

  return {
    effectiveTdsInt,
    unallocatedBudget: Math.max(0, round3(massBaseHi - accountedLo)),
  };
}

/** Resolves effective mineralization (mg/L), rejecting unit-contradictory TDS (<50 vs ionSum >500). */
export function effectiveWaterTds(w: WaterProfile): number | null {
  const { effectiveTdsInt } = resolveTdsContext(w);
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

function gradeFor(scoreMin: number, scoreMax: number, isTherapeutic: boolean): Grade {
  if (scoreMin === scoreMax) {
    if (scoreMin >= 60) return 'good';
    if (scoreMin >= 40) return 'medium';
    return 'low';
  }
  if (isTherapeutic || scoreMax < 40) return 'low';
  if (scoreMin >= 70) return 'good';
  return 'medium';
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

function computePointScore(params: {
  tds: number | null;
  na: number;
  so4: number;
  ph: number;
  carbonation: Carbonation;
  ca: number;
  mg: number;
  safetyTriggered: boolean;
  toxicViolation: boolean;
  classification: WaterProfile['classification'];
  equivBoronLo: number | null;
}): number {
  const equivBoron = params.equivBoronLo;
  const magnesiumRich = params.mg >= 50 && params.so4 <= 250 && params.na <= 100;
  const isTherapeutic =
    params.classification === 'therapeutic' ||
    (params.tds !== null && params.tds > 5000) ||
    params.na > 1000 ||
    (equivBoron !== null && equivBoron > 5.2) ||
    params.so4 > 1500;

  let raw = 100;
  raw -= tdsPenalty(params.tds, magnesiumRich, isTherapeutic);
  raw -= naPenalty(params.na);
  raw -= phPenalty(params.ph, params.carbonation);
  raw -= params.carbonation === 'sparkling' ? 6 : params.carbonation === 'lightly_sparkling' ? 2 : 0;
  raw -= params.so4 > 1000 ? 18 : params.so4 > 250 ? 10 : 0;
  if (params.safetyTriggered) raw -= 16;

  if (params.tds !== null && params.tds >= 50 && params.tds <= 1000 && params.na <= 100 && params.so4 <= 250) {
    const balance =
      (params.ca >= 30 ? 2 : 0) +
      (params.mg >= 50 ? 4 : params.mg >= 10 ? 2 : 0) +
      (params.na < 20 ? 2 : 0);
    raw += Math.min(4, balance);
  }

  const cap = isTherapeutic ? 40 : 100;
  const floor = isTherapeutic && !params.toxicViolation ? 20 : 0;
  return Math.max(floor, Math.min(cap, Math.round(raw)));
}

const TDS_BREAKS = [49.9, 50, 500, 500.1, 900, 900.1, 1000, 1000.1, 1500, 1500.1, 3500, 3500.1, 5000, 5000.1];
const NA_BREAKS = [19.99, 20.01, 50.01, 100.01, 200.01, 500.01, 1000.01];
const SO4_BREAKS = [250.01, 1000.01, 1500.01];
const PH_BREAKS = [3.99, 4.0, 4.49, 4.5, 5.99, 6.0, 6.49, 6.5, 8.5, 8.51, 9.5, 9.51, 10.5, 10.51];

interface SolverOutput {
  scoreMin: number;
  scoreMax: number;
  waterMissing: WaterFieldKey[];
  unallocatedBudget: number;
}

/**
 * Solves exact global minimum and maximum water scores subject to dissolved-solids conservation:
 * sum of excess/unknown ion mass <= (TDS_hi - sum(declared_ion_lo)).
 */
function solveAdaptiveBounds(w: WaterProfile, effectiveTdsInt: [number, number] | null, rem: number): SolverOutput {
  const tdsCandidates: (number | null)[] = effectiveTdsInt ? pointsInInterval(effectiveTdsInt, TDS_BREAKS) : [null];
  const carbCandidates: Carbonation[] = w.carbonation ? [w.carbonation] : ['still', 'lightly_sparkling', 'sparkling'];

  const phInt = intervalFor(w, 'ph');
  const phCandidates = phInt ? pointsInInterval(phInt, PH_BREAKS) : [7.0, 5.5, 4.2];
  const phMinMeasuredToxic = phInt ? phInt[0] < 4 || phInt[1] > 10.5 : false;
  const phAlwaysToxic = phInt ? phInt[1] < 4 || phInt[0] > 10.5 : false;

  const naInt = intervalFor(w, 'naMgL');
  const npkInt = intervalFor(w, 'naPlusKMgL');
  const kInt = intervalFor(w, 'kMgL');
  type Choice = { val: number; cost: number };
  let naChoices: Choice[];
  if (naInt) {
    naChoices = pointsInInterval(naInt, NA_BREAKS).map((v) => ({ val: v, cost: round3(v - naInt[0]) }));
  } else if (npkInt) {
    // Unknown individual Na when producer reports combined Na+K: [0 (or max(0, lo - kHi)), npkHi - kLo].
    const naLo = kInt ? Math.max(0, npkInt[0] - kInt[1]) : 0;
    const naHi = Math.max(0, npkInt[1] - (kInt?.[0] ?? 0));
    naChoices = pointsInInterval([naLo, naHi], NA_BREAKS).map((v) => ({ val: v, cost: 0 }));
  } else {
    naChoices = pointsInInterval([0, Math.min(2000, rem)], NA_BREAKS)
      .filter((v) => v <= rem)
      .map((v) => ({ val: v, cost: v }));
  }

  const so4Int = intervalFor(w, 'so4MgL');
  const so4Choices: Choice[] = so4Int
    ? pointsInInterval(so4Int, SO4_BREAKS).map((v) => ({ val: v, cost: round3(v - so4Int[0]) }))
    : pointsInInterval([0, Math.min(2000, rem)], SO4_BREAKS)
        .filter((v) => v <= rem)
        .map((v) => ({ val: v, cost: v }));

  const fInt = intervalFor(w, 'fMgL');
  const no3Int = intervalFor(w, 'no3MgL');
  const bInt = intervalFor(w, 'bMgL');
  const h3bo3Int = intervalFor(w, 'h3bo3MgL');
  const boronLo = Math.max(bInt?.[0] ?? 0, h3bo3Int ? h3bo3Int[0] * 0.1748 : 0);
  const boronHi = Math.max(bInt?.[1] ?? 0, h3bo3Int ? h3bo3Int[1] * 0.1748 : 0);

  const knownSafetyMin = (fInt ? fInt[0] > 1.5 : false) || (no3Int ? no3Int[0] > 10 : false) || boronLo > 5.2;
  const knownSafetyMax = (fInt ? fInt[1] > 1.5 : false) || (no3Int ? no3Int[1] > 10 : false) || boronHi > 5.2;
  const minSafetyMass = Math.min(
    fInt === null ? 1.51 : Number.POSITIVE_INFINITY,
    no3Int === null ? 10.01 : Number.POSITIVE_INFINITY,
    bInt === null && h3bo3Int === null ? 30.01 : Number.POSITIVE_INFINITY,
  );
  const no3ToxicAlways = no3Int ? no3Int[0] > 50 : false;
  const safetyChoices: { triggered: boolean; toxicNo3: boolean; cost: number }[] = knownSafetyMin
    ? [{ triggered: true, toxicNo3: no3ToxicAlways, cost: 0 }]
    : knownSafetyMax
      ? [
          { triggered: false, toxicNo3: false, cost: 0 },
          { triggered: true, toxicNo3: false, cost: 0 },
        ]
      : minSafetyMass <= rem
        ? [
            { triggered: false, toxicNo3: false, cost: 0 },
            { triggered: true, toxicNo3: false, cost: minSafetyMass },
          ]
        : [{ triggered: false, toxicNo3: false, cost: 0 }];
  if (!no3ToxicAlways && (no3Int === null || no3Int[1] > 50)) {
    const cost = round3(50.001 - (no3Int?.[0] ?? 0));
    if (cost <= rem) safetyChoices.push({ triggered: true, toxicNo3: true, cost });
  }

  const caInt = intervalFor(w, 'caMgL');
  const mgInt = intervalFor(w, 'mgMgL');
  const caMin = caInt ? caInt[0] : 0;
  const mgMin = mgInt ? mgInt[0] : 0;

  let scoreMin = 100;
  let scoreMax = 0;

  for (const tds of tdsCandidates) {
    for (const carbonation of carbCandidates) {
      for (const ph of phCandidates) {
        const toxicPh = phInt ? (phAlwaysToxic || (phMinMeasuredToxic && (ph < 4 || ph > 10.5))) : false;
        for (const naC of naChoices) {
          for (const so4C of so4Choices) {
            if (naC.cost + so4C.cost > rem + 1e-6) continue;
            for (const safeC of safetyChoices) {
              const spent = naC.cost + so4C.cost + safeC.cost;
              if (spent > rem + 1e-6) continue;
              const left = rem === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, rem - spent);
              const caMax = caInt ? caInt[1] : left >= 30 ? 30 : 0;
              const mgMax = mgInt ? mgInt[1] : left >= 50 ? 50 : left >= 10 ? 10 : 0;

              const loS = computePointScore({
                tds, na: naC.val, so4: so4C.val, ph, carbonation,
                ca: caMin, mg: mgMin,
                safetyTriggered: safeC.triggered,
                toxicViolation: toxicPh || safeC.toxicNo3,
                classification: w.classification,
                equivBoronLo: bInt || h3bo3Int ? boronLo : null,
              });
              const hiS = computePointScore({
                tds, na: naC.val, so4: so4C.val, ph, carbonation,
                ca: caMax, mg: mgMax,
                safetyTriggered: safeC.triggered,
                toxicViolation: toxicPh || safeC.toxicNo3,
                classification: w.classification,
                equivBoronLo: bInt || h3bo3Int ? boronLo : null,
              });
              if (loS < scoreMin) scoreMin = loS;
              if (hiS > scoreMax) scoreMax = hiS;
            }
          }
        }
      }
    }
  }

  const waterMissing: WaterFieldKey[] = [];
  if (scoreMin < scoreMax) {
    if (effectiveTdsInt === null) waterMissing.push('tdsMgL');
    if (w.ph === null) waterMissing.push('ph');
    if (w.carbonation === null) waterMissing.push('carbonation');
    if (w.naMgL === null && ((npkInt && npkInt[1] >= 20) || (!npkInt && rem > 20))) {
      waterMissing.push('naMgL');
    }
    if (w.so4MgL === null && rem > 250) waterMissing.push('so4MgL');
    const therapeuticPossible =
      w.classification === 'therapeutic' ||
      (effectiveTdsInt !== null && effectiveTdsInt[1] > 5000) ||
      naChoices.some((c) => c.val > 1000) ||
      boronLo > 5.2 ||
      so4Choices.some((c) => c.val > 1500);
    if (!knownSafetyMin) {
      if (w.fMgL === null && rem > 1.5) waterMissing.push('fMgL');
      if (w.no3MgL === null && rem > 10) waterMissing.push('no3MgL');
      if (w.bMgL === null && w.h3bo3MgL === null && rem > 30) waterMissing.push('h3bo3MgL');
    } else if (therapeuticPossible && w.no3MgL === null && rem >= 50.001) {
      waterMissing.push('no3MgL');
    }
    const tdsMin = effectiveTdsInt?.[0] ?? 0;
    const lowNaPossible = naChoices.some((c) => c.val < 20);
    const maxBonusBase = (mgInt && mgInt[1] >= 50 ? 4 : mgInt && mgInt[1] >= 10 ? 2 : 0) + (lowNaPossible ? 2 : 0);
    if (w.caMgL === null && rem >= 30 && tdsMin <= 1000 && maxBonusBase < 4) {
      waterMissing.push('caMgL');
    }
    if (
      w.mgMgL === null &&
      rem >= 10 &&
      tdsMin <= 1000 &&
      ((tdsMin > 500 && (effectiveTdsInt?.[1] ?? 0) <= 900) || (caInt && caInt[1] >= 30 ? 2 : 0) + (lowNaPossible ? 2 : 0) < 4)
    ) {
      waterMissing.push('mgMgL');
    }
  }

  return { scoreMin, scoreMax, waterMissing, unallocatedBudget: rem };
}

function buildWaterReasons(
  w: WaterProfile,
  s: WaterSummary,
  isPartial: boolean,
  scoreMin: number,
  unallocatedBudget: number,
): ScoreReason[] {
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
    const so4Safe = w.so4MgL !== null ? w.so4MgL <= 250 : unallocatedBudget <= 250;
    const naSafe = w.naMgL !== null ? w.naMgL <= 100 : (w.naPlusKMgL !== null ? w.naPlusKMgL <= 100 : unallocatedBudget <= 100);
    if (s.magnesiumRich && so4Safe && naSafe) {
      reasons.push({ tone: 'good', title: 'Sursă naturală de magneziu', detail: `${comma(w.mgMgL!)} mg/l Mg` });
    } else if (s.lowSodium) {
      const sodium = intervalFor(w, w.naMgL === null ? 'naPlusKMgL' : 'naMgL')!;
      const label = w.naMgL === null ? 'Na + K' : 'Na';
      const amount = sodium[0] === sodium[1] ? comma(sodium[1]) : `${comma(sodium[0])}–${comma(sodium[1])}`;
      reasons.push({ tone: 'good', title: 'Săracă în sodiu', detail: `${amount} mg/l ${label}` });
    } else if (
      !isPartial &&
      scoreMin >= 70 &&
      s.effectiveTds !== null &&
      s.effectiveTds >= 50 &&
      s.effectiveTds <= 500
    ) {
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

/**
 * Evaluates water suitability from EU/WHO/Moldova chemistry thresholds:
 * emits an exact score when inputs prove point uniqueness, an estimated [min, max] range when partial/bounded
 * inputs leave ambiguity under dissolved-solids conservation, or unavailable when mineralization evidence is absent.
 */
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
  const { effectiveTdsInt, unallocatedBudget } = resolveTdsContext(w);
  if (effectiveTdsInt === null && w.classification !== 'therapeutic') {
    return {
      score: null, letter: null, grade: 'unavailable', reasons: [], missing: [],
      range: null, waterMissing: [], unverifiedUsed,
    };
  }

  const s = summarizeWater(w);
  const { scoreMin, scoreMax, waterMissing } = solveAdaptiveBounds(w, effectiveTdsInt, unallocatedBudget);
  const isPartial = scoreMin < scoreMax;
  const isTherapeutic = s.tier === 'therapeutic';

  return {
    score: isPartial ? null : scoreMin,
    letter: null,
    grade: gradeFor(scoreMin, scoreMax, isTherapeutic),
    reasons: buildWaterReasons(w, s, isPartial, scoreMin, unallocatedBudget),
    missing: [],
    range: isPartial ? { min: scoreMin, max: scoreMax } : null,
    waterMissing,
    unverifiedUsed,
  };
}
