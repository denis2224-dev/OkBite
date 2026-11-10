import { EnrichProductRequest, LookupResponse } from '../_shared/contract.ts';
import { postHandler } from '../_lib/post.ts';
import { enrichProduct } from './service.ts';

export const createHandler = (run = enrichProduct) => postHandler(
  EnrichProductRequest, async (input, device) => LookupResponse.parse(await run(input, device)),
);
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
