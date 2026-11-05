# R2 local delivery — 2026-11-05

The remaining R2 contribution, moderation and recovery code is implemented and
published. This is local implementation/verification, not a production launch.
Review was waived by the user; no approvals, merges or deployment are claimed.

## Published stack

| Part | PR |
| --- | --- |
| C6a — atomic quota admission and write transactions | [#17](https://github.com/denis2224-dev/OkBite/pull/17) |
| C6b — add-product/report endpoints and photo compensation | [#18](https://github.com/denis2224-dev/OkBite/pull/18) |
| C6c — race/failure regression tests and contribution handoff | [#19](https://github.com/denis2224-dev/OkBite/pull/19) |
| C7a — authenticated moderation backend | [#20](https://github.com/denis2224-dev/OkBite/pull/20) |
| C7b — moderator session, callback and client | [#21](https://github.com/denis2224-dev/OkBite/pull/21) |
| C7c — admin forms, lists, photos and About entry | [#22](https://github.com/denis2224-dev/OkBite/pull/22) |
| C8 — moderation routine and verified local recovery tools | [#23](https://github.com/denis2224-dev/OkBite/pull/23) |
| C7d — connected local browser verification and final handoff | [#24](https://github.com/denis2224-dev/OkBite/pull/24) |

`C7d-browser-integration` contains the combined result. The earlier checkpoints
include the applicable test-runner, callback-token and decimal-format fixes.
No graph outputs, credentials, dumps or photo backups are committed.

## Integration order

Existing schema/generation/function PRs #7–#12 are still dependencies. The admin
screens reuse R4/B1 PR #15. After each prerequisite merges, retarget the next
dependent PR to `main` before merging; merging into an old feature branch alone
does not update `main`. Then integrate #17 → #18 → #19 → #20 → #21 → #22 → #23 → #24.

R4's draft PR #16 uses a different application layout. If that becomes the chosen
foundation, reconcile the C7 screen/client paths with that layout first; the R2
browser verification here uses the approved `apps/mobile` layout and PR #15.

## Evidence

- Frozen-lockfile installation, byte-identical shared generation, lint/typecheck
  and web export pass. Lint retains the 33 existing C1 schema/type-name warnings.
- 235 workspace tests pass: 112 shared, 104 mobile, 13 data scripts and 6 generator.
- 24 Deno tests pass, including real database/storage/Auth and live Edge gateway.
- The fresh local restored database passes all 87 pgTAP assertions; owners/grants
  and selected application/Auth/Storage counts are preserved.
- Private and public JPEG fixtures restore with identical SHA-256 hashes.
- A real local browser OTP flow verifies token-fragment removal, report closure,
  empty-name rejection, product verification and access gating after reload.
  The test account/product/report/photos were removed. No external email was sent.

See `supabase/CONTRIBUTIONS.md` for failure/quota semantics and
`docs/ops/moderation.md` for setup, the moderation routine and recovery commands.
Private local drill evidence is outside Git under
`/private/tmp/okbite-r2-backups/verified-drill/`; it is not a standing backup service.

## Still pending before full acceptance

1. R3/C4 and human-checked A3 fixtures: the real score engine is absent. C6 uses
   the approved C3 `unavailable` placeholder. Real-score acceptance is not complete.
2. R3 production content loading/source validation. Demo fixtures are not verified
   real products and must not become production provenance.
3. A hosted Supabase project, hosted Auth/CORS setup, staging verification and
   staging recovery. The user confirmed no hosted project is configured.
4. Real iPhone/Android callback/UI checks and human names for the moderation rota.
