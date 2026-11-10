# Backend release and recovery checklist — 9 November 2026

Prepared instructions only. No hosted deployment, configuration change, paid
resource, restore or approval was executed. Evidence and limits:
[Supabase C8 handoff](../../supabase/C8-OPERATIONS.md).

## Reviewed release candidate

- [ ] Integrate the backend tracks in dependency order, keeping migrations/shared
  generation with their owners. Select and record the exact combined SHA, target,
  operator, reviewer, approval and UTC window. Claude cross-review and human
  approval are still required; historical waivers do not satisfy this batch.
- [ ] From that clean approved checkout run `pnpm check`, shared generation/parity,
  Deno unit/live tests, all SQL tests, SQL lint/security advisors and the local
  value/receipt/photo drills on a newly created disposable PG17 stack with unused
  ports. Do not reuse/reset this or another agent's stack for the integrated proof.
- [ ] Inventory migration filenames/SHA-256 values, deployed function versions,
  reviewed source inputs and generated-code parity. Archive the exact source and
  actual runtime build/dependency inventory; compare repeated builds where supported.
  CLI help/version must be rechecked if changing from 3.0.0.

Preparation commands, run in the final approved checkout (no hosted mutations):

```sh
: "${REVIEWED_BACKEND_SHA:?Set the approved integrated SHA}"
: "${EVIDENCE_DIR:?Set an existing private absolute directory outside Git}"
test "$(git rev-parse HEAD)" = "$REVIEWED_BACKEND_SHA"
test -z "$(git status --porcelain)"
test "$(supabase --version)" = 3.0.0
supabase migration list --help
supabase db push --help
supabase functions deploy --help
supabase db dump --help
supabase storage cp --help
pnpm check
pnpm sync-shared
git diff --exit-code -- supabase/functions/_shared
shasum -a 256 supabase/migrations/*.sql > "$EVIDENCE_DIR/migration-sha256.txt"
git archive --format=tar "$REVIEWED_BACKEND_SHA" \
  supabase/functions supabase/migrations supabase/config.toml \
  > "$EVIDENCE_DIR/backend-source.tar"
shasum -a 256 "$EVIDENCE_DIR/backend-source.tar"
```

## Target and migration reconciliation

- [ ] Choose staging `vspdhdqaneofutsvavlc` first; production
  `ndnhzultkotujtkskulu` requires its own later approval. Recheck the link before
  every operation and pass the explicit target. Never use an implied linked target.
- [ ] Compare each actual hosted history with the integrated local inventory.
  The current production history includes replay admission but lacks older C2;
  ordinary push may refuse it. Inspect an explicit `--include-all` dry run only
  for this known older-migration situation. Apply it only if the complete exact
  pending list was separately reviewed; never use it as a generic drift repair.
- [ ] Include C6 receipt/publication/cleanup and AI quota dependencies before
  deploying their handlers. Stop on unknown histories or unexpected SQL. Never
  run a demo seed, reset, prune, history repair or destructive rollback on hosted.
- [ ] Compare the reviewed baseline's RLS, owners, effective grants/defaults,
  private schemas, service RPCs and extension versions against the actual target.
  Explain every expected managed-platform difference in restricted evidence.

After approval for the concrete target, read-only preparation may use:

```sh
target=vspdhdqaneofutsvavlc
case "$target" in vspdhdqaneofutsvavlc|ndnhzultkotujtkskulu) ;; *) exit 1 ;; esac
supabase link --project-ref "$target"
test "$(cat supabase/.temp/project-ref)" = "$target"
supabase migration list --remote="$target"
supabase db push --remote="$target" --skip-vault --dry-run
# Only for the separately reviewed older C2 inventory:
# supabase db push --remote="$target" --skip-vault --include-all --dry-run
```

## Recovery and owner/account actions

- [ ] Name primary/backup operators and independently test their access. Agree
  RPO/RTO, write-free export window, downtime decision and escalation route.
- [ ] Confirm backup entitlement/settings, available recovery points and retention
  in the owner account. Select encrypted off-site storage, region, least-privilege
  access, key custody, tested decryption, expiry/immutability and failure alerts.
  No destination, schedule, paid plan or retention policy is configured here.
- [ ] Back up roles, `public,private,auth,storage,extensions`, migration history and
  **both** buckets' bytes. Database backups contain Storage metadata, not photo
  bytes ([official guidance](https://supabase.com/docs/guides/platform/backups)).
  Inventory additional schemas/buckets before using the scoped helpers.
- [ ] Use `backup.mjs export-staging|export-production` only after target/window
  approval. It pins each target and leaves partial exports incomplete. Capture
  independent before/after counts, complete receipt-map digest, owners/effective
  ACL/default/extension digests and full value/sequence digest (`valuesSha256`).
  Use stable UTF-8 output and ordering; `recovery-values.sql` emits per-relation
  canonical hashes. Snapshot transactions must be read-only and the whole export
  window write-free. A matching row count or self-generated file hash is insufficient.
- [ ] Supply exact object paths/byte sizes in source evidence, validate exported
  file hashes and encrypt off-site copies. Verify receipt/product/ingredient/photo
  mappings, including C6 journals and queued removals. Preserve timestamps/metadata
  where required; compare downloaded restored bytes with the archive's SHA-256.
- [ ] `prepare-restore.mjs` only writes a plan/config for a staging-derived archive.
  Inspect/recheck actual unused Docker names, volumes and every configured port;
  reject linked/hosted/existing targets. Review bootstrap/roles/SQL/platform versions
  and outbound isolation before a separately authorized restore into a fresh target.
  It does not execute a restore or establish recovery.
- [ ] Restore values, owners, table/column/sequence/function/default grants, RLS,
  history, Auth associations and both buckets. Verify a nonempty receipt map and
  photo-to-product paths; replay/revocation checks require separate authorized
  staging fixtures. Record actual recovery duration and compare agreed RPO/RTO.
- [ ] Confirm AI keys/model/fallback and spend/global caps, Auth redirect/site URL,
  staff membership/revocation, SMTP, exact CORS preflights, bucket visibility and
  cleanup-job configuration from the integrated handlers. Keep secret values out
  of Git, chat, arguments and logs. Listing functions is not configuration proof.

## Deploy and rollback — execution remains pending

Only after the above gates and explicit hosted approval, use fail-fast execution
from the clean approved SHA, one target at a time. Recheck SHA/link immediately
before applying. Capture the dry-run list in the approval; an older C2 include-all
application needs the specifically approved variant, not an automatic retry.

```sh
set -eu
test "$(git rev-parse HEAD)" = "$REVIEWED_BACKEND_SHA"
test -z "$(git status --porcelain)"
test "$(cat supabase/.temp/project-ref)" = "$target"
supabase db push --remote="$target" --skip-vault
for function in lookup identify read-label add-product report moderate client-error; do
  test "$(cat supabase/.temp/project-ref)" = "$target"
  supabase functions deploy "$function" --remote="$target" --use-api
done
supabase migration list --remote="$target"
```

- [ ] Preserve the reviewed `verify_jwt=false` configuration; moderation still
  authenticates/authorizes in code and SQL. Honor CLI consent prompts. Never pipe
  `y` or claim a canceled command deployed. Account/secret changes require their
  exact separate approved change list.
- [ ] Record resulting versions/build hashes, UTC time and approval; repeat access
  inspection, exact gateway preflights and scoped staging probes. Existing staging
  lookup probes can append telemetry and are not zero-write audits. Do not run
  mutation-based local integration tests or fixtures against hosted projects.
- [ ] Complete approved staging write/retry/moderation/revocation/device acceptance;
  obtain the independent production decision only after staging evidence passes.
- [ ] Before rollout name the previous approved **schema-compatible** handler SHA
  and retain its artifact/config. On failure stop further rollout, record the
  stage and assess compatibility. Redeploy that exact compatible handler artifact
  with the same pinned-target loop, then re-probe. Keep additive data/migrations.
- [ ] If rollback compatibility is unproven, prepare a reviewed forward fix.
  Database restores, migration reversal and deletion of live photos are incident
  actions requiring their own impact/target/window decision; never an automatic
  rollback. Rehearse the chosen path on the integrated disposable stack first.
