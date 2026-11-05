# C6 contribution handoff

Local checks on 2026-11-05: six Deno contribution tests exercise real Postgres and
Storage, including concurrent duplicates, atomic quotas, failed-copy/transaction
compensation and a lost response after commit. All 83 pgTAP assertions and database
lint pass. Run the existing C3 checks separately as documented in README.md.

Use the dedicated `okbite-c6` stack: API 57431, DB 57432, Studio 57433, inbox 57434.
Never reset the C2/C3 stacks. Local keys belong only in ignored `.env.c6-tests`.

```sh
pnpm install --frozen-lockfile
pnpm sync-shared
supabase start
supabase test db --local
supabase db lint --local --schema public --fail-on warning
OKBITE_RUN_INTEGRATION=1 deno test --config supabase/functions/deno.json -A --env-file=supabase/.env.c6-tests supabase/functions/add-product/ supabase/functions/report/
pnpm lint && pnpm typecheck && pnpm test
```

`reserve_usage` serializes admission per device/kind with an advisory transaction
lock. Reservations count while a submission is in flight, preventing oversubscription.
`commit_product` and `commit_report` validate the reservation, then persist records,
ingredient links and usage atomically. Only service_role can execute these RPCs.
Failed requests release uncommitted reservations. A process crash can consume quota
until the rolling window expires; this errs toward limiting attempts, never admission.
R3's photo/read-label functions must adopt reservation admission before claiming
concurrent quota enforcement; C3's count-only helper remains unchanged.

Copies use a newly allocated product UUID before public database visibility. On
failure, C6 removes attempted copies; after an ambiguous RPC result it first checks
whether that UUID committed, retaining committed images/events. A storage outage
during compensation can leave orphan objects; operations must reconcile product-bucket
UUID prefixes against products after the outage. Never remove images for existing rows.
Private upload originals are retained; no caller-supplied URL or another device's
prefix is accepted. Hidden duplicate codes return a generic duplicate error.

Same-code retries return the existing visible product without another `added` event.
No-code submissions are independent; exactly-once retries would need an agreed
idempotency field/header. A random device ID is a quota key, not shopper authentication.

R3/D3 is integrated from current main. R3/C4 remains absent: the approved C3 score
placeholder returns `unavailable`. C6 backend plumbing is implemented and tested,
but its real-score acceptance remains pending C4 plus human-checked A3 fixtures.
No real product, ingredient or score provenance has been invented. No hosted
Supabase project, deployment, phone verification or merge is claimed.

Integration refresh (2026-11-05): current reviews are required; historical waiver statements do not authorize merge in this coordination run. CI uses a fresh runner-local stack. No staging or physical-phone verification is claimed.
