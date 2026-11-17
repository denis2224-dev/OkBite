import { tierFor, type Tier } from '@okbite/shared';
import { productScoreFor } from '../product/productScoreFor';
import type { HistoryEntry } from './store';

export type Basket = {
  average: number; tier: Tier; scored: number; unscored: number;
  mix: Record<Tier, number>; best: { name: string; score: number; tier: Tier };
};

/** "Coșul tău": the average product score of everything saved on this phone, the tier mix and the best find.
 * Products without a score are counted apart and never pull the average. Null when nothing has a score. */
export function summarizeBasket(entries: HistoryEntry[]): Basket | null {
  const mix: Record<Tier, number> = { excellent: 0, good: 0, fair: 0, poor: 0, bad: 0 };
  let total = 0, scored = 0, unscored = 0;
  let best: (Basket['best'] & { savedAt: string }) | null = null;
  for (const entry of entries) {
    const { score, tier } = productScoreFor(entry.product, entry.score);
    if (score === null || tier === null) { unscored++; continue; }
    scored++; total += score; mix[tier]++;
    if (!best || score > best.score || (score === best.score && entry.savedAt > best.savedAt)) {
      best = { name: entry.product.name, score, tier, savedAt: entry.savedAt };
    }
  }
  if (!scored || !best) return null;
  const average = Math.round(total / scored);
  return { average, tier: tierFor(average), scored, unscored, mix, best: { name: best.name, score: best.score, tier: best.tier } };
}
