import type { Product, ScoreResult } from '@okbite/shared';
import { displayScore } from '../product/displayScore';
import { ro } from '../../copy/ro';

export const productShareUrl = (product: Product): string => `https://okbite.md/product/${product.id}`;
export function productShareText(product: Product, score: ScoreResult): string {
  const shown = displayScore(product, score);
  return `${ro.share.text(product.name, product.brand, shown.score === null || shown.grade === 'unavailable'
    ? ro.result.scoreUnavailable : ro.share.score(shown.score))}\n${productShareUrl(product)}`;
}
