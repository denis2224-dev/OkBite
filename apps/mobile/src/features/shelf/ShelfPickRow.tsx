import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { ListRow } from '../../ui/ListRow';
import type { ShelfPick } from './topProducts';

/** One ranked product as a grade row; the first is the best pick, said in its label. */
export function ShelfPickRow({ pick, best, first }: { pick: ShelfPick; best: boolean; first: boolean }) {
  const { product, score, tier } = pick;
  const label = [best ? ro.scan.shelf.best : null, [product.name, product.brand].filter(Boolean).join(', '), `${ro.history.score(score)} · ${ro.tiers[tier]}`].filter(Boolean).join('. ');
  return <ListRow title={product.name} score={score} tier={tier} label={label} first={first}
    onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} />;
}
