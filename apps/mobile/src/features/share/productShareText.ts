import type { Product, ScoreResult } from '@okbite/shared';
import { productScoreFor } from '../product/productScoreFor';
import { ro } from '../../copy/ro';

export const productShareUrl = (product: Product): string => `https://okbite.md/product/${product.id}`;
export function productShareText(product: Product, score: ScoreResult): string {
  const { score: value } = productScoreFor(product, score);
  return `${ro.share.text(product.name, product.brand, value === null ? ro.result.scoreUnavailable : ro.share.score(value))}\n${productShareUrl(product)}`;
}
