import type { ZodType } from 'npm:zod@3.23.8';
import { ErrorBody, type ErrorCode, Uuid } from '../_shared/contract.ts';
import { adminClient } from './client.ts';
export { adminClient } from './client.ts';

export type UsageKind =
  | 'photo'
  | 'barcode'
  | 'identified'
  | 'not_found'
  | 'read_label'
  | 'added'
  | 'report';
export class HttpError extends Error {
  constructor(
    public status: number,
    message = 'Cerere invalidă.',
    public error: ErrorCode = 'bad_request',
  ) {
    super(message);
  }
}
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
export function fail(error: ErrorCode, message: string, status: number): Response {
  return json(ErrorBody.parse({ error, message }), status);
}
const allowedHeaders = ['content-type', 'x-device-id', 'authorization', 'apikey', 'x-client-info'];
const exactOrigins = [
  'https://okbite.md',
  'https://okbite.app',
  'https://www.okbite.app',
  'https://okbite-ir1.pages.dev',
  'http://localhost:8081',
];
function allowedOrigin(origin: string): boolean {
  return exactOrigins.includes(origin) ||
    /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.okbite-ir1\.pages\.dev$/.test(origin);
}
export function withCors(req: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.append('vary', 'Origin');
  const origin = req.headers.get('origin');
  if (origin && allowedOrigin(origin)) headers.set('access-control-allow-origin', origin);
  return new Response(response.body, { status: response.status, headers });
}
export function cors(req: Request): Response | null {
  const origin = req.headers.get('origin');
  if (origin && !allowedOrigin(origin)) {
    return withCors(req, fail('bad_request', 'Origine nepermisă.', 403));
  }
  if (req.method !== 'OPTIONS') return null;
  const method = req.headers.get('access-control-request-method');
  const requested = (req.headers.get('access-control-request-headers') ?? '')
    .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (
    (method && !['GET', 'POST'].includes(method)) ||
    requested.some((h) => !allowedHeaders.includes(h))
  ) {
    return withCors(req, fail('bad_request', 'Cerere preflight invalidă.', 400));
  }
  return withCors(
    req,
    new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': allowedHeaders.join(', '),
        'access-control-max-age': '600',
        vary: 'Access-Control-Request-Method, Access-Control-Request-Headers',
      },
    }),
  );
}
export function readDeviceId(req: Request): string {
  const parsed = Uuid.safeParse(req.headers.get('x-device-id'));
  if (!parsed.success) throw new HttpError(400);
  return parsed.data.toLowerCase();
}
export async function readJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
  maxBytes = 2_000_000,
): Promise<T> {
  if (Number(req.headers.get('content-length')) > maxBytes) throw new HttpError(400);
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400);
  let size = 0;
  let text = '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(400);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const result = schema.safeParse(JSON.parse(text));
    if (!result.success) throw new HttpError(400);
    return result.data;
  } catch {
    throw new HttpError(400);
  } finally {
    reader.releaseLock();
  }
}
// C3 is count-only. C6/D4/D5 need atomic admission before enforcing write quotas.
export async function checkRateLimit(
  deviceId: string,
  kind: UsageKind,
  max: number,
): Promise<boolean> {
  const { count, error } = await adminClient().from('usage_events').select('id', {
    count: 'exact',
    head: true,
  })
    .eq('device_id', Uuid.parse(deviceId).toLowerCase()).eq('kind', kind)
    .gte('created_at', new Date(Date.now() - 86_400_000).toISOString());
  if (error || count === null) throw new Error('Usage count failed');
  return count < max;
}
export async function logEvent(
  kind: UsageKind,
  deviceId: string,
  productId?: string,
): Promise<void> {
  const { error } = await adminClient().from('usage_events').insert({
    kind,
    device_id: Uuid.parse(deviceId).toLowerCase(),
    product_id: productId ? Uuid.parse(productId) : null,
  });
  if (error) throw new Error('Usage event failed');
}
