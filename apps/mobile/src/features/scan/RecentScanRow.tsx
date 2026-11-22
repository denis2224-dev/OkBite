import { router } from 'expo-router';
import type { Allergen } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { ListRow } from '../../ui/ListRow';
import { productScoreFor } from '../product/productScoreFor';
import type { HistoryEntry } from '../history/store';

/** One recent product: grade square, name, and the profile allergens it declares, if any. */
export function RecentScanRow({ entry, watched, first }: { entry: HistoryEntry; watched: readonly Allergen[]; first: boolean }) {
  const { product } = entry;
  const { score, tier } = productScoreFor(product, entry.score);
  const matches = product.allergens.filter(allergen => watched.includes(allergen)).map(allergen => ro.allergens[allergen]);
  const warning = matches.length ? ro.result.containsAllergen(matches.join(', ')) : null;
  const scoreLabel = score === null || !tier ? ro.result.scoreUnavailable : `${ro.history.score(score)} · ${ro.tiers[tier]}`;
  const label = [ro.history.open(product.name), scoreLabel, warning].filter(Boolean).join('. ');
  return <ListRow title={product.name} score={score} tier={tier} label={label} first={first} warning={matches.length ? matches.join(', ') : undefined}
    onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id, cached: '1' } })} />;
}
