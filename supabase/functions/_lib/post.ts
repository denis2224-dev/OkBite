import type { ZodType } from 'npm:zod@3.23.8';
import { cors, fail, HttpError, json, readDeviceId, readJsonBody, withCors } from './http.ts';

export function postHandler<T>(
  schema: ZodType<T>,
  run: (body: T, device: string) => Promise<unknown>,
) {
  return async (req: Request): Promise<Response> => {
    const preflight = cors(req);
    if (preflight) return preflight;
    let response: Response;
    try {
      if (req.method !== 'POST') {
        response = fail('bad_request', 'Metodă nepermisă.', 405);
        response.headers.set('allow', 'POST, OPTIONS');
      } else {
        const device = readDeviceId(req);
        const body = await readJsonBody(req, schema);
        response = json(await run(body, device));
      }
    } catch (error) {
      response = error instanceof HttpError
        ? fail(error.error, error.message, error.status)
        : fail('upstream_failed', 'Serviciul nu este disponibil momentan.', 502);
    }
    return withCors(req, response);
  };
}
