# R4-W2 install prompt evidence — 8 November 2026

Base: current main 212597e plus shared PWA copy (2dbef4e, test follow-up 2b7050f).

- Added the app-lifetime browser provider and native passthrough/no-op, a dismissible shared Card, and one Home insertion. No dependencies or hosting files changed.
- RED: focused tests against inert exports: 9 failed, 1 passed (`/private/tmp/r4-install-red-behavior.log`). Home integration without the insertion: 1 failed, 1 passed (`/private/tmp/r4-install-home-red.log`).
- GREEN: `pnpm check` with Node 22.23.4 / pnpm 11.25.0 exits 0 (`/private/tmp/r4-install-lifecycle-check.log`): lint has warnings, no errors; typechecks, all suites and data checks pass. Mobile: 70 suites, 553 tests.
- `pnpm --filter mobile exec expo export --platform all --output-dir /private/tmp/r4-install-bundles` exits 0 (`/private/tmp/r4-install-lifecycle-bundles.log`): web, iOS and Android exported.
- Browser API behavior follows [MDN beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) and [prompt()](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt): offer retained until explicit action and consumed once.
- Dismissal uses versioned local storage, with an in-memory fallback when storage is blocked; clearing site data permits the card again. iOS platform/touch detection includes iPad desktop mode.
- NOT RUN: physical iPhone/Android installation, VoiceOver/TalkBack, 200% system text/landscape or hosted PWA acceptance. No claim of device or release readiness.
- Cross-tool Claude review and human approval remain external acceptance gates; parent session coordinates review/publication.

- Review fix: listener and retained offer now live outside the startup gate in the root provider. Real Router shell regressions for cold History startup and Home unmount both failed before the fix (`/private/tmp/r4-install-lifecycle-red.log`); five focused suites / 15 tests pass after it (`/private/tmp/r4-install-lifecycle-green.log`). The former mocked-hook Home test was replaced.
