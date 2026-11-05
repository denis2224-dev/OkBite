import { IdentifyRequest } from '../_shared/contract.ts';
import { postHandler } from '../_lib/post.ts';
import { identify } from './service.ts';

export const createHandler = (run = identify) => postHandler(IdentifyRequest, run);
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
