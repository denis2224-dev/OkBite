import type { Product, ScoreResult } from "@okbite/shared";
import { ro } from "../../copy/ro";
export function productShareText(product: Product, score: ScoreResult) {
  return (
    ro.share.text(
      product.name,
      product.brand,
      score.score === null
        ? ro.result.scoreUnavailable
        : ro.share.score(score.score),
    ) + `\nhttps://okbite.md/product/${product.id}`
  );
}
