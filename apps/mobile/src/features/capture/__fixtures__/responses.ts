// Complete responses that satisfy the C1 schemas (@okbite/shared). Tests assert this, so a contract change fails loudly.
import type { IdentifyResponse, LookupResponse } from '@okbite/shared';

export const PRODUCT_ID = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f';
export const CODE = '4840001000014';

const product = {
  id: PRODUCT_ID, code: CODE, status: 'verified' as const,
  name: 'Iaurt cu căpșuni 2%', brand: 'Zorel', quantity: '400 g',
  category: { slug: 'iaurturi', name: 'Iaurturi', scoreKind: 'general' as const },
  unit: 'g' as const, portion: { amount: 125, label: '1 borcan' },
  nutrients: { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: 0, fruitVegPct: null },
  ingredientsText: 'lapte, căpșuni, zahăr', ingredients: [],
  allergens: ['Lapte' as const], mayContain: [], imageUrl: null, labelImageUrl: null,
  source: 'Eticheta produsului', addedAt: '2026-11-01', verifiedAt: '2026-11-02',
};
const score = { score: 78, letter: 'A' as const, grade: 'good' as const, reasons: [], missing: [] };
const read = { brand: 'Zorel', name: 'Iaurt cu căpșuni', quantity: '400 g', code: null };

export const lookupFound: LookupResponse = { status: 'found', product, score };
export const lookupNotFound: LookupResponse = { status: 'not_found' };
export const identifyFound: IdentifyResponse = { status: 'found', product, score, photoPath: 'uploads/dev/a.jpg' };
export const identifyCandidates: IdentifyResponse = {
  status: 'candidates', photoPath: 'uploads/dev/a.jpg', read,
  candidates: [{ id: PRODUCT_ID, name: product.name, brand: 'Zorel', quantity: '400 g', imageUrl: null, similarity: 0.71 }],
};
export const identifyNotFound: IdentifyResponse = { status: 'not_found', photoPath: 'uploads/dev/a.jpg', read };

