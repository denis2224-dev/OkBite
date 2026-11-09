# C2 foundation verification — 9 November 2026

The original working checkout was behind current `origin/main`. C2 already
exists there: eight base tables, explicit grants and RLS, accent-insensitive
trigram search, private `uploads` and public `products` buckets, six local demo
products, and database tests. Root `supabase/` is the authoritative backend.

## Follow-up in this branch

`20261109115029_c2_foundation_guards.sql` is an additive migration. It:

- Enforces nullable, finite, nonnegative kcal/fat/saturated-fat/sugar/salt/
  protein/fibre values at the database level, including privileged imports.
  Invalid existing rows cause migration failure; no data is silently corrected.
- Runs `search_products` as the caller, preserving its signature, ranking,
  limit, accent handling, threshold and hidden-product filter while honoring RLS.
- Moves the privileged moderator membership lookup into the unexposed `private`
  schema. The existing public `is_moderator()` signature remains available to
  authenticated callers as an invoker wrapper; membership remains service-only.

`tests/foundation.test.sql` adds 29 assertions. Before the migration, 25 failed;
after it, all pass. A restrictive product policy is deliberately added inside a
rollback-only test to prove that search follows the same access rules as reads.

## Local verification

Tested with Supabase CLI 3.0.0, Docker and PostgreSQL 17, matching the hosted
projects' Postgres major version. Used a new disposable project
`okbite-c2-foundation-20261109` at `/tmp/okbite-c2-foundation-20261109`, DB port
59432. Existing local projects and checked-in configuration were left intact.

Copy `supabase/` to a new temporary project, omit `.temp/` and `.env*`, choose a
unique project ID and unused ports, and set its DB major version to 17. Then:

```sh
supabase --workdir <temporary-project> db start
supabase --workdir <temporary-project> db reset
supabase --workdir <temporary-project> test db
supabase --workdir <temporary-project> db lint --schema public,private --fail-on warning
supabase --workdir <temporary-project> db advisors --type security --level warn --fail-on warn
supabase --workdir <temporary-project> migration list
```

Clean reset and seed succeeded. All 132 assertions across eight database test
files passed. SQL lint and security advisors reported no warnings/errors.
Only reset a disposable project created for this verification.

Repository `pnpm lint`, `pnpm typecheck` and `pnpm test` also passed using the
locked pnpm 11.25.0 dependencies. ESLint reported 57 warnings in existing source
files and zero errors. This SQL-only change does not claim physical-device testing
or human/Claude approval.

## Hosted account status

The connected Supabase tool can access both `OkBite` and `okbite-prod`; no Chrome
access, new account, project creation or secret sharing is needed for this work.
Read-only inspection confirmed that both already have the C2 base tables and RLS;
`OkBite` also has the expected storage buckets. No hosted changes were made.

This follow-up is not deployed. Before deployment, reconcile each project's
existing migration history with current main, including the contribution receipt
and replay migrations. Never apply the demo seed to production. The ingredient
knowledge-base content and later backend features remain separate work.
