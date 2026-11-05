import {
  IdentifyResponse,
  normalizeCode,
  type Candidate,
  type FrontRead,
} from '@okbite/shared';

/**
 * Navigation contract between capture/scan (B2), identify (B3) and add (B7).
 * - `source: 'photo'` carries a real IdentifyResponse (never `found`) as JSON in `payload`.
 * - `source: 'code'` means a barcode lookup returned not_found: there is no photo and no photoPath.
 */
export type IdentifyPayload = Exclude<IdentifyResponse, { status: 'found' }>;

export type AddRouteParams = {
  code?: string;
  brand?: string;
  name?: string;
  quantity?: string;
  photoPath?: string;
};

export type AddInitialValues = {
  code: string | null;
  brand: string | null;
  name: string | null;
  quantity: string | null;
  photoPath: string | null;
};

export type IdentifyRouteState =
  | { kind: 'confirm'; candidate: Candidate; read: FrontRead; photoPath: string }
  | { kind: 'candidates'; candidates: Candidate[]; read: FrontRead; photoPath: string }
  | { kind: 'not_found'; read: FrontRead; photoPath: string | null; fromCode: boolean }
  | { kind: 'invalid' };

const CONFIDENT_SIMILARITY = 0.6;

export const productRoute = (id: string) => `/product/${id}` as const;

export const identifyPhotoRoute = (response: IdentifyPayload) =>
  ({ pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(response) } }) as const;

export const identifyCodeRoute = (code: string) =>
  ({ pathname: '/identify', params: { source: 'code', code } }) as const;

function cleanParam(val: string | string[] | undefined): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  return trimmed;
}

/**
 * Builds the `/add` route for B7 from the extracted FrontRead and optional uploaded photoPath.
 * Absent/null fields are omitted so Expo Router never serializes "null" or "undefined".
 */
export function addProductRoute({
  read,
  photoPath,
}: {
  read: FrontRead;
  photoPath: string | null;
}): { pathname: '/add'; params: AddRouteParams } {
  const params: AddRouteParams = {};
  const code = read.code ? normalizeCode(read.code) : null;
  const brand = cleanParam(read.brand ?? undefined);
  const name = cleanParam(read.name ?? undefined);
  const quantity = cleanParam(read.quantity ?? undefined);
  const cleanPhoto = cleanParam(photoPath ?? undefined);

  if (code) params.code = code;
  if (brand) params.brand = brand;
  if (name) params.name = name;
  if (quantity) params.quantity = quantity;
  if (cleanPhoto) params.photoPath = cleanPhoto;
  return { pathname: '/add', params };
}

/** Parses `/add` route params in B7, keeping an absent photoPath as `null`. */
export function parseAddParams(
  raw: Record<string, string | string[] | undefined>,
): AddInitialValues {
  const rawCode = cleanParam(raw.code);
  return {
    code: rawCode ? normalizeCode(rawCode) : null,
    brand: cleanParam(raw.brand),
    name: cleanParam(raw.name),
    quantity: cleanParam(raw.quantity),
    photoPath: cleanParam(raw.photoPath),
  };
}

/** Safely validates incoming `/identify` route params from B2 without throwing or inventing data. */
export function parseIdentifyParams(
  raw: Record<string, string | string[] | undefined>,
): IdentifyRouteState {
  const source = cleanParam(raw.source);
  if (source === 'code') {
    const rawCode = cleanParam(raw.code);
    const code = rawCode ? normalizeCode(rawCode) : null;
    if (!code) return { kind: 'invalid' };
    return {
      kind: 'not_found',
      read: { brand: null, name: null, quantity: null, code },
      photoPath: null,
      fromCode: true,
    };
  }
  if (source === 'photo') {
    const payload = cleanParam(raw.payload);
    if (!payload) return { kind: 'invalid' };
    try {
      const parsed = IdentifyResponse.safeParse(JSON.parse(payload));
      if (!parsed.success || parsed.data.status === 'found') return { kind: 'invalid' };
      const data = parsed.data;
      const photoPath = cleanParam(data.photoPath);
      if (!photoPath) return { kind: 'invalid' };
      if (data.status === 'not_found') {
        return { kind: 'not_found', read: data.read, photoPath, fromCode: false };
      }
      const firstCandidate = data.candidates[0];
      if (data.candidates.length === 1 && firstCandidate && firstCandidate.similarity >= CONFIDENT_SIMILARITY) {
        return {
          kind: 'confirm',
          candidate: firstCandidate,
          read: data.read,
          photoPath,
        };
      }
      return {
        kind: 'candidates',
        candidates: data.candidates,
        read: data.read,
        photoPath,
      };
    } catch {
      return { kind: 'invalid' };
    }
  }
  return { kind: 'invalid' };
}
