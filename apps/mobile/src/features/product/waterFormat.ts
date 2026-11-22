import type { WaterFieldKey, WaterNumericKey, WaterProfile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';

export const formatPh = (n: number) => n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');

export function waterFieldLabel(key: WaterFieldKey): string {
  const wCopy = ro.result.water;
  if (key === 'tdsMgL') return wCopy.tdsLabel;
  if (key === 'dryResidueMgL') return wCopy.dryResidueLabel;
  if (key === 'ph') return wCopy.phLabel;
  if (key === 'carbonation') return wCopy.carbonationLabel;
  if (key === 'classification') return wCopy.classificationLabel;
  return wCopy.ions[key];
}

export function waterUnit(key: WaterNumericKey): string {
  const wCopy = ro.result.water;
  if (key === 'ph') return '';
  return key === 'iUgL' ? wCopy.ugL : wCopy.mgL;
}

export function formatSingleWaterNumber(value: number, key: WaterNumericKey): string {
  return key === 'ph' ? formatPh(value) : formatAmount(value);
}

/** Formats exact scalar or preserved label range (e.g. "350–400 mg/l", "0 mg/l") for water rows & compare cells. */
export function waterFieldDisplayValue(water: WaterProfile, key: WaterNumericKey): string | null {
  const unit = waterUnit(key);
  const suffix = unit ? ` ${unit}` : '';
  const r = water.ranges?.[key];
  if (r) {
    return `${formatSingleWaterNumber(r.min, key)}–${formatSingleWaterNumber(r.max, key)}${suffix}`;
  }
  const val = water[key];
  if (val === null || val === undefined) return null;
  return `${formatSingleWaterNumber(val, key)}${suffix}`;
}
