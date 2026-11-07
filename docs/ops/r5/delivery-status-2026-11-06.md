# R5 delivery status — 6 November 2026

Software integration is separate from phone, field and beta acceptance.
The application under test is `apps/mobile`; the root preview is retained.
The owner explicitly chose on 6 November to keep #71 pending Claude review and
physical-phone gates. Do not merge it automatically or treat that choice as a
waiver. Account setup is the next prerequisite, with the owner completing signup.

## Implemented and published

- [#63](https://github.com/denis2224-dev/OkBite/pull/63) integrated #14/#33/#58,
  local interrupted-review recovery, R4 offline UI/history and upload-size limits.
  Gemini's subsequent work was audited; fresh contribution receipts use metadata,
  draft completion IDs stay stable, and completion commits before photo cleanup.
- [#68](https://github.com/denis2224-dev/OkBite/pull/68) recovers old metadata
  receipts and processes completed local receipts before offline network work.
- [#69](https://github.com/denis2224-dev/OkBite/pull/69) isolates mounted drafts,
  prevents stale repeat saves and preserves the shopper's navigation after leaving.
- [#70](https://github.com/denis2224-dev/OkBite/pull/70) prevents delayed identify
  acknowledgement from overriding a newer destination. These four PRs are merged.
- [#71](https://github.com/denis2224-dev/OkBite/pull/71) applies shared palette
  tokens and wrapping to R5 screens, and scrollable permission/error recovery.
  Its merge/review/CI state must be read from GitHub, not inferred from this file.

The independent final review found five Important issues. Each was reproduced
with failing regressions and fixed across #68–#71; no second final review was
used to turn missing external evidence into acceptance. Claude cross-review is
still unavailable because official authentication is absent.

## Fresh verification

On theme integration head `5394e8e`, including main `efb3c6a`:
491 mobile tests (57 suites), 231 shared tests, strict root/mobile/shared/e2e
types, lint (0 errors, 57 inherited warnings), generated shared synchronization,
web/PWA/iOS/Android exports pass locally. Platform exports are bundle checks.
Explicit root tests (104), browser unit tests (9), script tests (31) and data
validation (0 errors) also pass on this source tree.
CI must pass on the exact published head before integration.

Two Windows launchers in the existing full root command require Linux CI:
the toolchain test invokes bare `corepack`, and the media helper invokes bash.
These tests were not removed or reported passing locally. Explicit root/browser
test globs are necessary in this managed `.codex` path to avoid zero-test discovery.
The CI also checks database/Edge Functions and offline browser fixture scenarios;
fixture/provider mocks are not live AI or physical-device evidence.

The browser fixture check confirmed dark manual-code validation with no console
warnings/errors. Camera permission remained pending in this browser session;
capture, label review and 200% device acceptance are not claimed from that run.

## Remaining work with actual evidence

| Work | Required next evidence / owner |
| --- | --- |
| Staging and installs | [Account-owner setup](account-owner-setup.md), then R1 build/HTTPS links and R2/R3 deployed-flow confirmation |
| B2/B3/B7 acceptance | Owner's iPhone + Android, native + Safari/Chrome; [S01–S16](beta/scenarios.md), second-phone UUID, offline restart/review recovery, accessibility |
| Review | Authenticated Claude cross-review, human decision and any explicitly recorded gate exception |
| A2 shared source checks | R3 assigns R5's non-overlapping batch of 30; a human opens sources and records reviewer/date; never infer checks from data validation |
| A6 | [Collection pack](field/README.md), five people × 60 distinct real products; R3 import deduplication and R2 daily verification |
| A7 | [Beta pack](beta/README.md), 25 actual consenting testers, daily triage and zero open P1 bugs at the 1 December checkpoint |
| A8 | [Unpublished drafts](launch-drafts.ro.md), actual recording, verified store links and release approval before posting |

No account/project, hosted preview, APK/IPA, product collection, recruitment,
source-opening, phone session or launch post was created by these preparations.
Human acceptance boxes remain unticked. Successful remote save followed by total
local persistence failure and process death still needs backend idempotency or
manual reconciliation; local retry tests do not guarantee remote exactly-once writes.
