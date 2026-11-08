# R4 PWA finish implementation plan

> For agentic workers: use executing-plans for each task and dispatching-parallel-agents for independent isolated branches. Test behavior before implementation; request a fresh review before publishing.

**Goal:** Finish the remaining R4 client work from the team's PWA finish plan (8 Nov), without recreating existing work.

**Architecture:** Reuse Expo, existing theme/components and browser APIs. Keep native no-op counterparts next to browser implementations. One task/branch/PR; shared copy lands first. Each consumer starts from current main plus the copy commit; no new dependencies.

**Tech stack:** Expo/React Native/TypeScript, IndexedDB, Jest, browser install/storage APIs.

**Spec:** https://claude.ai/artifact/GB33qugwTn66aUZyw9QUeY#3d375cfd-bd2a, PWA finish plan (8 Nov), R4-W1–W5; prior legal task P-R4-3.

## Constraints and existing coverage

- Current main: 212597e. Only edit R4-owned apps/mobile source, tests and task evidence.
- No package, lockfile, contract, backend, public hosting or service-worker registration changes.
- PRs #86–#90 already split #83 and reconstruct 07ebc16 exactly. Do not recreate those patches.
- production-readiness-followup/712db57 already prepares legal, accessibility and store checklists. Reuse them; never invent operator facts or device results.
- R1 owns the worker event bridge, viewport/root CSS and hosted Pages acceptance; R5 owns scanner/capture screens.
- Keep each PR near 400 changed lines; no merge to main or deployment is authorized.

## Review focus

1. Unsupported APIs and rejected browser promises must not break normal app use.
2. Install events consumed once, standalone/iOS detection and dismissal survive remount appropriately.
3. Updates never interrupt /capture, /scan, /identify or /add (including nested routes).
4. Request persistent storage only after a successful history save; concurrency and denial remain harmless.
5. New prompts use theme tokens, screen-reader labels, wrapping text and safe areas; real-device results remain explicit acceptance gates.

## R4-W1: Romanian copy

Files: apps/mobile/src/copy/ro.ts, pwa.test.ts.

Interface: ro.pwa.install.{title,description,iosHint,failed}; ro.pwa.update.{title,apply}; ro.pwa.camera.{iosDenied,androidDenied,httpsRequired,unavailable,busy}; ro.pwa.scannerUnavailable; ro.pwa.storageWarning; ro.pwa.analysis.{title,unknown,retry}.

- [ ] Test required keys, prescribed install/update wording and comma-below diacritics; watch failure.
- [ ] Add copy once, preserving existing keys and scoring/legal wording.
- [ ] Run copy tests and typecheck; commit before creating consumer branches.

## R4-W2: install prompt

Files: src/lib/installPrompt.web.ts and installPrompt.ts; src/ui/InstallPrompt.tsx; Home insertion and focused tests.

Interface: useInstallPrompt() returns {canInstall,isIos,isStandalone,install}. Native exports the same hook with inert behavior.

- [x] Test deferred event, repeated/failed prompt, installed/standalone changes, iOS/iPad detection, unsupported API and listener cleanup.
- [x] Test Home card actions, iOS hint and dismiss behavior.
- [x] Implement using browser APIs, existing Card/Body/Button and copy; add no dependencies.

## R4-W3: update banner

Files: src/lib/useSwUpdate.web.ts and native stub; src/ui/UpdateBanner.tsx; app/_layout.tsx and focused tests.

Interface: listen for okbite:sw-update; explicit user action dispatches okbite:sw-apply. Hidden on capture/scan/identify/add routes.

- [ ] Test event lifecycle, cleanup, route exclusions and delayed safe-route reappearance.
- [ ] Test explicit apply only and native no-op behavior.
- [ ] Implement client-side event contract; document R1-W4 bridge as a dependency, not completed hosting work.

## R4-W4: browser storage and layout evidence

Files: src/lib/storagePersistence.web.ts and native counterpart; src/features/history/db.web.ts; History warning and focused tests/evidence.

- [ ] Reproduce persistence called only after successful first write, concurrent saves call once, denial/rejection/unsupported API remain nonfatal.
- [ ] Implement one attempt after first saved entry; retain the existing atomic history write and 200-entry bound.
- [ ] Add the non-alarmist warning from shared copy to History, with native no-op behavior.
- [ ] Audit R4-owned safe areas against existing #86/#87 work. Record real iPhone home-screen/large-text/landscape checks as NOT RUN when unavailable; leave R1 public files untouched.

## Verification and publication

- [ ] Install frozen locked dependencies in each isolated branch; baseline and final pnpm check with Node22/Corepack/pnpm11.25.0.
- [ ] Export web/iOS/Android bundles on each final task head; run a combined-content verification without merging main.
- [ ] Fresh read-only review and fixes; attempt required Claude cross-review if available, report its absence accurately.
- [ ] Commit/push each task and create focused PRs, documenting base dependencies and pending physical/owner checks.
- [ ] Close superseded #83 only after confirming split content is fully preserved; keep #89 held for R5-W1 as specified by the plan.

## Acceptance limits

Real iPhone Safari/Android Chrome install, 200% text, screen readers, hosted service-worker replacement, legal identity/processor decisions and human approval cannot be replaced by unit tests or bundle exports. No release-readiness claim without those results.
