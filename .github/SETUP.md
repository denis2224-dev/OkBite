# D1/D2 setup and acceptance

The scaffold and CI can run without hosted service credentials. Native EAS
builds, QR previews, and Cloudflare preview URLs require the setup below.
Never put tokens, service-role keys, or AI keys in app config or public variables.

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
- `NODE_VERSION=22`, `PNPM_VERSION=9.12.0`.
- Public `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and
  `EXPO_PUBLIC_EAS_PROJECT_ID`, with staging values for previews and production
  values for `main`.

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

When migrations exist, `ci` starts a disposable Supabase 2.65.5 stack on the
fresh GitHub runner, runs pgTAP and strict database lint, and stops only that
runner's stack. It never links to a hosted project or resets a developer database.
Edge unit tests run without service credentials. `*.integration.test.ts` files
are excluded from that step, then run explicitly with local CLI-generated keys
and `OKBITE_RUN_INTEGRATION=1` after the local gateway is ready. Shared generation
is checked for tracked changes and newly generated untracked files.
