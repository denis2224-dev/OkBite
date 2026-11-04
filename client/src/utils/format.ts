export function formatAmount(n: number): string {
  return n
    .toFixed(n >= 100 ? 0 : n >= 1 ? 1 : 2)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "")
    .replace(".", ",");
}
