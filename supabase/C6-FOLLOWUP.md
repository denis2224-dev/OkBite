# C6 submissions and reports — 9 November 2026

Worktree `okbite-c6-contributions`, branch `C6-contributions-followup`, base
`9704b38` including C2 guards and C3 lookup. No hosted changes or deployments.

## Commits and scope

- `3f15b5d`: reuse the existing photo ownership/removal and publication journal
  implementation from `P-R2-production-hardening` (a478a20/e62ea62/3055889,
  including 3f453df). Includes the same two migrations, add-product publication
  hooks, source-ownership regressions and SQL permission/queue tests.
- `cc51c8e`: settle an in-flight product commit before photo compensation;
  preserve its committed public image. Add deterministic opt-in DB fault fixture,
  report delivery integration evidence and journal cleanup in contribution fixtures.
- `482a5fa`: recover a report whose transaction finishes after its RPC connection
  fails. Recheck the linked event after conditional reservation deletion settles.

Production changes are in `functions/add-product/service.ts`,
`functions/report/index.ts` and the two new migrations. Tests are under
`functions/add-product/`, `functions/report/` and `tests/`. Existing migrations,
shared helper APIs, `claude.ts`, the shared contract and generated `_shared/`
remain unchanged.

## Reproduced defects and verification

Shared-original sequential/concurrent submissions returned two successes before
photo ownership guards; afterward one succeeds and the second returns 400,
with one product/event and no losing public copies. Receipt replay remains stable.

A real product RPC continued committing after injected transport failure. Before
settlement, the response was 502 and the saved product's public photo returned
400 because compensation removed it. Afterward the response recovers the saved
product and the photo returns 200. The analogous real report race returned 502
with an already-stored open report; the fix returns 200 with one report/event.

The conditional DELETE in `releaseUsage` waits for the reservation row lock.
A committed event no longer matches `product_id IS NULL`; if deletion wins first,
the RPC cannot commit without its reservation. A failed settlement defers image
compensation. No new RPC or client contract is needed.

Executed with Deno 2.9.8, Supabase CLI 3.0.0 and disposable PostgreSQL 17 project
`okbite-c6-followup-20261109`, API61431/DB61432 (shadow61430/inbox61434):

- Incremental upgrade from the complete seven-migration base through replay
  admission: inspected `db push --include-all --dry-run`, applied only the two
  photo migrations, then passed all 151 SQL assertions. Product-row checksum was
  unchanged. No seed or roles were reapplied.
- Clean reset and seed: all 151 SQL assertions pass; SQL lint for public/private
  and security advisors report no warnings/issues.
- Deno typechecks; 46 backend unit tests; 31 clean live integration checks for
  contribution/report/quota/storage/lookup/score wiring. Full contribution/report/
  quota fault suite after the report fix: 21 passed.
- Temporary combined copy of final C6 source plus C7 `1a91ccc` moderation code:
  27 tests passed, including shared-source orphan withdrawal after failed cleanup,
  late Storage tombstone protection, expired JWT and hidden-product denial.
- `pnpm check` passes (lint, all typechecks/tests/data checks; 57 existing lint
  warnings, zero errors). Shared generation remains byte-for-byte unchanged.

The first resumed live run failed because Docker was stopped during the usage
pause; after restarting Docker the live checks passed. Other stacks were neither
reset nor stopped. Temporary fault hooks were removed after their tests.

To repeat active-commit faults, install
`functions/add-product/pending-commit.fixture.sql` ONLY in a disposable local DB,
then run the add-product/report suites with the loopback-only test environment and
`C6_PENDING_COMMIT_FIXTURE=1`. Remove both triggers and helper functions using
its header instructions. It is test setup, never a deployment migration.

## Integration and remaining gates

C7 must integrate its moderation cleanup handler (`c85de7c`) and tests (`1a91ccc`)
with both migrations and the C6 publication hooks. C7 admin changes are separate.
The final report fix changes no shared schema or storage interfaces; the combined
27-test proof includes it. C8 must preserve `contribution_photo_sources`,
`photo_publications` and `photo_removals` in recovery. Publication intents/removal
records intentionally outlive failed attempts; reconcile only settled orphan
copies and never delete photos referenced by a live product.

The migrations retain their existing future-dated names `20261112000000` and
`20261113000000`; do not generate duplicates. Reconcile deployment history first,
including the future-dated replay migration and C2's older guard migration. Use
C2's inspected include-all procedure only for a reviewed missing-migration list.
Backfill queues existing hidden photos and withdraws public references; it does
not delete Storage bytes or product records. Historical front/nutrition originals
cannot be reconstructed from older ingredients-only receipts.

Fresh read-only Codex review of `9704b38..cc51c8e` found no introduced blockers.
Its adjacent report-race finding was included in scope, reproduced RED, fixed and
verified GREEN with the full checks above. Claude and human approvals remain
outstanding; no physical-device, hosted-runtime or release-ready claim is made.

Different captures are not deduplicated by name/content. Reports have no stable
cross-HTTP idempotency key: a genuinely repeated HTTP submission may create
another report. This change does not promise exactly-once report delivery.
