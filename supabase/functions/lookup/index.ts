import { z } from 'npm:zod@3.23.8';
import { Code, LookupResponse, Uuid } from '../_shared/contract.ts';
import { normalizeCode } from '../_shared/ean/index.ts';
import { loadProduct } from '../_lib/db.ts';
import { cors, fail, HttpError, json, logEvent, readDeviceId, withCors } from '../_lib/http.ts';
import { adminClient } from '../_lib/client.ts';
import { offFallback, supabaseOffStore } from '../_lib/off.ts';

const querySchema = z.union([z.object({ id: Uuid }).strict(), z.object({ code: Code }).strict()]);
const defaults = {
  loadProduct,
  logEvent,
  async offFallback(code: string): Promise<boolean> {
    let db;
    try {
      db = adminClient();
    } catch {
      return false; // Without the service role nothing could be saved, so skip OFF.
    }
    return await offFallback(code, { fetch, store: supabaseOffStore(db) });
  },
};
export function createHandler(overrides: Partial<typeof defaults> = {}) {
  const deps = { ...defaults, ...overrides };
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
        if ('code' in parsed.data && !normalizeCode(parsed.data.code)) throw new HttpError(400);
        let result = await deps.loadProduct(parsed.data);
        // offFallback never throws; a saved OFF product is then read like any other.
        if (!result && 'code' in parsed.data && (await deps.offFallback(parsed.data.code))) {
          // The OFF path must never produce a 502.
          result = await deps.loadProduct(parsed.data).catch(() => null);
        }
        const body = LookupResponse.parse(
          result ? { status: 'found', ...result } : { status: 'not_found' },
        );
        try {
          if (!result) await deps.logEvent('not_found', device);
          else if ('code' in parsed.data) await deps.logEvent('barcode', device, result.product.id);
        } catch {
          // Analytics is optional; product availability must not depend on it.
          console.warn('Lookup analytics unavailable');
        }
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
