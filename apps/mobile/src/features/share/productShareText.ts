import type { Product, ScoreResult } from '@okbite/shared';
import { displayScore } from '../product/displayScore';
import { productScoreFor } from '../product/productScoreFor';
import { ro } from '../../copy/ro';

export const productShareUrl = (product: Product): string => `https://okbite.md/product/${product.id}`;
export function productShareText(product: Product, score: ScoreResult): string {
  const displayed = displayScore(product, score);
  const { score: value } = productScoreFor(product, score);
  const label = value !== null
    ? ro.share.score(value)
    : product.category.scoreKind === 'water' && displayed.range && displayed.grade !== 'unavailable'
    ? ro.result.water.estimatedRange(displayed.range.min, displayed.range.max)
    : ro.result.scoreUnavailable;
  const lines = [ro.share.text(product.name, product.brand, label)];
  if (product.category.scoreKind === 'water' && displayed.unverifiedUsed) lines.push(ro.result.water.unverifiedNote);
  lines.push(productShareUrl(product));
  return lines.join('\n');
}
