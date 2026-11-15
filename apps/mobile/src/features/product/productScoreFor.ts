import { productScore, type Product, type ProductScore, type ScoreResult, type Tier } from '@okbite/shared';
import { displayScore } from './displayScore';

/** The 0-100 product score (nutrition, additives, processing) that Result, History and Compare all show. */
export function productScoreFor(product: Product, score: ScoreResult): ProductScore {
  return productScore(product, displayScore(product, score));
}

/** Theme colour grade for a tier. */
export function tierGrade(tier: Tier | null): 'good' | 'medium' | 'low' | 'neutral' {
  if (tier === null) return 'neutral';
  return tier === 'excellent' || tier === 'good' ? 'good' : tier === 'fair' ? 'medium' : 'low';
}
