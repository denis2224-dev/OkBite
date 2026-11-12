# Web release (Cloudflare Pages)

The PWA is built and deployed by Cloudflare's Git integration for the Pages project `okbite`
(`okbite-ir1.pages.dev`). A push to `main` deploys production;
every pull request from this repository gets its own preview, and
`.github/workflows/pages-preview.yml` posts that preview's URL in the PR.
There is no deploy step in GitHub Actions, so no Cloudflare token is stored in the repo.

## Build settings (Cloudflare dashboard, Workers & Pages > okbite > Settings > Build)

| Setting | Value |
| --- | --- |
| Build command | `pnpm build:web` (runs `apps/mobile`'s `web` script) |
| Output directory | `apps/mobile/dist` |
| `EXPO_PUBLIC_SUPABASE_URL` | OkBite staging, `https://vspdhdqaneofutsvavlc.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the matching staging publishable key |
| `EXPO_PUBLIC_PREVIEW` | unset for the public site |
| `EXPO_PUBLIC_GUIDED_ADD` | unset or `1` enables front-first guided add; `0` rolls back entry |

[human] Confirm the build command and output directory in the dashboard match this table.

The public web app and Android beta use the same catalog while beta testing is underway.
On 2026-11-12, 145 products with barcodes missing from staging were copied from `okbite-prod`,
bringing the shared catalog to 4,474 unique barcodes. Existing staging entries take precedence
when a barcode appears in both projects. This was a one-time copy.
The Cloudflare Pages settings above apply to the Production environment for the website.
To switch the public site back to `okbite-prod`, update the host check in
`scripts/check-web-env.mjs` and set both Cloudflare values to the production project's
matching URL and publishable key before deploying.

Before releasing the guided default, the backend owner must confirm that the target has U1/U2a
(`add-product` accepts an empty brand and omitted category) and U3 (`read-label` returns reasons).
Merged source does not establish deployed backend readiness. For an older backend, set
`EXPO_PUBLIC_GUIDED_ADD=0` and rebuild. Explicit manual entry remains available.

`scripts/check-web-env.mjs` runs first in every Cloudflare build (`CF_PAGES=1`) and stops it when the
Supabase URL is missing, not HTTPS or local, or the public key is missing. On `main`, it also
requires the staging URL and rejects `EXPO_PUBLIC_PREVIEW=1`. Local and CI builds skip the check.

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
