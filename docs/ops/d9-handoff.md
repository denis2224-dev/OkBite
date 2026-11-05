# D9 PWA shell — review handoff

Base: R1-ci-integration / PR #41. Target: apps/mobile.

The existing brand icons are reused, with an OkBite/Romanian standalone
manifest, Apple metadata and a web-only service-worker registration script.
The current Expo output is `single`: its exporter reads public/index.html.
The plan's +html.tsx applies to static/server rendering, so adding it here
would leave the single export unchanged. The approved template reset is reused.

Workbox precaches the shell, route chunks, local fonts and icons. Only GET
lookup uses bounded NetworkFirst caching; POST actions are never cached.
The anchored URL matcher supports a separate Supabase origin. A reviewer
found the former matcher missed cross-origin requests; a two-origin regression
failed before the fix and passes afterward.

## Local checks

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium webkit
corepack pnpm e2e:web:build
corepack pnpm e2e:web
corepack pnpm --filter mobile web
```

The test build goes to dist-e2e and uses existing demo fixtures on local
ports 18766/18767. The production web export remains dist. No test server or
fixture API is bundled into it. CI installs the browser prerequisites and
runs these cases alongside the existing checks and service integration.

Frozen pnpm 11.25.0 installation, lint (0 errors, 55 inherited warnings),
all types, 408 existing tests and 8 Playwright cases pass. Web/iOS/Android
exports pass. Browser cases run iPhone 13/WebKit and Pixel 7/Chromium profiles:
manifest/icon dimensions, offline hard navigation, IndexedDB product fallback
after removing the lookup cache, cross-origin GET fallback, and uncached POST.
Dependency age and build-script restrictions are unchanged; regenerated
lock output is accounted for separately from source.

## Remaining acceptance

R4's history route still renders its placeholder; R4 must render stored
history and connect offline controls. #14 supplies capture/add routes; #36/#37
need live-provider grading. Manual code/photo/add flow specs require these
dependencies and approved real media before implementation and staging runs.
Lighthouse accessibility >=95, physical home-screen installation/offline
history on both phones, HTTPS/Cloudflare/domain setup, Claude review and
human approval remain open. The full D9 task is not marked complete.
