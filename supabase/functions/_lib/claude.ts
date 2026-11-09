// Vision model over TokenHarbor's OpenAI-compatible chat API (raw HTTP). Verified 2026-11-05
// against https://tokenharbor.ai/docs/api/curl (Bearer thk_live_ key) and
// https://tokenharbor.ai/docs/getting-started/quickstart (":free" ids cost nothing).
// The file keeps its Claude names so the identify and read-label callers stay unchanged.
const API_URL = 'https://tokenharbor.ai/v1/chat/completions';
export const CLAUDE_MODEL = 'deepseek-v4.1-flash:free'; // override with the AI_MODEL secret
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504, 529]);
const ATTEMPTS = 3;
const TIMEOUT_MS = 20_000;
// All attempts together; the app waits AI_DEADLINE_MS + 15 s (apps/mobile/src/lib/api.ts),
// so a server still retrying never outlives the shopper's request and gets queued twice.
export const AI_DEADLINE_MS = 40_000;
const MIN_ATTEMPT_MS = 10_000; // a shorter window is not worth another provider call
const MAX_IMAGES = 2;
const MAX_IMAGE_BASE64 = 2_000_000; // 1.5 MB stored JPEG after base64 encoding
const MAX_TOTAL_IMAGE_BASE64 = 3_800_000; // leave room for JSON within the 4 MB request cap

/** Claude could not give a usable answer. The message never contains the key or the provider's body. */
export class UpstreamError extends Error {}

export type ClaudeDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  apiKey?: string;
  fallbackKey?: string;
  model?: string;
};

export function validateProviderImages(images: string[]): void {
  if (
    !images.length || images.length > MAX_IMAGES ||
    images.some((image) => !image || image.length > MAX_IMAGE_BASE64) ||
    images.reduce((total, image) => total + image.length, 0) > MAX_TOTAL_IMAGE_BASE64
  ) throw new UpstreamError('Invalid images for Claude');
}

/** Sends JPEG images (base64, no data: prefix) and a prompt; returns Claude's text answer. */
export async function askClaude(
  images: string[],
  prompt: string,
  deps: ClaudeDeps = {},
): Promise<string> {
  const primaryKey = deps.apiKey ?? Deno.env.get('AI_API_KEY');
  if (!primaryKey) throw new UpstreamError('Claude is not configured');
  let key = primaryKey;
  // A second account's key, used once the first answers "quota used up" (402) or "rate limited" (429).
  const fallback = deps.fallbackKey ?? Deno.env.get('AI_API_KEY_FALLBACK');
  validateProviderImages(images);
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const body = JSON.stringify({
    model: deps.model ?? Deno.env.get('AI_MODEL') ?? CLAUDE_MODEL,
    max_tokens: 4000, // room for the model's reasoning before the JSON answer
    messages: [{
      role: 'user',
      content: [
        ...images.map((data) => ({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${data}` },
        })),
        { type: 'text', text: prompt },
      ],
    }],
  });
  const now = deps.now ?? Date.now;
  const deadline = now() + AI_DEADLINE_MS;
  for (let attempt = 1;; attempt++) {
    let res: Response | null = null;
    try {
      res = await doFetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body,
        signal: AbortSignal.timeout(Math.min(TIMEOUT_MS, Math.max(1, deadline - now()))),
      });
    } catch {
      res = null; // network failure or timeout: retried like a 5xx
    }
    if (res?.ok) return readText(await res.json().catch(() => null));
    await res?.body?.cancel();
    const fallbackKey = fallback !== primaryKey && (res?.status === 402 || res?.status === 429)
      ? fallback
      : undefined;
    if (
      attempt >= ATTEMPTS || key !== primaryKey ||
      (res && !fallbackKey && !RETRYABLE.has(res.status))
    ) {
      console.warn(`Claude request failed: ${res ? `HTTP ${res.status}` : 'no response'}`);
      throw new UpstreamError('Claude request failed');
    }
    const after = Number(res?.headers.get('retry-after'));
    const backoff = Number.isFinite(after) && after > 0
      ? Math.min(after, 5) * 1000
      : 500 * 2 ** attempt;
    const wait = fallbackKey ? 0 : backoff;
    if (deadline - now() - wait < MIN_ATTEMPT_MS) {
      console.warn('Claude request failed: deadline reached');
      throw new UpstreamError('Claude request failed');
    }
    if (fallbackKey) {
      console.warn(`Claude request failed: HTTP ${res?.status}, switching to the fallback key`);
      key = fallbackKey;
    } else {
      await sleep(wait);
    }
  }
}

function readText(message: unknown): string {
  const choice = (message as
    | { choices?: { finish_reason?: string; message?: { content?: unknown } }[] }
    | null)?.choices?.[0];
  if (choice?.finish_reason !== 'stop' || typeof choice.message?.content !== 'string') {
    throw new UpstreamError('Claude gave no complete answer'); // filtered, length cut or malformed
  }
  const text = choice.message.content.trim();
  if (!text) throw new UpstreamError('Claude gave an empty answer');
  return text;
}

/** The JSON object in a model answer, with or without ``` fences; anything else is an UpstreamError. */
export function parseJsonObject(raw: string): Record<string, unknown> {
  const fenced = raw.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  try {
    const value: unknown = JSON.parse(fenced ? fenced[1] : raw.trim());
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // reported below
  }
  throw new UpstreamError('Claude answer is not a JSON object');
}

/** Standard base64 of bytes, in chunks so large photos do not overflow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}
