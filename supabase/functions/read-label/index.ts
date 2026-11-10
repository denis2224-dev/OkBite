import { z } from 'npm:zod@3.23.8';
import { EnrichReadLabelRequest, ReadLabelRequest } from '../_shared/contract.ts';
import { postHandler } from '../_lib/post.ts';
import { readLabel } from './service.ts';

export const createHandler = (run = readLabel) =>
  postHandler(z.union([EnrichReadLabelRequest, ReadLabelRequest]), run);
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
