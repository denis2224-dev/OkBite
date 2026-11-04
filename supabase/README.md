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
