# Repository integration audit — 2026-11-05

This is an implementation and verification handoff. It does not attest staging,
physical-phone or production acceptance. No merge was performed by this coordinator.

## Published integration fixes

- D2 CI: reconcile B1 and concurrent dependency work without rewriting history;
  preserve CODEOWNERS ordering/role exceptions and alternate reviewers; detect
  tracked drift and newly generated untracked output; explicitly load Deno config;
  run ordinary unit tests separately from opt-in local-service integration tests.
- Generator: use Windows junctions for directory-link fixtures; preserve both
  Node generator and Vitest data suites with distinct runners; regenerate shared
  output using `scripts/sync-shared.mjs` only. EAN, allergens and score exports
  are preserved throughout C3 and the contribution/moderation stack.
- Lookup: optional analytics rejection preserves found/not-found responses;
  product-loading failures and invalid responses still fail. The regression was
  observed failing (502 instead of 200), then passing; real Deno CI also passed.
- Local gateway: invoke the repository's existing strict-CORS helper in CI and
  move its already-published dedicated-C6 support forward from C7d. Existing
  204/exact-origin/spoof-rejection assertions are unchanged. Five Node tests cover
  LF/CRLF, C3/C6, refusal of unrelated projects, other-service preservation and
  idempotence. CRLF already worked and was not changed speculatively.
- CI isolation: after main run 41988193520 failed with host DB port 56432 already
  in use, give every workflow run/attempt its own local project and five available
  ports. Two focused tests pass. The committed developer configuration is preserved;
  only the runner checkout gets temporary service settings. No existing DB is reset.

Ownership: these necessary integration changes cross R1 CI/root tooling, R2
functions/operations, R3 shared exports and R4 B1 dependencies under the user's
explicit authorization. Relevant role owners must review them. No contract or
migration semantics were changed by the coordinator. No generated file was edited
by hand, no alternative scaffold was added, and no shared branch was force-pushed.

## Exact verification evidence

| Scope | Tested SHA | Evidence |
| --- | --- | --- |
| D2 | `ac09a1c3712ebd57056a00cc75afe8c6bf6844c9` | [CI success](https://github.com/denis2224-dev/OkBite/actions/runs/41985794942) |
| C3 generator | `6ff63740defdecd49af9d02424c045c975a99573` | [CI success](https://github.com/denis2224-dev/OkBite/actions/runs/41986619857); 6 Windows generator regressions also pass |
| C3 HTTP | `8a0a9a5b522e9fd315df34093e6b6462cee29df9` | [CI success](https://github.com/denis2224-dev/OkBite/actions/runs/41987075792); 75 pgTAP assertions, DB lint, Deno and workspace checks |
| C3 storage | `11b491021013439f08038108b322a8fc859ba66c` | [CI success](https://github.com/denis2224-dev/OkBite/actions/runs/41987080505) |
| C3 lookup | `043746ebf9ae6eee247ecba22a0f170c58ff0932` | [CI success](https://github.com/denis2224-dev/OkBite/actions/runs/41988342868); 235 workspace tests, 11 Deno unit tests, 17 tests with local services, 75 pgTAP assertions |
| Combined R2 code | `d3431019f3a3fb27cd9e1f2d3f44ae80666a9ba6` | [CI success](https://github.com/denis2224-dev/OkBite/actions/runs/41988512575); 240 workspace tests, 14 Deno unit tests, 25 with local services, 87 pgTAP assertions |
| Main after all backend merges | `3914c889293af9b6a0616db1aaea9f730a1cf9e4` | [CI success](https://github.com/denis2224-dev/OkBite/actions/runs/41989145729); 240 workspace tests, 14 Deno unit tests, 25 with local services, 87 pgTAP assertions |
| New CI run isolation | `c46342048e6b7714fa655c7965efac990e9e0d90` | 2 local Node tests, ESLint and diff checks pass; exact-head service CI must also pass |

Successful CI includes frozen pnpm installation, lint, strict typecheck, meaningful
workspace tests, generated drift/Deno checks, web export, real runner-local
Postgres/Storage/Auth/Edge checks where present, and cleanup of that runner's stack.
The 33 inherited contract schema/type-name lint warnings remain; lint exits zero.
An EAS workflow success with missing setup is not evidence of a published QR preview.

The local Windows session could not access the Docker API or download uncached npm
packages. Full D2/service claims above come from the linked GitHub jobs, not from
this workstation. The local Node portability harness is not represented as Deno.
A fresh staging recovery drill, phone/browser acceptance and production checks
were not performed by this coordinator.

## Current task status and next actions

- C1, D1, D3, B1 and A2 code are merged. D2 and C2/C3 PRs #6–#12 were merged during
  this run by `itsjohnyoff`, independently of this coordinator. New main CI must be
  checked after each merge; a green PR alone is insufficient.
- C6 (#17–#19), C7 (#20–#22/#24) and C8 (#23) are implemented and integration fixes
  are propagated. Required cross-review and human approval remain pending.
  Integrate one dependency at a time: #17 -> #18 -> #19 -> #20 -> #21 -> #22 -> #23
  -> #24, retargeting the next PR to main only after its predecessor merges.
- R3: real C4 scoring and A3 fixtures remain absent; the explicit unavailable-score
  placeholder is not a working score engine. A2 currently has 18 categories, 172
  ingredient drafts and zero checked ingredient entries. Data validation passing
  does not replace human source checks. C5/D4/D5 and photo grading remain pending.
- R4: #16 still carries a competing root application and cannot merge into the
  canonical layout. Draft replacements #25–#29 port work into apps/mobile; inspect
  their evolving chain, reconcile the lockfile with pinned pnpm 9.12.0 (the draft's
  evidence used pnpm 11), then obtain R1 review and UI/device acceptance. Do not
  treat these drafts as completed B4/B6 acceptance.
- R5/Gemini: #14 and B7-add-flow remain read-only. This run made no edit, push,
  rebase, retarget, close or merge there. B2/B3/B7 acceptance still depends on
  results/history, real identify/read-label functions, scoring, staging upload
  checks and real iPhone/Android testing.
- R1/repository owner: enforce planned main protection, required ci and CODEOWNERS
  review. The branch endpoint reported protected=false and the ruleset list was
  empty. Review lists contained no human approvals in the audited open PRs.
  CODEOWNERS ordering passes nine representative path checks; collaborator
  permission revalidation was blocked by connector 403, so old evidence is not
  presented as a new permission check.

Historical statements in old descriptions/documents that review was waived do not
waive this run's explicit cross-review/human-approval requirement. No self-approval,
review waiver, branch-protection bypass or production deployment was performed.

## Metadata and access blocker

Git pushes work, but the GitHub connector returned 403 for PR/issue-description
updates and PR creation. The browser fallback was stopped because its current URL
could not be determined safely. PR descriptions could not be updated through those
channels. Ready-to-apply replacement bodies and the final exact-head CI snapshot
are supplied in the coordinator's local delivery artifacts. The additional branch
`CI-isolated-services` is published for a focused R1/R2 review; opening its PR was
blocked by the same 403. The isolation fix and this report remain on that review
branch, separate from the independently merged backend. A narrowly scoped push
trigger verifies this branch even while PR creation is unavailable; it does not
publish an app, change secrets or deploy anything.

No shared C:\ASCS\OkBite files or pre-existing worktrees were edited. Its existing
AGENTS.md change, staged/uncommitted work and all published branches were preserved.
