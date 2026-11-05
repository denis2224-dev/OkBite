import { z } from 'npm:zod@3.23.8';
import { adminClient, cors, fail, HttpError, json, readDeviceId, readJsonBody, withCors } from '../_lib/http.ts';

const ClientError = z.object({
  message: z.string().min(1).max(1000), stack: z.string().max(2000).nullable(),
  screen: z.string().max(200).refine(value => !/[?#]/.test(value)),
  appVersion: z.string().min(1).max(50), platform: z.enum(['ios', 'android', 'web']),
}).strict();
type Report = z.infer<typeof ClientError>;
type RecordError = (device: string, report: Report) => Promise<boolean>;

async function recordError(device: string, report: Report): Promise<boolean> {
  const { data, error } = await adminClient().rpc('record_client_error', {
    p_device: device, p_message: report.message, p_stack: report.stack,
    p_screen: report.screen, p_app_version: report.appVersion, p_platform: report.platform,
  });
  if (error || typeof data !== 'boolean') throw new Error('Client error storage unavailable');
  return data;
}

export function createHandler(record: RecordError = recordError) {
  return async (req: Request): Promise<Response> => {
    const preflight = cors(req);
    if (preflight) return preflight;
    let response: Response;
    try {
      if (req.method !== 'POST') throw new HttpError(405);
      const device = readDeviceId(req);
      const report = await readJsonBody(req, ClientError, 16_000);
      response = await record(device, report) ? json({ status: 'ok' }) :
        fail('rate_limited', 'Prea multe cereri. Încearcă mâine.', 429);
    } catch (error) {
      response = error instanceof HttpError ? fail(error.error, error.message, error.status) :
        fail('upstream_failed', 'Serviciul nu este disponibil.', 502);
    }
    return withCors(req, response);
  };
}
if (import.meta.main) Deno.serve(createHandler());
