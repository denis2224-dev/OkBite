# R5 integration handoff — 5 November 2026

Review branch: `R5-integration-reconcile`. Target: `main`. No main merge or deployment is part of this delivery.

## Source history

| Source | Exact head |
| --- | --- |
| Main at reconciliation start | `529bc4aa2539f70c59fbde02a114622ee1fc0db0` |
| R5 capture/identify/add #14 | `755a9ca07de566744fb55f8cfc02908a809a1943` |
| Capture safety #33 | `edd15130ac4d226689633f74a90537534cc5b624` |
| Replacement persistence #58 | `6ab01cc6f5a83187f1b3604d2f5e62d5c0ba7b35` |
| R4 offline UI #50 | `b46701404cf8f86e33ed7bd79f7e35fae7ef569e` |
| R4 history #51 | `c92d81db0ec431ae3144086491a460d8a7b6aa9e` |
| Local recovery snapshot | `71a7f18ae0e99b7eab181bc5fe4d48fdeee6e504` |

Source branches are preserved. The full integration diff includes existing published features; review reconciliation commits separately to see decisions made here.

## Reconciled behavior

- Photo capture keeps the 1.45 MB JPEG identify budget, 2 MB JSON request ceiling, null-safe failures and original-URI retry if durable storage fails. Camera captures retain their compressed photo even when a barcode lookup fails, preserving front-photo evidence.
- Live/manual scans retain R5's durable code queue and camera-loop deduplication. A code becomes deduplicated only after its storage write succeeds; failed writes retry. Successful lookups reset the marker for future captures.
- One queue combines R4's error/ownership controls and UI with status/result persistence, validated outcomes, R5 compatibility exports and local response handoffs.
- Unknown results survive opening, leaving or restarting review. Queue IDs follow confirmation, contribution and retake, and acknowledgement follows the shopper's decision or successful save.
- Saved reviews replay before pending network work. Found-result navigation cannot stop later queue processing. Temporary storage failures retain valid photos and are exposed for explicit retry.
- Native/web photos use the same missing-photo error type; browser drains/resumption serialize across tabs. R4's explicit cancellation and Blob URL release remain intact.
- R4's queue list, error/retry controls, confirmed cancellation, safe history reload/clear, cached result navigation and actionable product toasts are retained. History also links back to queued work and refreshes on queue changes.
- The mobile-specific Metro config remains, so the target routes resolve independently of the unchanged root preview.

## Test reconciliation

Source test cases were retained. Local UI recovery tests have separate `*.recovery.test` files and use the integrated R4 router/queue APIs. The published resume tests now assert retained evidence and queue IDs until explicit completion, rather than the old premature deletion. Storage-read recovery follows R4's explicit storage-error retry policy. Native API mocks include the real getInfoAsync boundary.

New regressions reproduced the failed-write deduplication bug and null/undefined scan failure. Queue integration tests protect shared locking, saved-review replay, interrupted review and whole-queue processing. A mutation check removed cached resumption and reproduced two identify calls instead of one; restoring persisted outcome reuse prevents a second upload.

The connected-path suite from #14 uses mocked HTTP/SDK boundaries. It checks client contracts and status transitions; it is not a hosted backend, live AI, or real two-phone acceptance test.

## Validation

Pending final full checks, all-platform exports and independent final review. The initial combined mobile run passed 378 tests across 42 suites, and strict mobile TypeScript passed. These initial counts precede the final browser error regression.

## R1/R4 integration sequence

1. Review the combined PR and its source table. #38/#49 are closed without individual merges; replace the old handoff ordering with this integration branch.
2. R4 reviews queue/history/Toast compatibility; R1 reviews app lifecycle/Metro and the final merge/toolchain. R5 owns capture/scan/identify/add behavior.
3. Obtain the required Claude cross-review and human approval. If R1 #40/#41 lands first, reconcile this branch with it and rerun exact-head checks under its toolchain. This branch uses currently declared pnpm 9.12.0 and preserves package-policy settings.
4. R1 merges the combined PR, then reconciles remaining source PRs/children without replaying included patches. Keep source branches until then.
5. Hosted staging/provider, physical iPhone/Android and Safari/Chrome acceptance remain separate. No B2/B3/B7 acceptance box is ticked based solely on mocks or exports.
