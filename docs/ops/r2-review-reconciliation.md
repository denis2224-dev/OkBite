> Current completion evidence and dependency order: [R2 completion handoff](r2-completion-2026-11-05.md).
> The run-specific text below is historical. #40 supersedes #30 reconciliation;
> new R2 fixes are #59/#60/#61. Recorded waivers do not imply new approval.

# R2 review reconciliation — 2026-11-05

All original R2 PRs #7–#12 and #17–#24, plus D2/#6, were merged independently
while this task was validating. None was merged or force-pushed by this task.
The remaining fixes are a single follow-up to main `3914c88`, preserving those
merges and the integration coordinator's CI, dependency and regression-test work.
Review remains waived by the user; no AI review or human approval is claimed.

## Findings

| Finding | Result |
| --- | --- |
| Obsolete C1 bases / main conflicts | Already reconciled and merged independently |
| Three Windows generator fixture links | Already fixed upstream; all choose junctions on Windows and directory symlinks elsewhere |
| Linked-output protection | Preserved, including the untouched-target assertion; Node's junction test confirms lstat/isSymbolicLink behavior |
| Node/Vitest collision and shared exports | Already fixed upstream; existing scripts, APP_NAME, EAN/allergens/score exports retained |
| Lookup telemetry causing 502 | Already fixed upstream with found/not_found regression; retained unchanged and added sanitized-diagnostic coverage |
| Integration discovery | Follow-up validates complete local configuration before registration and initializes C6 clients inside fixtures |
| Partial/invalid configuration silently skipped | Fixed: only wholly absent configuration is ignored; broken configuration fails before network access |
| Worktree-specific config | Fixed: team project `okbite`, API 54321 / DB 54322, preserving JWT/Auth/callback settings |
| Local maintenance guards | Fixed: explicit known local-ID allowlist shared by CORS and recovery; no arbitrary project/container accepted |
| Recovery TLS failure | Reproduced and fixed with PGSSLMODE scoped only to the disposable loopback pgTAP subprocess |
| CI unit exclusion, drift detection, pins, owners, ready state | Already resolved upstream; existing R1 workflow preserved |
| CI local gateway CORS setup | Reproduced missing setup, then observed the independent upstream fix; preserved its seven gateway assertions/cases |
| Waiver removal, merges, deployment, protection | Not performed by this task; user's recorded waiver retained |

Node's [junction regression test](https://github.com/nodejs/node/blob/v22.x/test/parallel/test-fs-symlink-dir-junction.js)
asserts lstat/isSymbolicLink for a junction. macOS generator execution passes;
Windows execution is unavailable. The local recovery connection workaround is
consistent with [Supabase's CLI bug](https://github.com/supabase/cli/issues/5873)
and was verified by an actual restore.

## Validation

- Frozen installation, lint, typecheck and mobile web export pass.
- Workspace: **243 passed**, no skips: 6 generator, 112 shared, 104 mobile,
  13 data checker, 7 local gateway and 1 local-project guard. Each suite runs once.
- All six generated files regenerate byte-identically twice; none edited by hand.
- Deno checks all function TypeScript. Credential-free discovery, also with network
  denied: **16 passed, 11 ignored**. Ignored integrations are not passing tests.
- Partial and invalid configurations each fail clearly before network access.
- Existing CI unit command: **16 passed, 0 ignored**.
- Fully configured DB/Storage/Auth/live-gateway suite: **27 passed, 0 ignored**.
- Isolated database: **87 pgTAP assertions pass**, database lint clean.
- Disposable restored database: same counts/owners/grants, **87 assertions pass**;
  private/public JPEG recovery matches SHA-256 and cleans up its fixtures.
- Current CI drift logic and its status-based equivalent both detect changed,
  deleted and newly generated untracked files; clean generation succeeds.

Inherited notices: 33 C1 schema/type-name lint warnings, Expo color-environment
notice, pinned CLI update and Edge Runtime standard-library-version notices.
All listed checks exit successfully. Historical browser OTP evidence is retained;
no new physical-device or browser OTP acceptance run is claimed.

## Delivery and remaining acceptance

The original stack is merged; there is no remaining stacked merge order. Review
and merge the follow-up into main next, after its checks and the user's release
process. No closed PR branch was overwritten. R1's copyable verification handoff
is in `r1-review-handoff.md`; no workflow/CODEOWNERS/protection file was edited.
R3/C4 scoring, human-checked data, hosted Auth/CORS and staging recovery, Windows,
physical iPhone/Android acceptance and a named rota remain outside these fixes.

Only `/private/tmp/okbite-R2-review-fixes` was edited. Existing worktrees, .idea
files and running C2/C3/C6 services were preserved. Tests use the separate
`okbite-r2-review` project at ports 58430–58434. Private configuration and recovery
evidence stay outside Git under `/private/tmp/okbite-r2-review-recovery`.
Original and subsequent remote snapshots are saved as
`/private/tmp/okbite-R2-pr-recovery-20261105.json` and
`/private/tmp/okbite-R2-pr-recovery-publish.json`, with original local recovery refs.
No graphify-out, credentials, dump or photo bytes are committed. No merge,
deployment or branch-protection change was performed by this task.

## Coordinator compatibility fix

The independent `CI-isolated-services` branch assigns project IDs per GitHub
run/attempt. This follow-up's fixed allowlist initially rejected them. A regression
was observed failing, then fixed by allowing only the exact numeric run/attempt
ID when GITHUB_ACTIONS is true. Other attempts, runs, arbitrary projects and
non-CI use remain refused. Existing maintenance/CORS guards are preserved.
This R1/R2 integration change requires independent review and human approval in
the coordinator's run; historical waiver text does not grant that approval.
The added Node regression raises the workspace total by one; current exact-head
CI is authoritative. No hosted services, migrations or contracts were modified.
