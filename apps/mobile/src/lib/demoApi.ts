import {
  type AddProductRequest,
  computeScore,
  type IdentifyResponse,
  type LookupResponse,
  type ReadLabelResponse,
} from '@okbite/shared';
import { previewEntries } from '../test/fixtures';

// Demo mode only (EXPO_PUBLIC_PREVIEW=1, refused in production builds): the sample products
// the home screen shows stand in for the backend, so every screen can be tried without one.
type Found = Extract<LookupResponse, { status: 'found' }>;
const entries: Found[] = [...previewEntries];
let next = 0;
export const demoApi = {
  lookup(by: { code: string } | { id: string }): LookupResponse {
    const hit = entries.find((e) => ('id' in by ? e.product.id === by.id : e.product.code === by.code));
    return hit ?? { status: 'not_found' };
  },
  identify(): IdentifyResponse {
    const hit = previewEntries[next++ % previewEntries.length]!; // each photo shows the next sample
    return { ...hit, photoPath: 'demo/front.jpg' };
  },
  readLabel(withNutrition: boolean): ReadLabelResponse {
    const { product } = previewEntries[0]!;
    return {
      ingredientsText: product.ingredientsText, unit: product.unit, nutrients: product.nutrients, unclear: [],
      ingredientsPhotoPath: 'demo/ingredients.jpg', nutritionPhotoPath: withNutrition ? 'demo/nutrition.jpg' : null,
    };
  },
  addProduct(req: AddProductRequest): LookupResponse {
    const base = previewEntries[0]!.product;
    const category = entries.find((e) => e.product.category.slug === req.categorySlug)?.product.category ?? base.category;
    const id = `0de30000-0000-4000-8000-${String(entries.length).padStart(12, '0')}`;
    const product = {
      ...base, id, code: req.code, status: 'unverified' as const, name: req.name, brand: req.brand,
      quantity: req.quantity, unit: req.unit, category, nutrients: req.nutrients,
      ingredientsText: req.ingredientsText, imageUrl: null, labelImageUrl: null,
    };
    const added: Found = { status: 'found', product, score: computeScore(req.nutrients, category.scoreKind, req.ingredientsText) };
    entries.push(added); // later lookups (product screen, history) find it this session
    return added;
  },
};
