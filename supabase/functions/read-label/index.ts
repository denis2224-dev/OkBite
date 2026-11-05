import { ReadLabelRequest } from '../_shared/contract.ts';
import { postHandler } from '../_lib/post.ts';
import { readLabel } from './service.ts';

export const createHandler = (run = readLabel) => postHandler(ReadLabelRequest, run);
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
