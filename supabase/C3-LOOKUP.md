# C3 helpers and lookup — 9 November 2026

Branch `C3-lookup-followup` builds on `C2-database-foundation` at `525d253`.
The current main already implements shared-code generation, HTTP/storage/database
helpers and lookup. This follow-up reuses those implementations and the real C4
score engine; it adds no temporary scoring stub or second backend.

## Changes

- Lookup now checks EAN-8/EAN-13 check digits with the shared D3 normalizer after
  validating the query shape and before database/telemetry I/O. Invalid codes
  return HTTP 400 `bad_request`; valid absent codes still return 200 `not_found`.
  The shared contract and accepted selector formats remain unchanged.
- Corrected the plan's invalid absent-code fixture `4840001009995` to
  checksum-valid `4840001009994`. The original value remains an explicit 400
  regression, alongside bad EAN-8 and EAN-13 check digits.
- Pinned the Edge Functions Supabase SDK to `2.118.0`, matching the app. The old
  floating `@2` import resolved to `2.119.0` during initial verification.

The checksum regression failed with 200 instead of 400 before implementation.
Unit tests also prove valid selectors are unchanged and invalid codes trigger no
product lookup or usage-event calls. Gateway regressions exercise the real HTTP
boundary, including CORS on bad requests.

## Verification environment

Used Deno 2.9.8, Supabase CLI 3.0.0 and a new disposable PG17 project
`okbite-c3-lookup-20261109`: API60431, DB60432. Existing stacks and checked-in
configuration were not changed. Only the temporary copy of `local-project.mjs`
was extended with this exact project ID for its guarded local CORS setup.

Connection settings were written to a mode-0600 temporary file. Integration
tests accept only loopback URLs and clean up their rows and uploaded photos.
Do not run these mutation-based tests against a hosted project.

Commands (run from this worktree with the local-only test environment):

```sh
pnpm sync-shared
git diff --exit-code -- supabase/functions/_shared
node --test scripts/sync-shared.test.mjs
deno check --config supabase/functions/deno.json supabase/functions/_shared/index.ts supabase/functions/_lib/*.ts supabase/functions/lookup/*.ts
deno test --config supabase/functions/deno.json -A --ignore='supabase/functions/_shared,supabase/functions/**/*.integration.test.ts' supabase/functions/
deno test --config supabase/functions/deno.json -A --env-file=<local-only-env> supabase/functions/_lib/http.integration.test.ts supabase/functions/_lib/storage.integration.test.ts supabase/functions/lookup/
supabase --workdir <disposable-project> test db
pnpm check
```

Results: six generator tests and byte-for-byte generated-code parity; 46 Edge
Function unit tests; 13 C3 live tests (including six lookup unit tests); Deno type
checks; 132 database assertions. Live checks include real private/public storage
round trips, EXIF removal, quota counting, shopper gateway access without login,
strict CORS, product visibility, nullable nutrition and contribution/score wiring.
`pnpm check` also passed: lint (zero errors, 57 existing warnings), app/shared/
browser-test typechecks, the full repository test suite and data validation.

## Hosted status and integration

Read-only inspection confirmed active lookup deployments in both `OkBite` and
`okbite-prod`. Their deployed lookup source predates this checksum fix; no hosted
invocations, writes or deployments were performed. Metadata/source inspection is
not a hosted runtime acceptance test. No account setup or Chrome access is needed.

Merge/review C2 first, then this dependent branch. Deploy the checksum fix and
pinned dependency with the reviewed function bundle; do not silently deploy the
other backend changes that may exist in a project's pending history. This handoff
does not claim Claude/human approval or physical-device testing.
