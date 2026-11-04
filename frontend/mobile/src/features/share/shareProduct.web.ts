import type { Product, ScoreResult } from "@okbite/shared";
import { productShareText } from "./productShareText";
export { productShareText } from "./productShareText";
export async function shareProduct(
  product: Product,
  score: ScoreResult,
): Promise<"shared" | "copied" | "cancelled"> {
  const text = productShareText(product, score);
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        return "cancelled";
      throw error;
    }
  }
  if (!navigator.clipboard)
    throw new Error("Distribuirea nu este disponibilă.");
  await navigator.clipboard.writeText(text);
  return "copied";
}
