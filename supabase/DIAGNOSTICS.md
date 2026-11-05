# D7 backend integration

R2 provides the backend requested by R1 PR #42. Merge #40 → #41 → #42,
then this backend follow-up. No app-shell installation is included.

`POST /functions/v1/client-error` uses the public API key and `x-device-id`.
The canonical schemas are `ClientErrorRequest` and `ClientErrorResponse` from
`@okbite/shared` (generated contract for Deno). The acknowledgement is
`{ status: 'ok' }`; errors use `ErrorBody`. R1 should import these shared schemas
in its endpoint/reporter when reconciling #42; the existing endpoint validation
has the same bounds and is tested against these schemas through the real gateway.

The request is strict: message 1–1000 characters, nullable stack up to 2000,
screen up to 200 with no query/fragment, appVersion 1–50, and platform
`ios | android | web`. Device identity comes from the validated header, never
from an extra request field. Existing HTTP body bounds and CORS still apply.

`record_client_error(p_device uuid,p_message text,p_stack text,p_screen text,
p_app_version text,p_platform text) returns boolean` is service-role-only.
It validates the fields, stores the canonical device UUID, serializes admissions
per device using a transaction advisory lock, and admits at most 50 diagnostics
in the trailing 24 hours. It returns false without inserting at the limit.
Its device/time index supports the count. Shoppers and ordinary signed-in users
cannot call the RPC or read diagnostics. No separate usage event is written.

Local evidence (disposable project `okbite-r2-review`, API 59431/DB 59432):

- The missing RPC and schemas were observed failing before implementation.
- Shared-schema bounds, strict fields and acknowledgement test passes.
- Nine new pgTAP assertions pass; combined database total is 96.
- Real integration: with 49 existing diagnostics, six simultaneous calls admit
  exactly one. The next gateway call returns 429; aged-out rows permit a 200.
  Callback fragments return 400 without insertion; CORS is retained; anon RPC
  execution and table reads are denied. All UUID fixtures are removed.

Run `pnpm sync-shared` after contract changes. Apply the migration and run
`supabase test db`, then configure all three local server-only SUPABASE_*
variables and execute `_lib/client-error.integration.test.ts` while functions
are served. Never load a service key into the app. This is local DB/gateway
acceptance; app-shell/native/browser/provider/staging acceptance and independent
Claude/human review remain separate owner gates.
