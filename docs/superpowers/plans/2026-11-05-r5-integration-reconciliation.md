# R5 integration reconciliation

Scope: the user explicitly requested one reviewable branch combining PRs #14, #33,
#58, #50 and #51 with local recovery commit `71a7f18`. Preserve source branches;
publish a draft integration PR and an updated R1/R4 handoff. No main merge,
deployment, feature redesign, hosted testing or physical-device acceptance.

Spec: `docs/superpowers/specs/2026-11-03-okbite-design.md`.
Role plans: R5 B2/B3/B7 and R4 B6 in `docs/superpowers/plans/`.

## Task 1: Integrate the source histories

- Record exact source SHAs and the starting commit in the scoped ledger.
- Merge current main, published R5 capture/add, queue-state and R4 history/UI
  histories into this branch. #33 is already an ancestor of the local snapshot.
- Preserve the root preview, backend contract/migrations and toolchain policy.
- Install with the currently declared pnpm 9.12.0 and frozen lockfile.
- Verify the source histories are ancestors and inspect conflicts explicitly.

## Task 2: Reconcile capture and queue behavior

- Keep the identify request below the 2 MB JSON limit and null-safe failures.
- Preserve R5 barcode/manual-code queueing and connected-flow tests.
- Save successfully before setting deduplication markers; failed storage writes
  must retry. Coalesce camera-loop and retry duplicates.
- Use one durable queue implementation with R4 UI/events and actionable toasts.
- Keep schema-validated needs_review responses and queue IDs through confirmation,
  add and retake. Remove unresolved work only on explicit completion/cancellation.
- Preserve transient read failures, whole-queue processing, offline saved-review
  access, cross-tab serialization and photo ownership cleanup.
- Add missing regression tests, observe failures, then make the smallest fixes.
- Keep all source regression tests and run the combined mobile suite.

## Task 3: Validate the integrated app

- Run frozen install, lint/typecheck/full tests/data check and shared generation
  drift checks using the project's declared toolchain.
- Export apps/mobile and the root preview for web, iOS and Android.
- Verify the integrated offline/history routes in a local browser.
- Obtain the executing-plans skill's single fresh-context final branch review;
  fix actionable findings with RED/GREEN evidence and rerun affected/full checks.

## Task 4: Publish the review branch and handoff

- Record source ancestry, commands/results, conflict resolutions, R1/R4 ownership,
  and the replacement for the obsolete closed #38/#49 merge instructions.
- Separate already-reviewed source commits from reconciliation commits for review.
- Push only the new integration branch and open a draft PR against current main.
- Report exact-head CI status and keep Claude/human/device acceptance explicit.
