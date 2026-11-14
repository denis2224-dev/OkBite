import { useCallback, useEffect, useState } from 'react';
import type { Product, ScoreResult } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { saveToHistory, getFromHistory } from '../history/store';
import { forgetLookup, freshLookup } from './freshLookup';

type State = { id: string; data?: { product: Product; score: ScoreResult }; error?: ApiError; loading: boolean; storageError?: boolean; cached?: boolean };
export function useProduct(id: string, cachedOnly = false) {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const [state, setState] = useState<State>(() => {
    const fresh = cachedOnly ? undefined : freshLookup(id);
    return fresh ? { id, data: fresh, loading: false } : { id, loading: true };
  });
  useEffect(() => {
    let active = true;
    async function load() {
      const fresh = cachedOnly ? undefined : freshLookup(id);
      if (fresh) {
        forgetLookup(id);
        let storageError = false;
        try { await saveToHistory(fresh); } catch { storageError = true; }
        if (active) setState({ id, data: fresh, loading: false, storageError });
        return;
      }
      if (active) setState({ id, loading: true });
      try {
        if (cachedOnly) {
          const cached = await getFromHistory(id);
          if (!cached) throw new ApiError('not_found');
          if (active) setState({ id, data: cached, cached: true, loading: false });
          return;
        }
        const result = await api.lookup({ id });
        if (result.status !== 'found') throw new ApiError('not_found');
        let storageError = false;
        try { await saveToHistory(result); } catch { storageError = true; }
        if (active) setState({ id, data: result, loading: false, storageError });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'offline') {
          try {
            const cached = await getFromHistory(id);
            if (cached) {
              if (active) setState({ id, data: cached, cached: true, loading: false });
              return;
            }
          } catch { /* Keep the network error if local storage also fails. */ }
        }
        if (active) setState({ id, loading: false, error: error instanceof ApiError ? error : new ApiError('upstream_failed') });
      }
    }
    void load();
    return () => { active = false; };
  }, [id, attempt, cachedOnly]);
  return { ...(state.id === id ? state : { id, loading: true }), retry };
}
