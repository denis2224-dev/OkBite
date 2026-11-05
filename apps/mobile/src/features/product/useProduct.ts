import { useEffect, useState } from 'react';
import type { Product, ScoreResult } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { saveToHistory, getFromHistory } from '../history/store';

type State = { id: string; data?: { product: Product; score: ScoreResult }; error?: ApiError; loading: boolean; storageError?: boolean };
export function useProduct(id: string): State {
  const [state, setState] = useState<State>({ id, loading: true });
  useEffect(() => {
    let active = true;
    async function load() {
      try {
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
              if (active) setState({ id, data: cached, loading: false });
              return;
            }
          } catch { /* Keep the network error if local storage also fails. */ }
        }
        if (active) setState({ id, loading: false, error: error instanceof ApiError ? error : new ApiError('upstream_failed') });
      }
    }
    void load();
    return () => { active = false; };
  }, [id]);
  return state.id === id ? state : { id, loading: true };
}
