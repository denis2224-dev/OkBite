# R5 integration handoff — 5 November 2026

Review branch: `R5-integration-reconcile`. Target: `main`. No main merge or deployment is part of this delivery.

## Source history

| Source | Exact head |
| --- | --- |
| Main at reconciliation start | `529bc4aa2539f70c59fbde02a114622ee1fc0db0` |
| Main refreshed before final publication | `34839dca6dea30cffed6b634324039945d2adbea` |
| R5 capture/identify/add #14 | `755a9ca07de566744fb55f8cfc02908a809a1943` |
| Capture safety #33 | `edd15130ac4d226689633f74a90537534cc5b624` |
| Replacement persistence #58 | `6ab01cc6f5a83187f1b3604d2f5e62d5c0ba7b35` |
| R4 offline UI #50 | `b46701404cf8f86e33ed7bd79f7e35fae7ef569e` |
| R4 history #51 | `c92d81db0ec431ae3144086491a460d8a7b6aa9e` |
| Local recovery snapshot | `71a7f18ae0e99b7eab181bc5fe4d48fdeee6e504` |

Source branches are preserved. The full integration diff includes existing published features; review reconciliation commits separately to see decisions made here.

Main advanced during initial validation, landing R1 #40/#41, R2 recovery/diagnostics, R4 detail screens and the PWA shell. The follow-up merge keeps those owner-approved changes intact. Its only textual conflict was the explanatory comment in the equivalent mobile Metro config. #58 is now also merged on main; its original source head remains included.

## Reconciled behavior

- Photo capture keeps the 1.45 MB JPEG identify budget, 2 MB JSON request ceiling, null-safe failures and original-URI retry if durable storage fails. Camera captures retain their compressed photo even when a barcode lookup fails, preserving front-photo evidence.
- Live/manual scans retain R5's durable code queue and camera-loop deduplication. A code becomes deduplicated only after its storage write succeeds; failed writes retry. Successful lookups reset the marker for future captures.
- One queue combines R4's error/ownership controls and UI with status/result persistence, validated outcomes, R5 compatibility exports and local response handoffs.
- Unknown results survive opening, leaving or restarting review. Queue IDs follow confirmation, contribution and retake, and acknowledgement follows the shopper's decision or successful save.
- Saved reviews replay before pending network work. Found-result navigation cannot stop later queue processing. Temporary storage failures retain valid photos and are exposed for explicit retry.
- Native/web photos use the same missing-photo error type; browser drains/resumption serialize across tabs. R4's explicit cancellation and Blob URL release remain intact.
- R4's queue list, error/retry controls, confirmed cancellation, safe history reload/clear, cached result navigation and actionable product toasts are retained. History also links back to queued work and refreshes on queue changes.
- The mobile-specific Metro config remains, so the target routes resolve independently of the unchanged root preview.
- Queue management requires explicit review selection and remains accessible for cancellation. Retry cannot erase a valid result committed by an active drain. Completed receipts precede cleanup, so photo/row deletion failures retry cleanup without repeating review/add; one unreadable photo does not block later healthy items.

## Test reconciliation

Source test cases were retained. Local UI recovery tests have separate `*.recovery.test` files and use the integrated R4 router/queue APIs. The published resume tests now assert retained evidence and queue IDs until explicit completion, rather than the old premature deletion. Storage-read recovery follows R4's explicit storage-error retry policy. Native API mocks include the real getInfoAsync boundary.

New regressions reproduced the failed-write deduplication bug and null/undefined scan failure. Queue integration tests protect shared locking, saved-review replay, interrupted review and whole-queue processing. A mutation check removed cached resumption and reproduced two identify calls instead of one; restoring persisted outcome reuse prevents a second upload.

The connected-path suite from #14 uses mocked HTTP/SDK boundaries. It checks client contracts and status transitions; it is not a hosted backend, live AI, or real two-phone acceptance test.

The single fresh-context final review identified four issues: automatic queue redirection, a retry/reset race, unsafe acknowledgement/cleanup ordering, and a transient read blocking later work. Regression tests failed first, then passed after the fixes. Add/confirm tests also cover local acknowledgement failure and completion-only retry. The connected capture test now asserts the real history-store call at its mocked SQLite boundary.

If a server save succeeds while all local persistent writes fail, the active review retains the response and offers completion-only retry. A process death before any local receipt can persist remains a live-acceptance/backend-idempotency question; no exactly-once provider guarantee is made.

## Validation

- Initial pnpm 9.12.0 snapshot: frozen install, `pnpm run check` and 651 local tests passed before the current-main refresh.
- Current main's pinned pnpm 11.25.0: frozen install, toolchain verification, lint (0 errors / 57 inherited warnings), root/mobile/shared/e2e strict types and data validation pass.
- Current-main local suites: 679 automated passes: mobile 405 (47 suites), shared 113, scripts 28, sync generator 6, gateway 7, local guards 3, Metro 1, toolchain 3, root preview 104 (24 suites), web preview 9 (2 suites).
- `pnpm run check` stops at R1's fourth toolchain test on Windows: bare `spawnSync('corepack', …)` returns ENOENT because this host provides `corepack.cmd`. The unchanged test's real Corepack/pnpm 9 rejection and absent dependency-sentinel assertions pass when invoked through Corepack's Node entry point. Remaining suites were run explicitly. The original fourth test must pass in Linux CI; the R1-owned runner is unchanged.
- Windows managed-worktree Jest globs initially skipped root tests. Both root suites were explicitly executed with relative `--testMatch` globs and `--passWithNoTests=false`; the counts above include those actual runs. No root runner configuration was changed.
- Shared regeneration produced no tracked or untracked generated-code drift.
- Expo exports pass for web, iOS and Android in both apps/mobile and the root preview. The mobile export was repeated after the four final-review fixes; root preview source was unchanged.
- Browser smoke check of the final mobile export: `/offline` loads its empty queue, opens `/history`, and returns through Căutări salvate; no captured browser warnings/errors. Persisted-data failure modes are covered by the SQLite/IndexedDB and UI regressions, not a live provider claim.
- One fresh-context branch review was completed, and all four actionable findings were addressed with failing-then-passing regressions and the full suite. Claude cross-review, human approval and physical-device acceptance remain pending.

## R1/R4 integration sequence

1. Review the combined PR and its source table. #38/#49 are closed without individual merges; replace the old handoff ordering with this integration branch.
2. R4 reviews queue/history/Toast compatibility; R1 reviews app lifecycle/Metro and the final merge/toolchain. R5 owns capture/scan/identify/add behavior.
3. Obtain the required Claude cross-review and human approval. R1 #40/#41 is now included from main. This branch preserves its declared pnpm 11.25.0, toolchain verification, package-policy settings and target-app entry commands.
4. R1 merges the combined PR, then reconciles remaining source PRs/children without replaying included patches. Keep source branches until then.
5. Hosted staging/provider, physical iPhone/Android and Safari/Chrome acceptance remain separate. No B2/B3/B7 acceptance box is ticked based solely on mocks or exports.
