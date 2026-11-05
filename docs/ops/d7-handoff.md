# D7 integration request

R1 implements bounded, best-effort native/browser reporting, 60-second
deduplication, an endpoint with strict validation and operator stats queries.
The reporter preserves the previous native fatal handler and browser defaults.
Screen query strings and callback fragments are excluded. It is not installed
in the app shell yet; live quota/storage acceptance is not complete.

## R2: atomic quota and function configuration

Provide the service-role-only RPC:

`record_client_error(p_device uuid, p_message text, p_stack text,
p_screen text, p_app_version text, p_platform text) returns boolean`.

Serialize per-device admission in the transaction. Count `client_errors`
in the trailing 24 hours; return false at 50 without inserting, otherwise
insert the bounded fields and canonical UUID and return true. Grant execution
only to service_role, use an empty search_path and qualify tables. Index
device/time. Test simultaneous admission at 49: exactly one succeeds;
test quota rollover and public/anon/authenticated access denial.
Configure `[functions.client-error] verify_jwt = false` as for the existing
device-based endpoints; the app sends its public key and x-device-id.
R1 has not edited the R2-owned migrations, config or shared contract.

## R4: app-shell wiring after endpoint acceptance

Import `installErrorReporter` and `setErrorScreen` from `src/lib/errorReporter`.
Install once in the root layout's mount effect. Feed `usePathname()` to
`setErrorScreen` when the route changes, before crashes occur. These exports
are identical on native and web. Review this shell wiring with R4.

## Verification still required

After R2's RPC/config merge, exercise the real endpoint against isolated
DB/gateway and verify 50/day, concurrency, private diagnostics and CORS.
Then test native fatal/nonfatal errors, browser errors/rejections and route
metadata on the development clients and browser preview. Do not count the
injected-store unit tests as a real database or staging result.

Codex technical review found no blocking issue in this R1 slice. Deferred
minor: control-character-heavy diagnostics can JSON-escape beyond the 16 KB
request budget and be dropped; no endpoint quota/schema acceptance is claimed.
The central request/acknowledgement Zod schemas also need R2's contract review
before this becomes a shared, fully integrated API.
