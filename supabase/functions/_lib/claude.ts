// Claude Messages API over raw HTTP, as planned in R3 D4/D5. Verified 2026-11-05 against
// https://platform.claude.com/docs/en/api/versioning (version 2026-10-21) and
// https://platform.claude.com/docs/en/build-with-claude/vision (base64 image blocks).
const API_URL = 'https://api.anthropic.com/v1/messages';
export const CLAUDE_MODEL = 'claude-haiku-5-5';
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504, 529]);
const ATTEMPTS = 3;
const TIMEOUT_MS = 20_000;
const MAX_IMAGES = 2;
const MAX_IMAGE_BASE64 = 2_000_000;

/** Claude could not give a usable answer. The message never contains the key or the provider's body. */
export class UpstreamError extends Error {}

export type ClaudeDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  apiKey?: string;
};

/** Sends JPEG images (base64, no data: prefix) and a prompt; returns Claude's text answer. */
export async function askClaude(
  images: string[],
  prompt: string,
  deps: ClaudeDeps = {},
): Promise<string> {
  const key = deps.apiKey ?? Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new UpstreamError('Claude is not configured');
  if (
    !images.length || images.length > MAX_IMAGES ||
    images.some((i) => !i || i.length > MAX_IMAGE_BASE64)
  ) throw new UpstreamError('Invalid images for Claude');
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 4000, // thinking is on by default on Haiku 5.5 and counts toward this cap
    output_config: { effort: 'low' }, // reading printed text; low effort keeps latency down
    messages: [{
      role: 'user',
      content: [
        ...images.map((data) => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data },
        })),
        { type: 'text', text: prompt },
      ],
    }],
  });
  for (let attempt = 1;; attempt++) {
    let res: Response | null = null;
    try {
      res = await doFetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2026-10-21',
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      res = null; // network failure or timeout: retried like a 5xx
    }
    if (res?.ok) return readText(await res.json().catch(() => null));
    await res?.body?.cancel();
    if ((res && !RETRYABLE.has(res.status)) || attempt >= ATTEMPTS) {
      console.warn(`Claude request failed: ${res ? `HTTP ${res.status}` : 'no response'}`);
      throw new UpstreamError('Claude request failed');
    }
    const after = Number(res?.headers.get('retry-after'));
    await sleep(
      Number.isFinite(after) && after > 0 ? Math.min(after, 5) * 1000 : 500 * 2 ** attempt,
    );
  }
}

function readText(message: unknown): string {
  const m = message as
    | { stop_reason?: string; content?: { type?: string; text?: string }[] }
    | null;
  if (!m || m.stop_reason !== 'end_turn' || !Array.isArray(m.content)) {
    throw new UpstreamError('Claude gave no complete answer'); // refusal, max_tokens or malformed
  }
  const text = m.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
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
