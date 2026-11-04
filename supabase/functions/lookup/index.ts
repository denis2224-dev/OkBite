import { z } from 'npm:zod@3.23.8';
import { Code, LookupResponse, Uuid } from '../_shared/contract.ts';
import { loadProduct } from '../_lib/db.ts';
import { cors, fail, HttpError, json, logEvent, readDeviceId, withCors } from '../_lib/http.ts';

const querySchema = z.union([z.object({ id: Uuid }).strict(), z.object({ code: Code }).strict()]);
export function createHandler(deps = { loadProduct, logEvent }) {
  return async (req: Request): Promise<Response> => {
    const preflight = cors(req);
    if (preflight) return preflight;
    let response: Response;
    try {
      if (req.method !== 'GET') {
        response = fail('bad_request', 'Metodă nepermisă.', 405);
        response.headers.set('allow', 'GET, OPTIONS');
      } else {
        const device = readDeviceId(req);
        const params = new URL(req.url).searchParams;
        const parsed = querySchema.safeParse(Object.fromEntries(params));
        if (params.size !== 1 || !parsed.success) throw new HttpError(400);
        const result = await deps.loadProduct(parsed.data);
        const body = LookupResponse.parse(
          result ? { status: 'found', ...result } : { status: 'not_found' },
        );
        if (!result) await deps.logEvent('not_found', device);
        else if ('code' in parsed.data) await deps.logEvent('barcode', device, result.product.id);
        response = json(body);
      }
    } catch (error) {
      response = error instanceof HttpError
        ? fail(error.error, error.message, error.status)
        : fail('upstream_failed', 'Serviciul nu este disponibil momentan.', 502);
    }
    return withCors(req, response);
  };
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
