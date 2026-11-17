import { TopProductsQuery, TopProductsResponse } from '../_shared/contract.ts';
import { anonClient } from '../_lib/client.ts';
import { cors, fail, HttpError, json, withCors } from '../_lib/http.ts';
import { loadShelfCandidates } from './service.ts';

const defaults = {
  loadShelfCandidates(category: string, limit: number) {
    return loadShelfCandidates(category, limit, anonClient());
  },
};

function parseQuery(url: string): TopProductsQuery {
  const params = new URL(url).searchParams;
  const query = Object.fromEntries(params);
  if (params.size !== Object.keys(query).length) throw new HttpError(400);

  const { limit, ...rest } = query;
  const parsed = TopProductsQuery.safeParse({
    ...rest,
    limit: limit !== undefined && /^[0-9]+$/.test(limit) ? Number(limit) : limit,
  });
  if (!parsed.success) throw new HttpError(400);
  return parsed.data;
}

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
        const { category, limit } = parseQuery(req.url);
        const products = await deps.loadShelfCandidates(category, limit);
        response = json(
          TopProductsResponse.parse({ category, products: products.slice(0, limit) }),
        );
        response.headers.set('cache-control', 'max-age=180');
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
