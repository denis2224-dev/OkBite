import { AddProductRequest } from '../_shared/contract.ts';
import { postHandler } from '../_lib/post.ts';
import { addProduct } from './service.ts';

export const createHandler = (run = addProduct) => postHandler(AddProductRequest, run);
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
