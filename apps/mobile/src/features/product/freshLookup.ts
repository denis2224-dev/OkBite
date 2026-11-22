import type { Product, ScoreResult } from '@okbite/shared';

type Found = { product: Product; score: ScoreResult };
type LookupHandoff = { found: Found; historySave?: Promise<void> };

// The scan's own lookup answer, so the product page renders without asking the server again.
// Used once: a later visit to the same id (after adding nutrition, say) must fetch the current product.
let latest: LookupHandoff | undefined;

export function rememberLookup(found: Found, historySave?: Promise<void>) {
  latest = { found, historySave };
}
export const freshLookup = (id: string): Found | undefined => latest?.found.product.id === id ? latest.found : undefined;

export function takeFreshLookup(id: string): LookupHandoff | undefined {
  if (latest?.found.product.id !== id) return undefined;
  const handoff = latest;
  latest = undefined;
  return handoff;
}

export const forgetLookup = (id: string) => { takeFreshLookup(id); };
