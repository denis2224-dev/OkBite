import type { NutrientKey } from '@okbite/shared';

export type AmountUnit = 'g' | 'kcal' | '%';

const AMOUNT_TOKEN_RE = /^\s*(\d+(?:[.,]\d+)?)(?:\s*([^\s\d]+))?\s*$/;

export function unitForNutrient(key: NutrientKey): AmountUnit {
  if (key === 'kcal') return 'kcal';
  if (key === 'fruitVegPct') return '%';
  return 'g';
}

/**
 * Parses a Romanian or dot-decimal nutrition amount string into a finite non-negative number.
 * Accepts bare numbers or the suffix matching `allowedUnit` (defaults to `'g'`);
 * rejects negative, non-finite, malformed, or unit-mismatched values (`mg`, `kJ`, `ml`, etc.).
 */
export function parseAmount(s: string, allowedUnit: AmountUnit = 'g'): number | null {
  const match = AMOUNT_TOKEN_RE.exec(s);
  const rawNumber = match?.[1];
  if (!rawNumber) return null;
  const rawUnit = match?.[2];
  if (rawUnit && rawUnit.toLowerCase() !== allowedUnit) return null;
  const value = Number(rawNumber.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0) return null;
  return value === 0 ? 0 : value;
}
