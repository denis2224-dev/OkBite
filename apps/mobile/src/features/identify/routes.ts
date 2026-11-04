import type { IdentifyResponse } from '@okbite/shared';

/**
 * Navigation contract between the capture/scan screens (B2) and the identify screen (B3).
 * `source: 'photo'` carries a real IdentifyResponse (never `found`) as JSON in `payload`.
 * `source: 'code'` means a barcode lookup returned not_found: there is no photo and no photoPath.
 */
export type IdentifyPayload = Exclude<IdentifyResponse, { status: 'found' }>;

export const productRoute = (id: string) => `/product/${id}` as const;

export const identifyPhotoRoute = (response: IdentifyPayload) =>
  ({ pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(response) } }) as const;

export const identifyCodeRoute = (code: string) => ({ pathname: '/identify', params: { source: 'code', code } }) as const;

