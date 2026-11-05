export function formatAmount(n: number): string {
  const decimals = n >= 100 ? 0 : n >= 1 ? 1 : 2;
  const factor = 10 ** decimals;
  return String(Math.round(n * factor) / factor).replace(".", ",");
}
