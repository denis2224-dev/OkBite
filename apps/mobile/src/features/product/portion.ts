import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';

// Reference amounts and 4 g/teaspoon: approved design spec, sections 3–4.
export function perPortion(per100: number, portionAmount: number): number {
  return per100 * portionAmount / 100;
}
export function percentOfReference(key: 'kcal' | 'sugar' | 'sat' | 'salt', amount: number): number {
  return amount / { kcal: 2000, sugar: 90, sat: 20, salt: 6 }[key] * 100;
}
export function teaspoons(sugarGrams: number): string {
  const count = Math.round(sugarGrams / 4 * 2) / 2;
  return sugarGrams < 2 ? ro.result.teaspoons.underHalf
    : count === 0.5 ? ro.result.teaspoons.half
    : count === 1 ? ro.result.teaspoons.one
    : ro.result.teaspoons.many(formatAmount(count));
}
