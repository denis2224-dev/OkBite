import { ro } from "../constants/strings_ro";
import { formatAmount } from "./formatters";
export function perPortion(per100: number, portionAmount: number) {
  return (per100 * portionAmount) / 100;
}
export function percentOfReference(
  key: "kcal" | "sugar" | "sat" | "salt",
  amount: number,
) {
  return (amount / { kcal: 2000, sugar: 90, sat: 20, salt: 6 }[key]) * 100;
}
export function teaspoons(sugarGrams: number) {
  if (sugarGrams < 2) return ro.result.teaspoons.underHalf;
  const count = Math.round((sugarGrams / 4) * 2) / 2;
  return count === 0.5
    ? ro.result.teaspoons.half
    : count === 1
      ? ro.result.teaspoons.one
      : ro.result.teaspoons.many(formatAmount(count));
}
