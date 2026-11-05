import { Share } from 'react-native';
import type { Product, ScoreResult } from '@okbite/shared';
import { productShareText } from './productShareText';

export async function shareProduct(product: Product, score: ScoreResult): Promise<'shared' | 'copied' | 'cancelled'> {
  const result = await Share.share({ message: productShareText(product, score) });
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
}
