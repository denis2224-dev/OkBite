import type { Product, ScoreResult } from '@okbite/shared';
import { ro } from '../../copy/ro';

export const productShareUrl = (product: Product): string => `https://okbite.md/product/${product.id}`;
export function productShareText(product: Product, score: ScoreResult): string {
  return `${ro.share.text(product.name, product.brand, score.score === null
    ? ro.result.scoreUnavailable : ro.share.score(score.score))}\n${productShareUrl(product)}`;
}
