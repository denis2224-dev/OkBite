import { z } from 'zod';
import { Product, ScoreResult, type Tier } from '@okbite/shared';
import { productScoreFor } from '../product/productScoreFor';

/** Expected answer of the `top-products` Edge Function (docs/api/top-products.md). Local until R2 moves it into the shared contract. */
export const TopProductsResponse = z.object({
  category: z.string().min(1),
  products: z.array(z.object({ product: Product, score: ScoreResult })),
});
export type TopProductsResponse = z.infer<typeof TopProductsResponse>;
/** Category slug as in data/categories.json. */
export const ShelfCategory = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(64);
export const TOP_PRODUCTS_LIMIT = 20;

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
