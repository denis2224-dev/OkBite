# Offline capture delivery — 5 November 2026

Branch: `B2-offline-delivery`. This is a local integration branch for review; main was not merged or deployed.

## Result

- Capture budgets base64 JSON below the backend's 2,000,000-byte limit and recovers from null/undefined failures. The existing safety commit `edd1513` is included.
- Offline capture copies the compressed JPEG into durable storage before opening `/offline`. If storage fails, the original photo remains retryable.
- One application subscription retries on native network regain/foreground and browser online/visibility changes. Browser drains use an origin-wide Web Lock; unsupported or insecure browsers keep their captures and report a retryable error.
- Known products are saved in history. Unknown responses use PR #38's durable `needs_review` state and shared-schema validation, so reopening review does not repeat an AI upload.
- Saved reviews can reopen without network access, independently of earlier pending requests. One reconnect processes all pending rows while a screen accepts at most one navigation.
- Opening a review retains its row and photo. The queue ID follows confirmation, add and retake routes; a shopper's confirmation or successful product save completes the queued work.
- Transient photo read failures retain the capture. Only a confirmed missing photo is dropped.
- History displays saved products and links to pending work. A mobile-specific Metro configuration fixes the reproduced `No routes found` runtime failure without changing the root preview.

## Verification

- Main CI run [41998585225](https://github.com/denis2224-dev/OkBite/actions/runs/41998585225), attempt 2, passed every job on `a49015a`. Its original failure was a 504 downloading Deno.
- Frozen dependency installation passed with the repository's pnpm 9.12.0.
- Final `pnpm run check` passed: lint (0 errors, 55 inherited warnings), all TypeScript checks, **608 tests**, and data validation (0 errors). Test totals: 6 generator, 104 root app, 9 browser, 112 shared, 344 mobile, 28 data-script and 5 local-gateway tests.
- Final mobile web, iOS and Android exports passed after the recovery fixes. The unchanged root preview also exported all three platforms.
- Browser verification reproduced the original route failure, then verified the repaired offline screen, retry control and navigation to history.
- The capture integration test uses SQLite and real temporary files: both temporary source photos are deleted, the durable compressed copy survives, a later response is saved to history, and the resolved copy is removed.
- Independent final review identified five recovery defects; targeted regression tests were observed failing, then passed after fixes. The post-fix targeted run passed 55 tests across six suites; mobile TypeScript also passed.

## Decisions and dependencies

1. Another session changed the original capture checkout during validation. Work continued in a separately created worktree, preserving its committed `edd1513` safety changes.
2. Published capture, B4 result, B6 history/queue and PR #38 persistence dependencies were combined only on this branch. Their owners still control the review and merge sequence. If the upstream stacks change, this integration must be reconciled again.
3. The user requested a working offline handoff; the missing R4 integration route, lifecycle hook and history navigation were completed alongside R5 capture. R4/R1 should review their integration/configuration files.
4. The lockfile conflict contained additive AsyncStorage entries required by the root app. Both were retained, with the combined dependency graph checked by frozen installation.
5. Capture keeps `compressPhoto`'s public 1.5 MB default but uses a 1.45 MB identify budget, matching the existing label flow. This assumes the current 2 MB JSON body limit.
6. A mobile-local default Metro configuration was necessary because the inherited root configuration selected the wrong project root. R1 should review the app-root separation.
7. Browser upload serialization uses Web Locks on the intended HTTPS deployment. If unavailable, draining fails without removing work rather than risking duplicate uploads.
8. No human/device or live-backend acceptance was inferred from mocks, unit tests or exports. Whole B2/B3/B7 acceptance boxes remain unchecked.

## Remaining acceptance

- No hosted service is configured in this worktree; `apps/mobile` contains only `.env.example`. Real-product identification, label reading, contribution and two-phone lookup still require staging credentials and test devices.
- Real iPhone/Android and Safari/Chrome airplane-mode tests remain pending. C4 scoring/source validation is owned by its existing task.
- The fresh reviewer was a Codex subagent. This is not the project's required Claude cross-review or human merge approval.
- Deferred minor: reconnect toasts count resolved products but have no direct result action, and candidate readiness away from `/offline` is exposed through History rather than an actionable toast.

To run the integrated app, use pnpm 9.12.0 and `pnpm --filter mobile start` from this worktree. The default root app remains the separate design preview.
