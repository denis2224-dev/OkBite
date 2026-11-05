import { Share } from "react-native";
import type { Product, ScoreResult } from "../../data/models/contract";
import { productShareText } from "./product_share_text";
export { productShareText } from "./product_share_text";
export async function shareProduct(
  product: Product,
  score: ScoreResult,
): Promise<"shared" | "copied" | "cancelled"> {
  const result = await Share.share({
    message: productShareText(product, score),
  });
  return result.action === Share.dismissedAction ? "cancelled" : "shared";
}
