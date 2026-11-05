# Moderation and recovery

R2 handoff, 2026-11-05. Review was waived by the user; no approvals, deployment or
real-phone verification are claimed. There is no hosted Supabase project yet.

## Before a hosted rollout

1. The project owner creates `okbite-staging`, keeps credentials in environment
   settings, and applies the reviewed migration chain. Demo seed data is for local
   or staging only; R3 owns production content and human source checks.
2. Configure only the Supabase URL and public anon/publishable key in the app's
   `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never put a service
   role key or database password in the app, a public build or Git.
3. Create/invite the actual staff Auth users, then a trusted database administrator
   adds their real UUIDs to `public.moderators`. Shoppers remain account-free.
4. Configure Auth redirect allowlists for the actual deployed `/admin` URL,
   `okbite://admin` in native builds, and the chosen development callback. OTP
   sign-in has `shouldCreateUser: false`; only existing staff accounts can sign in.
5. Verify function secrets, Auth token verification, membership revocation, bucket
   permissions and exact-origin CORS through the hosted gateway. `moderate` checks
   `Auth.getUser(token)` and membership itself, then a service-only transaction
   rechecks membership. A hidden navigation link is not access control.
6. On a real iPhone, Android and phone browser: sign in, verify a shopper-added
   product against its photos, hide it, close a report, sign out and check access
   is removed. These checks are pending, not replaced by unit tests.

The C7 screen lives at `/admin`; long-press the version in About to open it.
The minimal About entry is a necessary C7 integration change. When R4/A4 replaces
that shell, retain `AdminEntry`; the existing R4/B1 foundation is a dependency.
Local browser evidence: OTP mail was captured only by the local mail catcher;
moderator sign-in, router fragment cleanup, report closure, empty-name validation,
product verification and access gating after reload all passed using disposable
records. The test account/product/report/photos were removed afterward.

Admin sessions are in memory, public builds hold no privileged credentials, and
web callback tokens are removed from the address fragment after consumption.
Allow the exact native/browser callbacks used by the deployed build; do not use
wildcard production redirects. A successful callback still requires a current
moderator membership check. Revocation must block both the client and a direct
`moderate` request; removing navigation alone does not revoke access.

## Daily routine

- Open the newest-first unverified list and work through all outstanding products.
  Compare name, brand, quantity, category, per-100 g/ml nutrients and ingredient
  text with the actual photographs. Blank/unreadable values stay null.
- Compare declared allergens, including bold label text, and separate “may contain”
  traces. Correct extraction/matching errors; never infer missing label facts.
- Verify only after a human has checked the label and the explanation sources.
  Unknown ingredients retain their raw text without invented explanations.
- Hide misleading, unreadable or inappropriate submissions with a concrete reason.
  Hidden products must disappear from shopper lookup and search immediately.
- Open reports, inspect the referenced product/photos, correct or hide when
  warranted, then close each report. Record unresolved issues for the responsible
  role; a closed report is not proof that a food claim is correct.
- Check failures and quota/storage anomalies. Reconcile public bucket UUID prefixes
  against product records after a storage outage; remove only confirmed orphan
  objects after a safe grace period. Preserve every referenced product image.
- Record counts reviewed, hidden and unresolved plus the next handoff. Do not copy
  device identifiers, tokens, raw dumps or private photographs into public issues.

## Human rota — assign before launch

| Dates (Europe/Chisinau) | Named primary | Backup |
| --- | --- | --- |
| 2026-12-08–2026-12-14 | To be assigned by the team | To be assigned |
| 2026-12-15–2026-12-21 | To be assigned by the team | To be assigned |
| 2026-12-22–2026-12-28 | To be assigned by the team | To be assigned |
| 2026-12-29–2027-01-04 | To be assigned by the team | To be assigned |
| 2027-01-05–2027-01-08 | To be assigned by the team | To be assigned |

## Local recovery commands and evidence

Use the stable team `okbite` defaults, API 54321 / DB 54322. For isolated
reconciliation tests, use the separate `okbite-r2-review` configuration, API 58431 /
DB 58432, and run the copied scripts from that configuration directory. Existing
C2/C3/C6 services are never reset. Maintenance scripts accept only the explicit
local IDs in `supabase/local-project.mjs`; arbitrary project IDs are refused. Required versions used: Node 22.23.4, pnpm 9.12.0, Deno 2.9.6,
Supabase CLI 2.65.5 and local PostgreSQL 15.

```sh
pnpm install --frozen-lockfile
pnpm sync-shared
supabase start
node supabase/ops/restore-local.mjs /private/tmp/okbite-r2-recovery
deno run -A --env-file=supabase/.env.c6-tests \
  supabase/ops/restore-photos.ts /private/tmp/okbite-r2-recovery
```

Set `SUPABASE_CLI_BIN` when the CLI is not on PATH. Populate the ignored test env
from **this local stack's** status; it is a server-only file and must never be
loaded into an Expo build. The photo script requires the API port in the copied
local configuration and an allowlisted local project. It refuses hosted URLs, other local stacks, URL
credentials, paths, queries and fragments before creating fixtures.

The database script dumps `public`, `auth`, `storage` and `extensions`, retaining
owners and grants. It creates a fresh disposable database in the local cluster,
restores pre-data, recreates the installed extensions from the captured list,
then restores data and post-data. It compares source/restored counts plus schema,
relation, column, routine and default-privilege owners/ACLs, then runs the full
pgTAP suite against the restored copy before dropping only that copy.
The source database is not reset or replaced.

A schema-scoped dump does not include extension definitions. Installing them
between pre-data and data is required for generated product search columns.
Supabase-managed GraphQL/Realtime/platform schemas are deliberately outside this
application drill; a hosted recovery needs the platform bootstrap/configuration
and its own documented backup procedure.

Verified on 2026-11-05: fresh database restored successfully; all **87 database
assertions passed** on the restored copy. Private evidence is in
`/private/tmp/okbite-r2-backups/verified-drill/report.json` for this session.
The photo script separately creates two disposable UUID fixtures, downloads private
and public JPEGs, removes/reuploads those fixtures from backup, checks identical
SHA-256 hashes and cleans them up. Both photo round trips passed. This proves the
local components, not an end-to-end hosted disaster recovery.

Dumps and photo bytes are outside Git, directory mode 0700 and files 0600. Preserve
actual deployment backups in approved encrypted storage with restricted access;
temporary local evidence is not a standing backup service.

## Remaining acceptance

- R3/C4's real score engine and human-checked A3 fixtures are absent. C6 currently
  returns the approved C3 `unavailable` score response. Do not call scoring complete.
- Hosted project setup, a staging restore drill, hosted CORS/Auth checks and native
  magic-link checks remain pending. No staging success is claimed.
- The rota needs human names and the owner must confirm recovery access and backup
  retention. Never fill these with invented confirmations.

The pinned CLI recovery check sets `PGSSLMODE=disable` only for its loopback
pgTAP subprocess: the drill reproduced a TLS connection failure even with URL
`sslmode=disable`. Supabase tracks the connection-option round-trip bug in
[CLI issue #5873](https://github.com/supabase/cli/issues/5873). Hosted connections
are not accepted by this recovery tool.
