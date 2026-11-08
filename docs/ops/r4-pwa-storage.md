# R4-W4 — browser history persistence and layout audit

Branch base: `212597e` plus shared PWA copy `2dbef4e` and its copy-test
followup `ed1194c` (cherry-pick of `2b7050f`). No hosting, service-worker,
backend, package, shared UI or legal-preparation changes.

## Storage policy

- After a successful atomic browser history write, request persistent storage
  in the background. A rejected history transaction never consumes the attempt.
- An atomic `storage-persistence-attempted` metadata key in the existing history
  store claims one attempt across tabs/reloads. Clearing history deletes only
  `entries`, preserving the claim. Existing ordering, deduplication, 200-entry
  bound and offline queue writes are unchanged.
- Ruling: claim before requesting permission to avoid repeated prompts after
  denial/rejection. A browser shutdown between claim and API invocation may skip
  the request permanently; closing before the claim leaves a later successful
  save eligible. This is best effort, not an exactly-once guarantee.
- If metadata cannot be written, a document latch still limits the attempt;
  another tab or reload may retry because the durable claim is unavailable.
- Unsupported/throwing APIs, denied/rejected permission and stalled permission
  cannot fail or delay a saved result. Native exports are inert. History shows
  `ro.pwa.storageWarning` only on web, using existing wrapping Body/Card/theme.
- API behavior reference: [WHATWG Storage Standard](https://storage.spec.whatwg.org/#dom-storagemanager-persist).
  A request does not guarantee permission or protection against explicit deletion.

## R4 safe-area audit (code, 8 Nov 2026)

- At the base, `ui/Screen.tsx` wraps content in SafeAreaView for top/left/right
  and a scrolling body with 40 px bottom padding. History, legal and offline
  screens consume this wrapper. Typography permits font scaling and the new
  warning adds no fixed height, line clamp, pressable or motion.
- Existing PR #86 (`b737801`): shared Screen uses all safe-area edges;
  `ScreenSafeArea.web.tsx` preserves real browser insets and limits simulated
  cutout clearance to portrait phone previews reporting zero top inset.
  `AppBottomNav.tsx` uses `Math.max(12, insets.bottom)` and minimum-height tabs.
- Existing PR #87 (`7d9b5c9`): Home/History use ScreenSafeArea for top/side
  clearance; History confirmation uses all edges and a ScrollView. Its header
  wraps and row text flexes. Preserve these changes when resolving the History
  insertion during integration; do not apply the older layout over them.
- Followup finding in #87: Home's demo Modal uses an ordinary bottom-aligned
  View, without explicit safe-area insets. Verify its last action on a device
  with a home indicator and at 200% text; a shared-layout/Home owner followup
  may be needed. This audit does not certify that pending branch's layout.
- R1 dependency: `public/index.html` viewport-fit and root flex/height rules,
  plus hosted browser acceptance. Those files are intentionally untouched.
- Reuse legal/accessibility prep on `production-readiness-followup/712db57`.

## Verification evidence

- RED: missing History warning and persistence expected once/received zero
  (`/private/tmp/r4-storage-red.log`). Final GREEN focused history/db suites:
  32 tests, including metadata-failure, shutdown and native-warning coverage
  (`/private/tmp/r4-storage-green.log`).
- Frozen offline dependencies installed independently from the existing pnpm
  cache; Node `22.23.4`, pnpm `11.25.0`. No node_modules symlink.
- `pnpm check`: PASS, 0 lint errors / 57 existing warnings; all typechecks,
  root 104 + web 9 + mobile 551 + shared 231 tests, script/ops checks and data
  validation (`0 errors`). Log: `/private/tmp/r4-storage-check.log`.
- Untouched shared-copy base `ed1194c` full `pnpm check`: PASS with the same
  57 lint warnings (`/private/tmp/r4-storage-baseline.log`).
- Expo web/iOS/Android exports: PASS. Artifacts:
  `/private/tmp/r4-storage-bundles/{web,ios,android}`; logs:
  `/private/tmp/r4-storage-bundle-{web,ios,android}.log`.
- Real iPhone native/Safari/home-screen, Android native/Chrome/home-screen,
  200% text, landscape, screen-reader and real browser storage-pressure checks:
  **NOT RUN** (physical devices unavailable). Bundle exports do not replace them.
- Fresh review/cross-tool Claude review and human approval remain parent-led
  acceptance gates; no `claude` executable was available in this worktree.
