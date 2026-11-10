import { AddProductRequest } from '../_shared/contract.ts';
import { postHandler } from '../_lib/post.ts';
import { addProduct } from './service.ts';

// A shopper may skip the category (U1); it is then saved under the 'necunoscut' fallback category.
export const createHandler = (run = addProduct) =>
  postHandler(
    AddProductRequest,
    (input, device) => run({ ...input, categorySlug: input.categorySlug ?? 'necunoscut' }, device),
  );
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
