import { useEffect, useState } from "react";
import type { Product, ScoreResult } from "../../data/models/contract";
import { api, ApiError } from "../../data/repositories/product_repository";
import { isPreview } from "../../shared/state/app_state";
import { previewEntries } from "../../data/mock/mock_products";
import {
  saveToHistory,
  getFromHistory,
} from "../../data/repositories/history_repository";
export function useProduct(id: string) {
  const [state, setState] = useState<{
    data?: { product: Product; score: ScoreResult };
    error?: ApiError;
    id?: string;
    loading: boolean;
    storageError?: boolean;
  }>({ loading: true });
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const cached = isPreview ? await getFromHistory(id) : undefined;
        const result = isPreview
          ? (previewEntries.find((entry) => entry.product.id === id) ??
            (cached ? { status: "found" as const, ...cached } : undefined))
          : await api.lookup({ id });
        if (!result || result.status !== "found")
          throw new ApiError("not_found");
        let storageError = false;
        try {
          await saveToHistory(result);
        } catch {
          storageError = true;
        }
        if (active)
          setState({ id, data: result, loading: false, storageError });
      } catch (error) {
        if (error instanceof ApiError && error.code === "offline") {
          try {
            const cached = await getFromHistory(id);
            if (cached) {
              if (active) setState({ id, data: cached, loading: false });
              return;
            }
          } catch {}
        }
        if (active)
          setState({
            id,
            error:
              error instanceof ApiError
                ? error
                : new ApiError("upstream_failed"),
            loading: false,
          });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);
  return state.id === id ? state : { loading: true };
}
