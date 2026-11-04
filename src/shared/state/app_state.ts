import { useSyncExternalStore } from "react";
import { previewEntries, demoHistory } from "../../data/mock/mock_products";
import type { Product, ScoreResult } from "../../data/models/contract";
export const isPreview =
  process.env.EXPO_PUBLIC_PREVIEW === "1" ||
  !process.env.EXPO_PUBLIC_SUPABASE_URL;
export type DemoEntry = { product: Product; score: ScoreResult };
export type DemoHistoryEntry = DemoEntry & { time: string; savedAt: string };
type DemoState = {
  offline: boolean;
  camDenied: boolean;
  ocrUnclear: boolean;
  history: DemoHistoryEntry[];
  products: Record<string, DemoEntry>;
  pendingTables: string[];
  lastCode: string;
};
const initialHistory = () =>
  demoHistory.map((item) => ({
    ...previewEntries.find((e) => e.product.id === item.id)!,
    time: item.time,
    savedAt: "2026-11-03T14:32:00.000Z",
  }));
const initial = (): DemoState => ({
  offline: false,
  camDenied: false,
  ocrUnclear: false,
  history: initialHistory(),
  products: Object.fromEntries(
    previewEntries.map((entry) => [entry.product.id, entry]),
  ),
  pendingTables: [],
  lastCode: "",
});
let state = initial();
const listeners = new Set<() => void>();
export const getDemoState = () => state;
export function subscribeDemo(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function update(patch: Partial<DemoState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
export function useDemoState() {
  return useSyncExternalStore(subscribeDemo, getDemoState, getDemoState);
}
export const demoActions = {
  setFlag(key: "offline" | "camDenied" | "ocrUnclear", value: boolean) {
    update({ [key]: value });
  },
  setCode(code: string) {
    update({ lastCode: code });
  },
  addHistory(entry: DemoEntry) {
    update({
      products: { ...state.products, [entry.product.id]: entry },
      history: [
        { ...entry, time: "Acum", savedAt: new Date().toISOString() },
        ...state.history.filter((row) => row.product.id !== entry.product.id),
      ],
    });
  },
  removeHistory(id: string) {
    update({ history: state.history.filter((row) => row.product.id !== id) });
  },
  clearHistory() {
    update({ history: [] });
  },
  restoreHistory() {
    update({ history: initialHistory() });
  },
  markPending(id: string) {
    update({ pendingTables: [...new Set([...state.pendingTables, id])] });
  },
  reset() {
    state = initial();
    listeners.forEach((listener) => listener());
  },
};
export function resolveDemoCode(code: string, online = false) {
  demoActions.setCode(code);
  if (online) demoActions.setFlag("offline", false);
  const entry = previewEntries.find(
    (item) =>
      item.product.code === code &&
      ["4840001000017", "4840001000024", "4840001000055"].includes(code),
  );
  if (state.offline) {
    const cached = state.history.find((row) => row.product.code === code);
    if (cached) return { screen: "result" as const, entry: cached };
    return { screen: "offline" as const, entry: undefined };
  }
  return entry
    ? { screen: "confirm" as const, entry }
    : { screen: "notFound" as const, entry: undefined };
}
