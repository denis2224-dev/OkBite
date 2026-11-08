# Stable local configuration

The checked-in team project is `okbite` (API 54321, DB 54322, shadow 54320,
Studio 54323, inbox 54324). C1/#4 and D3/A2/B1 are merged; The original R2 stack is merged; this follow-up corrects local defaults.
Review remains waived by the user; no AI review or human approval is claimed.

For the current checkout, use Supabase CLI 2.122.1 with `npx --yes supabase@2.122.1`.

For parallel tests, copy `supabase/` into a separate temporary project directory,
set an explicit isolated project ID and free ports there, and pass its directory
with `supabase --workdir <directory>`. Never overwrite the checked-in defaults or
stop/reset existing `okbite-c2`, `okbite-c3-cd37` or `okbite-c6` services.
The reconciliation uses only `okbite-r2-review` on ports 58430–58434.
Photo recovery is also bound to the API port in that copied configuration; an
allowlisted project name never authorizes another loopback stack. The database
drill compares restored owners and grants as well as row counts before pgTAP.

Current integration tests run with all three local SUPABASE_* variables; an extra
opt-in flag is unnecessary. Partial/invalid configuration fails before I/O.
The evidence below is historical and identifies earlier stacks and run-specific
review instructions; the user preserved the review waiver for this follow-up.

# C2 local database handoff

Branch: `C2-database-schema`, based on cleaned `origin/C1-api-contract` at `33ff46a`.
Depends on C1/PR #4; any C2 PR must target `C1-api-contract` while C1 is unmerged.
Review was explicitly waived by the user. No AI review or human approval is claimed.
No merge, deployment, remote reset or cloud configuration was performed.

## Reproduce locally

Prerequisites used: Docker Desktop Engine 29.7.2, Supabase CLI 2.65.5,
PostgreSQL 15, Node 22.23.4 and pnpm 9.12.0. CLI obtained with
`npx supabase@2.65.5`; Node/pnpm and graphify SQL parser were installed in temporary tools directories.
The Superpowers execution skill was unavailable; the R2 execution companion's fallback workflow was followed.

```sh
npx supabase@2.65.5 start
npx supabase@2.65.5 db reset --local
npx supabase@2.65.5 test db --local
npx supabase@2.65.5 db lint --local --schema public --fail-on warning
pnpm lint && pnpm typecheck && pnpm test
```

Only reset this worktree's `okbite-c2` stack (DB port 55432, API 55431).
Do not link it to a hosted project to run tests. Tests wrap data changes in rollback.
Red: before migration/seed, pgTAP failed for missing products, moderators and search.
Initial C2 green: 75 assertions across RLS/search/seed, no database lint errors; project lint,
typecheck and all 55 contract tests passed. Two pgTAP invocation errors were corrected without removing assertions.

## Cleaned C1 reconciliation

Replayed only implementation commit `30e97b2` as `fdb437e`; omitted graph refresh
`51a8caf` and the obsolete C1 commits. D1 configuration, `APP_NAME`, corrected C1
tests and `graphify-out/` match the cleaned base exactly. Database files/tests are unchanged.
Rechecked against the existing isolated local stack without a reset: all 75 database
assertions and database lint passed. Project lint exited 0 with 33 inherited
schema/type-name warnings; typecheck, 56 shared tests and one mobile test passed.
C2 remains a dependent PR targeting `C1-api-contract`; review remains waived.

## Consumer notes

All eight tables use RLS with explicit grants. Anonymous and ordinary signed-in
readers see visible products and visible ingredient links. Select product columns
explicitly: `added_by_device` is service-only, so public `select *` is denied.
Moderators can read hidden rows and modify products, ingredient links and reports;
logs, usage, membership and UTC `daily_stats` are service-only.
Search fixes its path and 0.35 threshold, folds accents/case and returns at most
three visible candidates; null limits use three and nonpositive limits return none.
No direct shopper storage write policies are added; C3 storage helpers use service role.

The six deterministic `c2000000-...000001` through `...000006` UUIDs follow the corrected
EAN order from C2. Seed is local/staging DEMO data copied from prototype `P`, including
explanations and allergen labels; it does not attest human source checks or real product verification.
Unknown fruit/vegetable percentages and juice sat/sugar/salt/fiber stay null.
No photos/URLs are invented. Demo `added_at` maps the prototype photo date and
`verified_at` its checked date; no human verifier UUID is supplied.
Production content loading/source validation remains R3/A2/C5; function integration
continues in C3, AI/search consumers in R3/D4 and telemetry in R1/D7. No UI changed.

## C3 dependent functions work

C3 integrates C3a commits `7270b89` and `613d015` over C2 without the obsolete
scaffold/graph commits. Dependencies: schema PR #7 and generation PR #8, both
ultimately gated by cleaned C1/D1. Review is waived; no review approval is claimed.
The C3 worktree uses **only** `okbite-c3-cd37`, API 56431, DB 56432,
shadow 56430, Studio 56433, inbox 56434. The running C2 stack stays untouched.
`lookup` disables gateway JWT verification because shoppers have no accounts;
its handler validates the random device UUID, which is telemetry, not authentication.
R3/C4 supplies the real `computeScore`; products missing kcal, sugar, sat or salt still return unavailable.
C6 still requires the real C4 engine and D3 allergen matcher.

### C3 reproduction and evidence (2026-11-04)

Use Node 22.23.4/pnpm 9.12.0, Deno 2.9.6, Supabase CLI 2.65.5 and Docker.
The planned SDK alias `npm:@supabase/supabase-js@2` resolved to 2.118.0;
JPEG decoding uses pinned `jpeg-js@0.4.4`. Root `deno.json` bridges the function
import map and avoids Deno treating pnpm's node_modules as its npm installation.
SDK/configuration references: [Supabase dependencies](https://supabase.com/docs/guides/functions/dependencies),
[Deno configuration](https://docs.deno.com/runtime/reference/deno_json/).

```sh
pnpm install --frozen-lockfile
pnpm sync-shared
npx supabase@2.65.5 start
# In a second terminal (leave running):
npx supabase@2.65.5 functions serve lookup
# Back in this terminal, after start/serve:
node supabase/tests/local-cors.mjs
# Supply local-only SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# in ignored supabase/.env.c3-tests (values from supabase status -o env).
deno check supabase/functions/_shared/index.ts supabase/functions/_lib/*.ts supabase/functions/lookup/*.ts
deno test -A --env-file=supabase/.env.c3-tests supabase/functions/_lib/ supabase/functions/lookup/
npx supabase@2.65.5 test db --local
npx supabase@2.65.5 db lint --local --schema public --fail-on warning
pnpm lint && pnpm typecheck && pnpm test
```

Supabase's local Kong default overwrites function CORS with `*` and answers OPTIONS
itself. The guarded, idempotent `local-cors.mjs` removes only the functions CORS
plugin on this worktree's C3 gateway; repeat after recreating the local stack.
Live gateway tests require exact handler headers, 204 preflight and spoof rejection.
Hosted gateway behavior still needs staging verification before a future deployment.
No hosted gateway or cloud configuration was changed.

Red evidence: missing score/HTTP/storage/lookup modules; EXIF round-trip initially
failed because the encoder retained decoder metadata; live gateway failed strict CORS.
Green: 16 Deno tests including real REST/storage/Edge Runtime round trips;
75 pgTAP assertions and DB lint; project lint/typecheck, 6 generator tests,
57 shared tests and 1 mobile test. Lint retains 33 inherited C1 schema/type warnings.
Generation repeated byte-for-byte. No UI changed; no phone review is claimed.

Lookup rejects missing, duplicate or conflicting selectors and accepts C1 code
format only; R3/D3 checksum normalization is still unmerged. Code hits log one
`barcode`; misses log one `not_found`; id hits do not count as barcode scans.
The loader uses the anon role with explicit public columns, label-order ingredients,
UTC dates and null nutrients. Only promoted product-bucket paths produce photo URLs;
private upload paths are never advertised as public images. C2's demo photo-date
mapping to `addedAt` remains unchanged. No contract or migration changes were needed.
Count-only quotas are not atomic reservations; C6/D4/D5 must coordinate admission.
C6 must bind upload prefixes to the caller, handle copy/DB compensation and wait for
C4/D3. Graph navigation was refreshed locally; derived graph output is excluded.

### Integration coordinator refresh (2026-11-05)

CI now invokes the existing local-CORS helper before live gateway tests. The
helper's already-published dedicated-C6 support is moved forward from C7d so the
whole dependency stack can use the same strict assertions. Five Node regressions
cover LF/CRLF, C3/C6, rejection of unrelated projects, service isolation and
idempotence. The C6 case failed before this integration; CRLF already worked.
Kong's default permissive CORS is delegated to the stricter function handlers on
these disposable local stacks only. Hosted configuration is untouched.

Run live tests with `OKBITE_RUN_INTEGRATION=1` and the three local Supabase values;
without the explicit flag they are ignored while ordinary unit tests still run.
Analytics rejection no longer turns a valid found/not-found lookup into a 502;
product loading and response-schema errors remain 502. R1 CI/root-script changes
and R2 gateway/function changes are authorized integration fixes requiring review.
Historical review-waiver text does not waive this run's cross-review/human gates.
