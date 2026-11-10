# Web release (Cloudflare Pages)

The PWA is built and deployed by Cloudflare's Git integration for the Pages project `okbite`
(`okbite-ir1.pages.dev`), in Sergiu's Cloudflare account. A push to `main` deploys production;
every pull request from this repository gets its own preview, and
`.github/workflows/pages-preview.yml` posts that preview's URL in the PR.
There is no deploy step in GitHub Actions, so no Cloudflare token is stored in the repo.

## Build settings (Cloudflare dashboard, Workers & Pages > okbite > Settings > Build)

| Setting | Value |
| --- | --- |
| Build command | `pnpm build:web` (runs `apps/mobile`'s `web` script) |
| Output directory | `apps/mobile/dist` |
| `EXPO_PUBLIC_SUPABASE_URL` | the production Supabase origin, `https://…supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the public anon key |
| `EXPO_PUBLIC_PREVIEW` | unset in production |
| `EXPO_PUBLIC_GUIDED_ADD` | unset or `1` enables front-first guided add; `0` rolls back entry |

[human] Confirm the build command and output directory in the dashboard match this table.

Before releasing the guided default, the backend owner must confirm that the target has U1/U2a
(`add-product` accepts an empty brand and omitted category) and U3 (`read-label` returns reasons).
Merged source does not establish deployed backend readiness. For an older backend, set
`EXPO_PUBLIC_GUIDED_ADD=0` and rebuild. Explicit manual entry remains available.

`scripts/check-web-env.mjs` runs first in every Cloudflare build (`CF_PAGES=1`) and stops it when the
Supabase URL is missing, not https or local, the anon key is missing, or `EXPO_PUBLIC_PREVIEW=1` on
`main`. Local and CI builds skip the check.

Headers come from `apps/mobile/public/_headers`; client-side routes from `apps/mobile/public/_redirects`.

## Roll back

1. Cloudflare dashboard > Workers & Pages > okbite > Deployments.
2. Find the last good production deployment, open its menu (…) and choose **Rollback to this deployment**.
3. Open `https://okbite-ir1.pages.dev` and hard-reload; users get the old build on their next visit
   (the update banner offers it to open tabs).
4. Revert the bad commit on `main` so the next push does not redeploy it.

## Latest production deployment on record

| Date | Commit | URL | Deployment ID |
| --- | --- | --- | --- |
| 2026-11-10 | `3f6fa49` | https://025fd081.okbite-ir1.pages.dev | `025fd081-b769-4691-a7d2-5c69e6f83e90` |
