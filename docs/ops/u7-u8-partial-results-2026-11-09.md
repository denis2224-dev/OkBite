# U7/U8 unknown-product result handoff — 9 November 2026

Scope: David/R4's two tasks from the supplied production-task screenshots.
U7 source: `a502f1e11`; U8 implementation: `4d83bc116`.
Current main at audit: `9ade222ab`; existing U6 base: `1444cfeb9` (#109).

## Branches and reuse

- `U7-copy-unknown-product` stacks on `U6-confirm-and-drafts`: reuses its 38
  existing flat `ro.add` messages and adds eight missing result messages with tests.
- `U8-partial-result-screens` stacks on U7. Reuses U6's `/add/nutrition` route.
  No copy, photo-flow, draft, extraction or backend implementation is duplicated.
- Other teammates' U0/U3/U5/U6/U10 branches and main remain unchanged.

## Result behavior

- Missing nutrition: neutral unavailable card; no empty score ring or portion table.
- Partial nutrition: only recorded per-100-g/ml values, preserving real zero and
  decimal commas; no inferred nutrients, score or daily-reference percentages.
- `necunoscut`: no score, including stale supplied scores. Confirmed water retains
  its existing scoring exception; the backend still owns score calculation.
- Allergens/may-contain, the explicit uncertainty note, raw label text, source,
  photograph date and Neverificat status remain available. Sourced ingredient
  explanations are labelled separately from transcription and retain source links.

## Verification

- RED: U7 missing-message tests failed; U8 missing/partial/category/action and
  explanation-label tests failed before implementation.
- `pnpm check`: passed on both task worktrees. Final combined mobile: 748 tests,
  root: 104, web: 9, shared: 274. 57 inherited lint warnings, zero errors.
- WebKit/iPhone-13 and Chromium/Pixel-7 emulation: 14 browser specs passed,
  including light/dark and doubled font size/line height. Startup overlay is gone
  before screenshots/checks. Result stubs bypass the service worker; independent
  offline/service-worker specs still pass. No live backend writes.
- Web/iOS/Android exports passed. Screenshots inspected in `test-results/`.
- Independent Codex review: no actionable findings. Claude CLI is not signed in;
  Claude cross-review was not performed.

## Remaining integration and human acceptance

- U0/U1 contract and U2 backend work are not merged in the audited main. Rebase
  these branches and retest against the canonical contract once available; no
  provisional fields were added to the shared contract by U7/U8.
- Enrichment is hidden by default. Enable `EXPO_PUBLIC_NUTRITION_ENRICHMENT=1`
  only after U1/U2 and U6 are integrated and ownership/eligibility, same-ID update,
  retry safety and canonical response validation have passed against the backend.
  Default rendering and explicit enabled navigation are covered by component tests.
- NOT RUN: real iPhone/Android, installed-home-screen acceptance, real AI reads,
  enrichment against staging, hosted deployment or human approval. Emulator/device
  profiles above are browser emulation, not physical devices. Do not treat this
  handoff as production or merge approval.
- No main merge or hosted commands were executed. The reverted palette is not
  reintroduced; the existing theme and 2500-ms main-branch startup are unchanged.

## Local demonstration

From `.worktrees/u8-partial-results`, run:
`EXPO_PUBLIC_PREVIEW=1 npx --yes pnpm@11.25.0 --filter mobile start --web --localhost --port 8094`.
Open http://localhost:8094. This explicitly uses existing demonstration products;
partial states use test-only API fixtures in `e2e-web/partial-results.spec.ts`.
