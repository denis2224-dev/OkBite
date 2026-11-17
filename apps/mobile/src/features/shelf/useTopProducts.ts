import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { rankTop, type ShelfPick } from './topProducts';

// One answer per shelf for the session, so going back to a shelf is instant. Failures are never kept.
const cache = new Map<string, ShelfPick[]>();
/** For tests. */
export function clearTopProductsCache(): void { cache.clear(); }

export type TopProducts = { status: 'loading' | 'error' | 'ready'; picks: ShelfPick[]; retry: () => void };

/** The top verified products of one shelf, ranked on the phone. */
export function useTopProducts(category: string): TopProducts {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; picks: ShelfPick[] | null } | null>(null);
  const key = `${category}:${attempt}`;
  useEffect(() => {
    if (cache.has(category)) return;
    let live = true;
    api.topProducts(category).then(response => {
      const picks = rankTop(response.products);
      cache.set(category, picks);
      if (live) setSettled({ key, picks });
    }).catch(() => { if (live) setSettled({ key, picks: null }); });
    return () => { live = false; };
  }, [category, key]);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  const picks = cache.get(category) ?? (settled?.key === key ? settled.picks : undefined);
  if (picks === undefined) return { status: 'loading', picks: [], retry };
  return picks ? { status: 'ready', picks, retry } : { status: 'error', picks: [], retry };
}
