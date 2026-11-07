# OkBite: account-owner setup before the two-phone test

Prepared 6 November 2026. The owner has an iPhone and Android and requested this
setup guide. No accounts, hosted projects, builds or phone sessions were created.
Use the canonical [R1 setup](../../../.github/SETUP.md) for configuration and
[integration report](../integration-2026-11-05.md) for implemented services.

## What the owner does first

1. Sign in or register at [Expo](https://expo.dev/signup) and
   [Supabase](https://supabase.com/dashboard). Use the intended team/owner account.
   Complete account verification and any terms personally; do not send passwords
   or tokens in chat. Check with R1 before creating duplicate projects or buying
   services. No subscription purchase is needed just to prepare this handoff.
2. Tell R1 the Expo account/team name and Supabase project dashboard link.
   A dashboard link identifies the project; it does not grant project access.
   Coordinate any required collaborator access through the owner.
3. For the native iPhone build, confirm an existing Apple Developer team with R1
   or the professor. Without signing/team access, mark native iPhone blocked;
   Safari testing can proceed separately once the HTTPS preview exists.

## R1 links Expo and prepares builds

From `apps/mobile`, use the pinned repository toolchain:

```sh
corepack pnpm dlx eas-cli@27 login --browser
corepack pnpm dlx eas-cli@27 whoami
corepack pnpm dlx eas-cli@27 init
```

Record the real public project UUID. This app has dynamic config: supply it via
`EXPO_PUBLIC_EAS_PROJECT_ID`; do not fabricate it or overwrite the approved config.
The existing native app identifiers are `md.okbite.app`.

Copy `apps/mobile/.env.example` to a local ignored `.env.local`; fill the staging
URL, public client key and EAS project ID. The current code expects
`EXPO_PUBLIC_SUPABASE_ANON_KEY`; ask R1/R2 to confirm the compatible public client
key for the project. Never use a service-role/secret key as that value.
Set the matching public values in EAS `preview`; `development` also uses that
environment. Keep production values in EAS `production`.

R1/owner adds GitHub Actions secret `EXPO_TOKEN` and repository variable
`EXPO_PUBLIC_EAS_PROJECT_ID` through settings. A green preview workflow that only
reports missing setup has **not** published an update or generated an install link.
Do not put credentials into Git, screenshots, acceptance records or chat.

Before a native iPhone build, R1 registers the owner's iPhone and prepares signing:

```sh
corepack pnpm dlx eas-cli@27 device:create
corepack pnpm dlx eas-cli@27 build --profile preview --platform all
```

The owner opens the registration link on the iPhone and installs each build from
its actual EAS link. Android preview uses an internal APK; iOS requires the
registered device in the signed build. Record the build IDs and source SHA.
Use the existing `development` profile instead if R1 specifically needs a dev
client; a bundle export is neither an APK nor an IPA.

Sources: [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/),
[build profiles](https://docs.expo.dev/build/eas-json/),
[Supabase client/server keys](https://supabase.com/docs/guides/getting-started/api-keys).

## R2/R3 connect staging; R1 provides browser access

- R2 prepares the staging schema, storage, categories, Auth and moderation using
  the existing migrations. R3 deploys/configures `identify` and `read-label` with
  the approved server-side provider. Those functions are now in main; their
  presence is not evidence of a hosted deployment or actual provider accuracy.
- Verify the full `lookup` → `identify`/`read-label` → `add-product` flow against
  staging. R2/R3 retain server secrets in server settings. Do not use production
  customer data for the acceptance run.
- R1 configures the `apps/mobile` HTTPS preview using the Cloudflare section of
  the canonical setup. Supply its real URL and commit SHA. `localhost` on the
  computer is not a phone install or a public camera-capable preview.

## What to return to R5 (no secrets)

| Resource | Owner supplies |
| --- | --- |
| Expo project | account/team, project link and public project UUID |
| Staging | project link, configured public app environment, R2/R3 readiness |
| Android / iPhone | actual install links, build IDs and source SHA |
| Browser | HTTPS preview URL and source SHA |
| Phones | model, OS/browser versions and a time for the guided test |
| Evidence | authorized private folder for label photos and redacted results |

## Guided test with the owner's two phones

Use [S01–S16 and the execution record](beta/scenarios.md); do not tick scenarios
before observing them. Run native iPhone, native Android, Safari and Chrome.
First find a known product by barcode/front photo. Then add a genuine unknown
product with one/two label photos, correct the fields and verify the same saved
UUID on the other phone. Have R2 record moderation separately.

Then cover offline photos/manual codes, app restart and reconnect, several queued
items, interrupted review and retry after local storage failure. Verify large
photos, blurred codes, decimal commas, missing nutrients and controlled server
errors. Check dark/light, long names, 200% system text, VoiceOver/TalkBack,
keyboard behavior and denied-camera recovery. Browser zoom alone is not system
Dynamic Type evidence. Record failures with build SHA and owner, then retest.

Physical checks, Claude cross-review and human acceptance remain open. Signing
into the official Claude account can enable cross-review; do not send review
credentials to an unverified third-party proxy.
