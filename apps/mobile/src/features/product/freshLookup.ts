import type { Product, ScoreResult } from '@okbite/shared';

type Found = { product: Product; score: ScoreResult };

// The scan's own lookup answer, so the product page renders without asking the server again.
// Used once: a later visit to the same id (after adding nutrition, say) must fetch the current product.
let latest: Found | undefined;

export const rememberLookup = (found: Found) => { latest = found; };
export const freshLookup = (id: string): Found | undefined => (latest?.product.id === id ? latest : undefined);
export const forgetLookup = (id: string) => { if (latest?.product.id === id) latest = undefined; };
