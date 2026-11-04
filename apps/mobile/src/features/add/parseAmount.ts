const AMOUNT_RE = /^\s*(\d+(?:[.,]\d+)?)(?:\s*(?:g|mg|ml|kcal|kj|%))?\s*$/i;

/**
 * Parses a Romanian or dot-decimal nutrition amount string into a finite non-negative number,
 * or returns `null` when empty, negative, non-finite, or malformed.
 */
export function parseAmount(s: string): number | null {
  const match = AMOUNT_RE.exec(s);
  const rawNumber = match?.[1];
  if (!rawNumber) return null;
  const value = Number(rawNumber.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0) return null;
  return value === 0 ? 0 : value;
}

