import type { Product, ScoreResult } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { productShareText, productShareUrl } from './productShareText';

export async function shareProduct(product: Product, score: ScoreResult): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ text: productShareText(product, score) });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (!navigator.clipboard?.writeText) throw new Error(ro.share.error);
  await navigator.clipboard.writeText(productShareUrl(product));
  return 'copied';
}
