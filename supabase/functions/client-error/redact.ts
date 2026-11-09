// Best-effort credential removal, not a guarantee that arbitrary prose is anonymous.
// Apply at ingestion: callers can bypass the app's screen/query filtering.
export function redactDiagnostic(value: string): string {
  return value
    .replace(/https?:\/\/[^\s<>"']+/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch { return '[url]'; }
    })
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:access_token|refresh_token|api_key|apikey|password|secret)\s*[=:]\s*[^\s&,;]+/gi, '[credential]')
    .replace(/\b(?:sb_secret_|sb_publishable_|sk-ant-|sk-|thk_live_)[A-Za-z0-9_-]+/g, '[key]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}
