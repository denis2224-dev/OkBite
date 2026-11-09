# R5-W1 — browser barcode fallback

Prepared on 8 November 2026 from main 212597e, branch R5-W1-zxing-fallback.

## Behavior

- Keep BarcodeDetector where a supported retail format is available.
- Otherwise import ZXing only when a live scan or photo needs decoding.
- Decode EAN-13, EAN-8, UPC-A and UPC-E. Expand UPC-E to UPC-A before
  shared normalizeCode validation; preserve existing product callbacks.
- Ignore unreadable frames. Stop tracks, polling and reader state on exit,
  including exit during decoder loading, camera acquisition or video playback.
- A photo without a valid barcode continues through existing AI identification.

## Validation

Review fixes verified on 9 November 2026 at code commit `ba7633c` (documentation follows separately).
- Three new regressions were observed RED, then GREEN: decoder loading failure,
  photo-only TRY_HARDER, and hint restoration after photo failure.
- Real Chrome 156 / ZXing: a rectangular synthetic barcode photo rotated 90 degrees
  failed before the fix and decoded correctly afterwards. Photo-only square padding
  compensates for this pinned browser layer retaining unrotated luminance dimensions.
  The repeatable check is `node apps/mobile/src/features/capture/rotatedBarcode.browser-check.cjs`
  (requires installed Chrome and the existing development dependencies).

- Regression tests: 33 pass across three scanner/photo files; fallback and
  startup-cancellation tests were observed failing before their implementation.
- Full mobile suite: 615 pass, including the cache regressions. Shared package: 231 pass.
- Root app: 104 pass; web storage: 9 pass; scripts: 31 pass.
- Cache regressions were observed RED, then GREEN. In desktop Chrome 156,
  generated service-worker installation requested no ZXing chunk; its first
  request downloaded once, and reopening offline returned the same 540,000 bytes.
- Types pass. Lint: zero errors, 57 existing warnings.
- Desktop Chrome: real ZXing decoded a synthetic fixture from photo and live
  canvas video; tracks ended on stop. Native-detector path requested no ZXing
  module. These checks do not establish physical-device acceptance.
- Full pnpm test stops at the existing Windows corepack-spawn toolchain test.
  Separately running the remaining groups exposed the existing media-preflight
  test's missing Bash/WSL runtime. Both also fail on unchanged main.
- Independent code review found startup cancellation; its two regressions were
  observed RED, fixed and verified GREEN. Claude cross-review findings 1, 2 and 4 are addressed; finding 3 remains a phone-test note.

## Initial web bundle measurement (8 November)

Same local toolchain and Expo web export, no production credentials:

| Output | Before | After |
| --- | ---: | ---: |
| All emitted JavaScript | 1,888,316 bytes | 2,429,288 bytes |
| Scan route | 6,766 bytes | 7,098 bytes |
| Lazy ZXing chunk | absent | 540,000 bytes (134,259 gzip) |

Pinned @zxing/browser 0.1.5 (22 May 2024): newer releases pull a peer requiring
Node 24, while this repository targets Node 22. Lockfile pins its peer too.

The cache adjustment was approved by Ion on 8 November. Workbox excludes the
decoder chunk from precache and caches successful same-origin requests on demand.
Initial precache decreased from 68 URLs / 5.86 MB to 67 URLs / 5.32 MB.
Independent review found no actionable issues in the cache adjustment.

## Remaining acceptance

- Watch for heat or stutter on older iPhones during live-scanner testing.

- Test a real iPhone in Safari and installed mode, then Android Chrome and
  installed mode: live barcode, photo, invalid/no code, permission refusal,
  exit during startup, camera indicator off after exit, and offline relaunch.
- Record actual commit, device, OS, browser/mode and results in the team log.
- Obtain Claude and human review before merge. No hosted deployment performed.
