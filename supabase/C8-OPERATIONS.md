# D7/C8 operations — 9 November 2026

Source implementation: `6e8e572b0cee3b834ad2fd33579ff03c0f1d6149`, based on
`9704b38` (C2 guards and C3 lookup). Work was confined to
`okbite-c8-operations`, branch `C8-operations-followup`.

| Evidence boundary | Status |
| --- | --- |
| Local implementation and repository checks | Passed, with inherited lint warnings |
| Local synthetic SQL recovery | Passed, including nonempty receipts and exact values |
| Local private/public photo bytes | Passed independently of the SQL restore |
| Hosted migration/function inventory | Read-only inspection completed |
| Hosted backup export/recovery, deployment and runtime acceptance | Not performed |
| Claude review and human approval | Not obtained; required before integration/release |
| Account backup destination, retention, RPO/RTO, operator availability | Owner decisions remain open |

## Reused work and confirmed defects

Inspected `P-R2-production-hardening`, `P-R2-1-backend-deploy`,
`P-R2-5-backup` and `C8-scoped-staging-probes`. Reused the existing guarded
CLI v3 recovery invocation and the backup/restore-preparation helpers and tests;
no second export/probe implementation was created. Those imported helpers account
for 426 lines of existing work, kept in two separate reuse commits.

1. Existing recovery used `--db-url` without CLI v3 consent. The local drill
   failed; the reused `localRecoveryTestArgs` restricts its explicit target to
   the copied local DB port and a generated `okbite_restore_<12 hex>` database.
2. The archive omitted C2's `private.is_moderator()`. After fixing invocation,
   restored pgTAP failed with `schema "private" does not exist`. Both local and
   prepared hosted exports now include `private`; local recovery also includes
   `supabase_migrations` and compares their ownership/grants.
3. Most tables previously had only row-count comparisons. `recovery-values.sql`
   compares complete canonical rows (including duplicates and nulls) and sequence
   state. The rollback-only regression changes nutrition, a photo path and a
   product mapping while retaining the row count, and detects the difference.
   Local backup rejects source changes during export. Sealing a prepared hosted
   archive now requires an independent `valuesSha256`, as well as receipt,
   access and extension checksums; changing values with unchanged counts refuses
   sealing. The helpers prepare exports/plans; sealing does not prove restoration.
4. Raw diagnostics could persist callback tokens in message/stack URLs. A failing
   handler test reproduced this. Ingestion now strips URL queries/fragments and
   credentials, bearer values, common key/JWT forms and email addresses before
   storage. Message/stack/screen/version stay within the existing contract bounds.
   The real gateway test checked the exact persisted redacted values.

Redaction is best effort: arbitrary prose and URL paths can still contain personal
material. Diagnostics remain restricted operational data; do not deliberately log
photos, label text, credentials or user material. No retention job was added.
Existing strict schema/body-byte checks, error sanitization, CORS and service-only
atomic admission remain in use. The live 49-plus-six concurrency test admitted
exactly one diagnostic, returned 429 at 50 and admitted again after 24-hour expiry.
Anon access to diagnostic rows/RPC was denied. Existing SQL tests deny statistics
and diagnostics to ordinary authenticated users as well.

## Local proof

Created only `okbite-c8-operations-20261109-a7f4` in
`/private/tmp/okbite-c8-operations-20261109-a7f4`; API 63431, DB 63432,
shadow 63430, studio 63433 (excluded), mail 63434. Ports were checked unused.
Copied the backend without `.temp` or `.env*`, selected PG17, and extended only
that temporary copy's local-project allowlist with this exact fixture ID.
Checked-in defaults and every pre-existing stack were left alone.

Tools: Node 24.19.0, pnpm 11.25.0, Deno 2.9.8, Supabase CLI 3.0.0, PG17.
Connection files stayed outside Git with mode 0600. Data was demo/synthetic only.

Executed checks:

- `pnpm check`: lint (zero errors, 57 existing warnings), all typechecks, repository
  tests and data validation passed. No application/root/CI files changed.
- Shared generation was byte-for-byte unchanged. Deno type checking passed.
- 49 Edge unit tests; six diagnostics handler tests; five network-denied staging
  probe guard tests; twelve Node backup/restore/local-target guard tests passed.
- Five live diagnostics/HTTP/storage tests passed. They exercise quota concurrency,
  rollover, gateway redaction, strict CORS and private/public storage access.
- Eight SQL files / 132 assertions passed on the source and restored database.
  SQL lint on `public,private` and local security advisors found no issues.
- Value-change regression passed. Final restore at 13:03 UTC compared 53 tables/
  sequences, database/schema/relation/column/routine/default owners and grants,
  all seeded nutrition/ingredient values, Auth/Storage metadata and migration history.
- One synthetic receipt mapped a known demo product to a synthetic upload path.
  Its independently captured complete-row mapping SHA-256 matched the restored
  report; `check-recovery-receipts.mjs` passed. This synthetic path is not evidence
  that a real shopper's associated photo was recovered.
- Existing `restore-photos.ts` downloaded, deleted, reuploaded and re-downloaded
  fresh UUID JPEG fixtures in both buckets; both SHA-256 values matched. Fixtures
  were removed. This is binary round-trip proof in one local Storage service,
  separate from SQL recovery, not a hosted or full Storage-service rebuild.

A receipt run overlapped mutating integration fixtures and correctly refused with
`Source changed during backup`. It was rerun successfully after all writers ended.
Temporary recovery databases were dropped by `finally`; archives are local private
artifacts, not a durable off-site backup or an approved retention destination.

Restricted logs/artifacts: `/private/tmp/okbite-c8-{check-final,live,db,dblint,advisors,values,ops-all,probes}.log`,
`/private/tmp/okbite-c8-restore-final/report.json`,
`/private/tmp/okbite-c8-photo-evidence/photo-report.json`, and
`/private/tmp/okbite-c8-bundle.json`. They are machine-local and not committed.

## Hosted inventory and limitations

Read-only Supabase inspection on 9 November confirmed:

| Project | Actual migration versions | Active functions |
| --- | --- | --- |
| `vspdhdqaneofutsvavlc` (OkBite, staging) | 20261105000000, 20261106000000, 20261107000000, 20261108000000 | lookup/add-product/report/moderate/client-error v2; identify v1; read-label v4 |
| `ndnhzultkotujtkskulu` (okbite-prod) | Same first four, plus 20261109000000 and 20261110000000 | All seven v6 |

All inventoried functions have `verify_jwt=false`. Both projects report PG17.11.
Neither migration history contains `20261109115029_c2_foundation_guards`.
Read-only access inspection on both targets confirmed private uploads/public
products, service-only stats, denied anon/authenticated diagnostic reads/RPC, and no
private moderator helper. Staging has no receipt table; production does. Version numbers and hosted bundle hashes do not prove equality
with this checkout. No hosted function invocations or writes were performed.
Automatic approval review temporarily blocked the staging permissions query and
a local statistics value check because of an account usage limit. After the user
continued the task and approval review resumed, both ran successfully. The local
service role read the expected 2 photos, 1 barcode and 1 addition from rollback-only
synthetic events; no persistent fixture events were added.

Local inventory contains seven migrations, including the older C2 timestamp before
replay admission. The C6 track additionally owns photo-moderation/publication-journal
migrations (`3f15b5d`, followed by `cc51c8e` in its branch); C7 integrates moderation.
After integration, rediscover all tables and preserve `publication_journal` and
`photo_removals` even without foreign keys. Wait for unsettled attempts before any
orphan reconciliation; do not delete photos referenced by live products.

## Source bundle reproducibility

Two independent `git archive --format=tar` runs at the source SHA above, for
`supabase/functions supabase/migrations supabase/config.toml`, produced identical
266240-byte archives with SHA-256
`cdf36f1f0b80b366ef75fe44432d0aef87356dd992bd1a7ed0f373d27f861482`.
No seed, environment files or link metadata was included. SDK imports are pinned;
generated code matches source. This proves reproducible checked-in deployment
inputs, not reproducible hosted ESZIP/transitive dependency resolution: the Deno
configuration has locking disabled. Preserve the actual build artifact/dependency
inventory in the final approved deployment record; no hosted build was performed.

**Refresh all deployment/restore evidence against the integrated branch after the
other tracks merge.** This branch's synthetic local proof cannot release the app.
The exact pending deployment, rollback and account decisions are in
[the operations checklist](../docs/ops/c8-release-checklist-2026-11-09.md).
