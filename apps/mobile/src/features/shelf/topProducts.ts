import type { Product, Tier, TopProductsResponse } from '@okbite/shared';
import { productScoreFor } from '../product/productScoreFor';

export type ShelfPick = { product: Product; score: number; tier: Tier };

/** Verified products with a product score, best first (ties by name, A to Z), at most `limit`. Same score as Result, History and Compare. */
export function rankTop(entries: TopProductsResponse['products'], limit = 3): ShelfPick[] {
  const picks: ShelfPick[] = [];
  for (const { product, score: nutrition } of entries) {
    if (product.status !== 'verified') continue;
    const { score, tier } = productScoreFor(product, nutrition);
    if (score !== null && tier !== null) picks.push({ product, score, tier });
  }
  return picks.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'ro')).slice(0, limit);
}
