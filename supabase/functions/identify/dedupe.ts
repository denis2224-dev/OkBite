import type { Carbonation } from '../_shared/contract.ts';

type Row = {
  id: string;
  name: string;
  brand: string;
  quantity: string;
  carbonation?: Carbonation | null;
};

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const UNIT: Record<string, [number, 'ml' | 'g']> = {
  ml: [1, 'ml'],
  cl: [10, 'ml'],
  l: [1000, 'ml'],
  g: [1, 'g'],
  kg: [1000, 'g'],
};

/** "330 ml", "0,33 l", "1.75L" → amount in ml or g; null for multipacks ("5 x 250 ml") or no size. */
export function packSize(quantity: string): { amount: number; unit: 'ml' | 'g' } | null {
  const q = quantity.toLowerCase();
  if (/\d\s*[x×*]\s*\d/.test(q)) return null;
  const m = q.match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|kg|l|g)(?![a-z])/);
  if (!m) return null;
  const [factor, unit] = UNIT[m[2]!];
  return { amount: Number(m[1]!.replace(',', '.')) * factor, unit };
}

export function sameSize(a: string, b: string): boolean {
  const x = packSize(a);
  const y = packSize(b);
  return !!x && !!y && x.unit === y.unit && Math.abs(x.amount - y.amount) <= x.amount * 0.01;
}

export const groupKey = (r: Pick<Row, 'brand' | 'name' | 'carbonation'>) =>
  `${norm(r.brand)}|${norm(r.name)}|${r.carbonation ?? ''}`;

const compatibleCarbonation = (rowCarb: Carbonation | null | undefined, filterCarb?: Carbonation | null) =>
  !filterCarb || !rowCarb || rowCarb === filterCarb;

/**
 * One candidate per brand+name+carbonation: sizes of the exact same product share a profile, while
 * contradicting water types (still vs sparkling) or distinct lines remain separate.
 */
export function dedupeCandidates<T extends Row>(
  rows: T[],
  siblings: T[],
  quantity: string | null,
  filterCarbonation?: Carbonation | null,
): T[] {
  const matchingRows = rows.filter((r) => compatibleCarbonation(r.carbonation, filterCarbonation));
  const matchingSiblings = siblings.filter((r) => compatibleCarbonation(r.carbonation, filterCarbonation));
  const picked = new Map<string, T>();
  for (const row of matchingRows) {
    const key = groupKey(row);
    if (picked.has(key)) continue;
    const pool = [row, ...matchingRows, ...matchingSiblings].filter((r) => groupKey(r) === key);
    picked.set(key, (quantity && pool.find((r) => sameSize(r.quantity, quantity))) || row);
  }
  return [...picked.values()];
}
