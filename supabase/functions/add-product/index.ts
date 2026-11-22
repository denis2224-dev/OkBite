import { AddProductRequest, WATER_FIELD_KEYS } from '../_shared/contract.ts';
import { HttpError } from '../_lib/http.ts';
import { postHandler } from '../_lib/post.ts';
import { addProduct } from './service.ts';

// A shopper may skip the category (U1); it is then saved under the 'necunoscut' fallback category.
export const createHandler = (run = addProduct) =>
  postHandler(
    AddProductRequest,
    (input, device) => {
      const categorySlug = input.categorySlug ?? (input.water ? 'apa' : 'necunoscut');
      if ((categorySlug === 'apa' && input.unit !== 'ml') ||
        (categorySlug !== 'apa' && (input.water || !input.ingredientsText.trim()))) {
        throw new HttpError(400);
      }
      const water = input.water;
      if (!water) return run({ ...input, categorySlug }, device);

      const evidence = Object.fromEntries(WATER_FIELD_KEYS
        .filter(key => water[key] !== null)
        .map(key => [key, { status: 'unverified' as const, source: 'Fotografie utilizator' }]));
      return run({ ...input, categorySlug, water: { ...water, evidence } }, device);
    },
  );
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
