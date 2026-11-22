import {
  effectiveWaterTds,
  summarizeWater,
  type WaterNumericKey,
  type WaterProfile,
} from '@okbite/shared';
import { formatPh, waterFieldDisplayValue } from './waterFormat';

export type PhLevelKey = 'acidic' | 'slightly_acidic' | 'neutral' | 'alkaline' | 'high_alkaline';
export type MineralTone = 'good' | 'neutral' | 'warn' | 'low' | 'info';
export type MineralLevelKey =
  | 'very_low'
  | 'low_mineral'
  | 'low'
  | 'ordinary'
  | 'medium'
  | 'rich'
  | 'high'
  | 'very_high';
export type TasteKey = 'neutral' | 'soft' | 'mineral' | 'rich_mineral' | 'salty_intense';
export type GoodForTagKey =
  | 'teaCoffee'
  | 'dailyHydration'
  | 'lowSodium'
  | 'sport'
  | 'calciumSource'
  | 'iodized';

export interface EffectivePh {
  value: number;
  isApprox: boolean;
  display: string;
  pill: string;
  level: PhLevelKey;
  dots: 1 | 2 | 3 | 4 | 5;
  tone: 'warn' | 'good' | 'info';
}

export interface MineralClassification {
  level: MineralLevelKey;
  dots: 1 | 2 | 3 | 4 | 5;
  tone: MineralTone;
}

export interface MineralRowData extends MineralClassification {
  key: WaterNumericKey;
  displayValue: string;
}

export interface WaterComposition {
  declaredCount: number;
  totalStandardCount: 11;
  phRow: EffectivePh | null;
  mineralRows: MineralRowData[];
  missingKeys: WaterNumericKey[];
}

type Band = readonly [number, MineralLevelKey, 1 | 2 | 3 | 4 | 5, MineralTone];

const MINERAL_BANDS: Record<Exclude<WaterNumericKey, 'ph'>, readonly Band[]> = {
  tdsMgL: [
    [150, 'very_low', 1, 'good'],
    [500, 'low_mineral', 2, 'good'],
    [1000, 'medium', 3, 'neutral'],
    [1500, 'high', 4, 'warn'],
    [Infinity, 'very_high', 5, 'low'],
  ],
  dryResidueMgL: [
    [150, 'very_low', 1, 'good'],
    [500, 'low_mineral', 2, 'good'],
    [1000, 'medium', 3, 'neutral'],
    [1500, 'high', 4, 'warn'],
    [Infinity, 'very_high', 5, 'low'],
  ],
  mgMgL: [
    [14.999, 'low', 1, 'neutral'],
    [49.999, 'ordinary', 3, 'neutral'],
    [150, 'rich', 4, 'good'],
    [Infinity, 'very_high', 5, 'info'],
  ],
  caMgL: [
    [29.999, 'low', 1, 'neutral'],
    [100, 'ordinary', 3, 'neutral'],
    [250, 'rich', 4, 'good'],
    [Infinity, 'very_high', 5, 'info'],
  ],
  no3MgL: [
    [1, 'very_low', 1, 'good'],
    [10, 'low', 2, 'good'],
    [25, 'ordinary', 3, 'warn'],
    [50, 'high', 4, 'warn'],
    [Infinity, 'very_high', 5, 'low'],
  ],
  naMgL: [
    [20, 'low', 1, 'good'],
    [100, 'ordinary', 2, 'neutral'],
    [200, 'medium', 3, 'warn'],
    [500, 'high', 4, 'warn'],
    [Infinity, 'very_high', 5, 'low'],
  ],
  naPlusKMgL: [
    [20, 'low', 1, 'good'],
    [100, 'ordinary', 2, 'neutral'],
    [200, 'medium', 3, 'warn'],
    [500, 'high', 4, 'warn'],
    [Infinity, 'very_high', 5, 'low'],
  ],
  so4MgL: [
    [50, 'low', 1, 'good'],
    [250, 'ordinary', 2, 'neutral'],
    [1000, 'high', 4, 'warn'],
    [Infinity, 'very_high', 5, 'low'],
  ],
  clMgL: [
    [25, 'low', 1, 'good'],
    [250, 'ordinary', 2, 'neutral'],
    [Infinity, 'high', 4, 'warn'],
  ],
  hco3MgL: [
    [149.999, 'low', 1, 'neutral'],
    [600, 'ordinary', 3, 'neutral'],
    [Infinity, 'rich', 4, 'info'],
  ],
  kMgL: [
    [5, 'low', 1, 'neutral'],
    [20, 'ordinary', 3, 'neutral'],
    [Infinity, 'high', 4, 'info'],
  ],
  fMgL: [
    [0.5, 'low', 1, 'good'],
    [1.5, 'ordinary', 2, 'good'],
    [Infinity, 'high', 5, 'low'],
  ],
  h3bo3MgL: [
    [1, 'low', 1, 'good'],
    [5.2, 'ordinary', 2, 'neutral'],
    [Infinity, 'high', 5, 'low'],
  ],
  bMgL: [
    [1, 'low', 1, 'good'],
    [5.2, 'ordinary', 2, 'neutral'],
    [Infinity, 'high', 5, 'low'],
  ],
  iUgL: [
    [29.999, 'low', 1, 'neutral'],
    [150, 'ordinary', 3, 'good'],
    [Infinity, 'high', 4, 'warn'],
  ],
};

function numericReading(w: WaterProfile, key: WaterNumericKey): number | null {
  const r = w.ranges?.[key];
  if (r) return (r.min + r.max) / 2;
  const v = w[key];
  return v !== null && v !== undefined ? v : null;
}

export function getEffectivePh(w: WaterProfile): EffectivePh | null {
  if (w.ph !== null) {
    const level: PhLevelKey = w.ph < 6 ? 'acidic' : w.ph < 6.5 ? 'slightly_acidic' : w.ph <= 7.8 ? 'neutral' : w.ph <= 8.5 ? 'alkaline' : 'high_alkaline';
    const dots: 1 | 2 | 3 | 4 | 5 = w.ph < 6 ? 1 : w.ph < 6.5 ? 2 : w.ph <= 7.8 ? 3 : w.ph <= 8.5 ? 4 : 5;
    const tone: 'warn' | 'good' | 'info' = w.ph < 6.5 ? 'warn' : w.ph <= 7.8 ? 'good' : 'info';
    const formatted = formatPh(w.ph);
    return { value: w.ph, isApprox: false, display: formatted, pill: `pH ${formatted}`, level, dots, tone };
  }
  if (w.carbonation === 'sparkling') {
    return { value: 5.5, isApprox: true, display: '≈ 5,5', pill: 'pH ≈ 5,5', level: 'acidic', dots: 1, tone: 'warn' };
  }
  if (w.carbonation === 'lightly_sparkling') {
    return { value: 6, isApprox: true, display: '≈ 6', pill: 'pH ≈ 6', level: 'slightly_acidic', dots: 2, tone: 'warn' };
  }
  return null;
}

export function deriveWaterTaste(w: WaterProfile): { index: 0 | 1 | 2 | 3 | 4; key: TasteKey } | null {
  const tds = effectiveWaterTds(w);
  const na = w.naMgL ?? (w.naPlusKMgL !== null ? w.naPlusKMgL * 0.85 : null);
  const cl = w.clMgL;
  if (tds === null && na === null && cl === null) return null;
  if ((tds !== null && tds > 2500) || (na !== null && na > 500) || (cl !== null && cl > 500)) return { index: 4, key: 'salty_intense' };
  if (tds !== null && tds > 1000) return { index: 3, key: 'rich_mineral' };
  if (tds !== null && tds > 500) return { index: 2, key: 'mineral' };
  if (tds !== null && tds >= 150) return { index: 1, key: 'soft' };
  return { index: 0, key: 'neutral' };
}

export function deriveGoodForTags(w: WaterProfile): { caution: boolean; tags: GoodForTagKey[] } {
  const s = summarizeWater(w);
  if (s.tier === 'therapeutic') return { caution: true, tags: [] };
  const tds = s.effectiveTds;
  const tags: GoodForTagKey[] = [];
  if (tds !== null && tds <= 500 && (w.caMgL === null || w.caMgL <= 60)) tags.push('teaCoffee');
  if (s.tier === 'daily_low_sodium' || s.tier === 'daily') tags.push('dailyHydration');
  if (s.lowSodium) tags.push('lowSodium');
  if (s.magnesiumRich || (tds !== null && tds >= 500 && tds <= 1500)) tags.push('sport');
  if (s.highCalcium) tags.push('calciumSource');
  if (s.iodized) tags.push('iodized');
  return { caution: false, tags: tags.slice(0, 4) };
}

export function classifyMineral(key: Exclude<WaterNumericKey, 'ph'>, value: number): MineralClassification {
  for (const [max, level, dots, tone] of MINERAL_BANDS[key]) {
    if (value <= max) return { level, dots, tone };
  }
  return { level: 'ordinary', dots: 3, tone: 'neutral' };
}

const ORDERED_MINERAL_KEYS: readonly Exclude<WaterNumericKey, 'ph'>[] = [
  'tdsMgL', 'dryResidueMgL', 'mgMgL', 'caMgL', 'no3MgL', 'kMgL', 'so4MgL', 'clMgL', 'fMgL',
  'naMgL', 'naPlusKMgL', 'hco3MgL', 'h3bo3MgL', 'bMgL', 'iUgL',
];
const STANDARD_SINGLES: readonly Exclude<WaterNumericKey, 'ph' | 'tdsMgL' | 'dryResidueMgL' | 'naMgL' | 'naPlusKMgL' | 'h3bo3MgL' | 'bMgL' | 'iUgL'>[] = [
  'mgMgL', 'caMgL', 'no3MgL', 'kMgL', 'so4MgL', 'clMgL', 'fMgL', 'hco3MgL',
];

export function buildWaterComposition(w: WaterProfile): WaterComposition {
  const phRow = getEffectivePh(w);
  const declaredCount =
    (w.ph !== null ? 1 : 0) +
    (w.tdsMgL !== null || w.dryResidueMgL !== null ? 1 : 0) +
    (w.naMgL !== null || w.naPlusKMgL !== null ? 1 : 0) +
    STANDARD_SINGLES.filter((k) => w[k] !== null).length;

  const mineralRows: MineralRowData[] = [];
  for (const key of ORDERED_MINERAL_KEYS) {
    const displayValue = waterFieldDisplayValue(w, key);
    const val = numericReading(w, key);
    if (displayValue !== null && val !== null) {
      mineralRows.push({ key, displayValue, ...classifyMineral(key, val) });
    }
  }

  const missingKeys: WaterNumericKey[] = [];
  if (!phRow) missingKeys.push('ph');
  if (w.tdsMgL === null && w.dryResidueMgL === null) missingKeys.push('tdsMgL');
  for (const key of ['mgMgL', 'caMgL', 'no3MgL', 'kMgL', 'so4MgL', 'clMgL', 'fMgL'] as const) {
    if (w[key] === null) missingKeys.push(key);
  }
  if (w.naMgL === null && w.naPlusKMgL === null) missingKeys.push('naMgL');
  if (w.hco3MgL === null) missingKeys.push('hco3MgL');

  return { declaredCount, totalStandardCount: 11, phRow, mineralRows, missingKeys };
}
