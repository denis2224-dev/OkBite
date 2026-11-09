import { z } from 'zod';
import { ErrorBody } from '@okbite/shared';
import { ApiError } from '../../lib/api';
import { getDeviceId } from '../../lib/device';

// shortcut: temporary U1 transport shim until Denis's U1 contract PR merges into @okbite/shared;
// then switch to the shared api client and delete this file.
export async function requestUnknownFlow<Input, Output>(
  name: 'read-label' | 'add-product' | 'enrich-product',
  inputSchema: z.ZodType<Input>, outputSchema: z.ZodType<Output>, payload: unknown,
): Promise<Output> {
  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) throw new ApiError('bad_request');
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new ApiError('configuration');
  const body = JSON.stringify(parsed.data);
  const bytes = typeof TextEncoder === 'undefined' ? encodeURIComponent(body).replace(/%[A-F\d]{2}/g, 'U').length : new TextEncoder().encode(body).length;
  if (bytes > 2_000_000) throw new ApiError('bad_request');
  try {
    const response = await fetch(base + '/functions/v1/' + name, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-device-id': await getDeviceId(), apikey: key, Authorization: 'Bearer ' + key }, body,
    });
    let json: unknown;
    try { json = await response.json(); } catch { throw new ApiError('invalid_response'); }
    if (!response.ok) {
      const failure = ErrorBody.safeParse(json);
      throw new ApiError(failure.success ? failure.data.error : 'upstream_failed');
    }
    const result = outputSchema.safeParse(json);
    if (!result.success) throw new ApiError('invalid_response');
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('offline');
  }
  // No automatic retry or abort: an unanswered request may still be processing.
}
