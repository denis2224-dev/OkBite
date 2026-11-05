import { AccessibilityInfo, Platform, Share } from 'react-native';
import type { Product, ScoreResult } from '@okbite/shared';
import { productShareText } from './productShareText';
import { ro } from '../../copy/ro';

export async function shareProduct(product: Product, score: ScoreResult): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    const result = await Share.share({ message: productShareText(product, score) });
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch (error) {
    // Android already announces the error through the result view's live region.
    Platform.select({ ios: () => AccessibilityInfo.announceForAccessibility(ro.share.error) })?.();
    throw error;
  }
}
