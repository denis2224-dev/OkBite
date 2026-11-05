# R1 verification handoff — 2026-11-05

D2/#6 and the original R2 stack merged independently. This follow-up preserves
R1's workflow and CODEOWNERS exactly. No remaining workflow patch is requested.

Keep the verified unit-only exclusion, alongside the provisioned integration job:

```sh
deno test --config supabase/functions/deno.json --allow-all --permit-no-files \
  --ignore=supabase/functions/_shared,'supabase/functions/**/*.integration.test.ts' \
  supabase/functions/
```

It runs **16 tests, 0 ignored** on this follow-up. Full credential-free discovery
runs 16 tests and explicitly ignores 11 integrations; complete local configuration
executes all **27 tests** without an additional opt-in flag. Partial/invalid
configuration fails before network access. Keep server credentials out of Expo env.

Retain the existing conditional generator guard:

```sh
pnpm sync-shared
git diff --exit-code -- supabase/functions/_shared
test -z "$(git ls-files --others --exclude-standard supabase/functions/_shared)"
```

Verified in disposable repositories with the actual generator: clean output
passes; changed, deleted and newly generated untracked output each fail.
Keep its existing generator-presence condition.

The missing local gateway CORS setup was reproduced, then fixed independently in
upstream commit `043746e`. Preserve the helper invocation before serving/testing
functions. Its LF/CRLF, unrelated-project rejection, service-isolation and
idempotence tests remain, with added stable-team/isolated-review cases.

Remaining D2 acceptance is owner-managed hosted/Expo/Cloudflare setup and real
physical-device checks. SHA pins, role owners, unit exclusion, drift detection
and local gateway setup are already resolved. R2's recorded review waiver remains;
no review, human approval, merge, deployment or protection change is claimed by
this task. R3 scoring/data and staging recovery remain separate pending work.
