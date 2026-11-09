import { ClientErrorRequest, ClientErrorResponse } from '../_shared/contract.ts';
import { adminClient, cors, fail, HttpError, json, readDeviceId, readJsonBody, withCors } from '../_lib/http.ts';
import { redactDiagnostic } from './redact.ts';

type RecordError = (device: string, report: ClientErrorRequest) => Promise<boolean>;

async function recordError(device: string, report: ClientErrorRequest): Promise<boolean> {
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
      const parsed = await readJsonBody(req, ClientErrorRequest, 16_000);
      const report = ClientErrorRequest.parse({ ...parsed,
        message: redactDiagnostic(parsed.message).slice(0, 1000),
        stack: parsed.stack === null ? null : redactDiagnostic(parsed.stack).slice(0, 2000),
        screen: redactDiagnostic(parsed.screen).slice(0, 200), appVersion: redactDiagnostic(parsed.appVersion).slice(0, 50),
      });
      response = await record(device, report) ? json(ClientErrorResponse.parse({ status: 'ok' })) :
        fail('rate_limited', 'Prea multe cereri. Încearcă mâine.', 429);
    } catch (error) {
      response = error instanceof HttpError ? fail(error.error, error.message, error.status) :
        fail('upstream_failed', 'Serviciul nu este disponibil.', 502);
    }
    return withCors(req, response);
  };
}
if (import.meta.main) Deno.serve(createHandler());
