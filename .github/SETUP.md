# D1/D2 setup and acceptance

The scaffold and CI can run without hosted service credentials. Native EAS
builds, QR previews, and Cloudflare preview URLs require the setup below.
Never put tokens, service-role keys, or AI keys in app config or public variables.

## Reproducible toolchain

R1 policy revision (2026-11-05): pnpm **11.25.0**, pinned in `package.json`,
replaces the initial 9.12.0 plan value. PR #25 had already merged pnpm 11
build approvals while the declaration still named pnpm 9. This revision makes
local development, CI and Cloudflare use the same version and retains the
24-hour minimum release age (`minimumReleaseAge: 1440`). No age exclusions
are granted. Only esbuild and @parcel/watcher may run dependency build scripts.
The existing hoisted layout is declared with `nodeLinker: hoisted` in
`pnpm-workspace.yaml`; pnpm 11 no longer reads install settings from `.npmrc`.
Root Supabase uses the same 2.118.0 client as the target app; the former
2.119.0 lock entries were younger than the release-age limit.

Use `corepack pnpm` when a bundled/global pnpm differs; it reads the declared
version. `pnpm verify:toolchain` and the install lifecycle reject a different
version or npm. The `pnpm:devPreinstall` guard rejects pnpm 9
before it can execute any dependency build scripts. Node 22+ remains required; CI reads `.nvmrc` (22).
When switching from pnpm 9 or a different linker, delete the regenerable
`node_modules` directories at the root, `apps/mobile` and `packages/shared`,
then reinstall; stale workspace links can load two React instances.

Regenerate lockfiles with this exact version and the committed policy; never
change the release age, force a frozen install, or use `--ignore-scripts` to
hide a build failure. Commit regenerated lockfiles separately from source.

`apps/mobile` is the native/web application. Normal root dev/start/web/native
commands and CI exports use this workspace. The merged root preview source
and its tests remain migration references; they are not a second CI deployment.

## Local development

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm dev
pnpm --filter mobile web
pnpm dlx serve -s apps/mobile/dist
```

D1 uses stable Expo SDK 58 and its template-supported TypeScript 6.0. The home
route imports `APP_NAME` from `@okbite/shared`. The two required tests were run
failing before their implementation, then passing.

## Expo/EAS (R1)

1. Sign in to the intended Expo account: `pnpm dlx eas-cli login`.
2. From `apps/mobile`, run `pnpm dlx eas-cli init` to create or link OkBite.
   This repo uses dynamic config: put the resulting public project UUID in
   `EXPO_PUBLIC_EAS_PROJECT_ID` instead of inventing an ID or hard-coding a token.
3. Copy `apps/mobile/.env.example` to `.env.local` and fill the public values.
   Add the same project ID to both EAS environments, `preview` and `production`.
4. Add staging Supabase URL/anon key to EAS `preview`; add production values to
   EAS `production`. `development` builds intentionally use the staging
   `preview` environment. Never use the Supabase service-role key in the app.
   Set `EXPO_PUBLIC_PREVIEW=0` in EAS `preview` for both builds and updates.
   The development/preview build profiles also explicitly disable demo mode;
   the examples default to `0`. A demonstration requires an explicit `1`.
5. In GitHub Settings → Secrets and variables → Actions, add the secret
   `EXPO_TOKEN` and the variable `EXPO_PUBLIC_EAS_PROJECT_ID`.
6. Build the development client from `apps/mobile`:

   ```sh
   pnpm dlx eas-cli build --profile development --platform all
   ```

   Install it on both real phones, then scan a PR's QR code. Fingerprint runtime
   versions prevent loading a JS update into an incompatible native build;
   rebuild the development client when native dependencies or config change.

iOS device builds require access to an Apple Developer team and registered
devices. The professor's team access may be needed earlier than the launch
phase for this D2 acceptance step. Android internal builds do not require a
Google Play store account. Store registration remains part of launch.

The preview workflow uses the EAS `preview` environment and the branch
`pr-<number>`. Fork PRs receive no Expo credentials. Until token/project setup is
complete, the workflow reports the pending setup rather than publishing an
update or claiming a QR preview exists.

## Supabase (R1 with R2)

- Create or identify `okbite-staging` and `okbite-prod` in the intended team.
- Share project access with R2 for schema/functions; R1 does not edit the contract
  or migrations.
- Use each project's public URL and anon key for its matching EAS and Cloudflare
  environment. Keep service-role and Anthropic keys in server-side settings.

## Cloudflare Pages (R1 / account owner)

Connect `denis2224-dev/OkBite` to a Pages project. Set:

- Production branch: `main`; enable previews for PR branches.
- Root directory: repository root.
- Build: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter mobile web`.
- Output directory: `apps/mobile/dist`.
- `NODE_VERSION=22`, `PNPM_VERSION=11.25.0`.
- Public `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and
  `EXPO_PUBLIC_EAS_PROJECT_ID`, with staging values for previews and production
  values for `main`.
- Set `EXPO_PUBLIC_PREVIEW=0` in the **preview** environment. Expo embeds public
  values during export; rebuild the preview after changing them.

For the R5 staging round, use the existing Pages project `okbite` if confirmed
by the account owner: the backend currently allows preview origins matching
`https://<deployment>.okbite.pages.dev`. Confirm CORS for the actual HTTPS origin
with R2; other Pages project names need an R2-owned allowlist change first.
Publish a branch preview and retain its full Git SHA and deployment ID. Do not
change the production branch, connect a production domain, or publish to `main`
for this round. R2/R3 must confirm the approved staging project and a real
known barcode before recording connected-flow acceptance.

Pages should post its preview deployment link on the PR. The exported
`_redirects` file routes missing paths to `index.html`, so Expo Router can handle
deep links. Check `/product/<real-id>` after those routes are implemented.
The `ci` job also uploads `web-export` as an artifact for local inspection.
The custom `okbite.md` domain is connected in D9.

## GitHub review gates (repository admin)

The implementation account `stasikkk777` has push access but no admin access.
The repository owner must configure protection/rules for `main`:

- Pull requests required, at least one approval, CODEOWNERS review required.
- Required status check: `ci` (after its first run).
- Replace the temporary CODEOWNERS fallback `@denis2224-dev` for R2–R5 with
  the team's actual handles. R1 is `@stasikkk777`; the owner remains an alternate
  reviewer so R1 cannot approve its own changes.
- Code written with Codex receives a Claude review, then human approval.
- Merge D1 first, retarget D2 to `main`, then merge D2 after its own review.

## Acceptance still requiring hosted access / real devices

- [ ] Intended Expo account and EAS project linked; GitHub secret/variable set.
- [ ] Staging/production Supabase projects and public environment values set.
- [ ] Development builds installed on a real iPhone and Android phone.
- [ ] PR QR code opens the expected update on both phones.
- [ ] Cloudflare PR browser preview works in Safari and Chrome.
- [ ] Main protection and final role handles configured by the repository admin.
- [ ] Claude review, human approval, and role-plan completion boxes after merge.

## Database and Edge verification in CI

When migrations exist, `ci` starts a disposable Supabase 2.122.1 stack on the
fresh GitHub runner, runs pgTAP and strict database lint, and stops only that
runner's stack. It never links to a hosted project or resets a developer database.
Edge unit tests run without service credentials. `*.integration.test.ts` files
are excluded from that step, then run explicitly with local CLI-generated keys
and `OKBITE_RUN_INTEGRATION=1` after the local gateway is ready. Shared generation
is checked for tracked changes and newly generated untracked files.

## Mobile Metro context

The target workspace has its own Metro config. Inheriting the root preview
config set projectRoot to the repository root and exported an app that failed
with "No routes found". `pnpm test:metro` loads the real config and checks its
project root before the normal suites run. Bundle export alone is not runtime
route acceptance.
