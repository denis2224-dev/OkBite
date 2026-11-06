# Scoped staging smoke checks

This operator-run command accepts only
`https://vspdhdqaneofutsvavlc.supabase.co` and a public anon/publishable key.
It rejects other projects, paths, credentials in URLs, secret keys and non-anon
JWTs before I/O. It refuses redirects and prints only check names/statuses.
Do not paste keys into chat, logs or Git. This audit has not run it on staging.

Use the operator's existing **public-only** mobile environment file:

```sh
deno run --config supabase/functions/deno.json \
  --env-file=apps/mobile/.env.local \
  --allow-env=EXPO_PUBLIC_SUPABASE_URL,EXPO_PUBLIC_SUPABASE_ANON_KEY,OKBITE_STAGING_KNOWN_CODE \
  --allow-net=vspdhdqaneofutsvavlc.supabase.co:443 \
  supabase/ops/staging-smoke.ts
```

Six checks cover exact allowed localhost preflight, rejected origin without an
allow-origin header, missing device ID, malformed code, unauthenticated moderation
and a schema-valid lookup. The moderation body is deliberately empty and there
is no staff token. No provider, contribution, authorized moderation, fixture setup,
cleanup or configuration mutation is attempted. A successful lookup may append
ordinary usage telemetry; this is not a zero-write database audit.

Without `OKBITE_STAGING_KNOWN_CODE`, lookup may correctly return `not_found`.
Set that environment variable to an actual accepted product's barcode to require
`found`. A demo/seed match is not evidence that its nutrition was human checked.

This smoke does not prove label accuracy, second-device visibility, moderator
writes/revocation, offline recovery, duplicate prevention, phone accessibility,
production configuration or hosted restore. Execute those operator/phone checks
separately and record SHA, build, device/OS, expected/actual outcome and restricted
evidence location. Keep authorized photographs and expected transcriptions outside
Git. Existing loopback-only integration/recovery guards remain unchanged.

Guard regression command (network denied):

```sh
deno test --config supabase/functions/deno.json --deny-net \
  supabase/ops/staging-smoke.test.ts
```
