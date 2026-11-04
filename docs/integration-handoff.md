# Integration handoff

The r4/ready-for-review branch contains the complete application work from
this session, the remaining icon and browser setup, the TypeScript config,
and the project design skills. Earlier feature branches are preserved for
review. Their commits are already ancestors of this branch, so they do not
need to be merged individually.

The latest origin/main planning history has been merged into this review
branch. Main itself has not been changed. The README and project guidance
preserve the runnable application instructions and the team's planning links.

## Branch responsibilities

- r4/setup-preview and r4/A1-romanian-copy: runnable setup and Romanian copy.
- r4/B1-app-shell, r4/B4-product-result, r4/B6-offline-history: shell,
  result screens, persistence, and offline handling.
- r4/A4-information-pages, r4/workflow-preview, r4/B8-accessibility-polish:
  information pages, demo flows, and accessibility.
- chore/full-stack-layout, chore/client-server-layout,
  refactor/expo-feature-layout: earlier layout checkpoints. The final
  root-level layout supersedes these earlier layouts.
- fix/design-parity, chore/okbite-branding: reference-screen corrections
  and application naming.
- fix/web-svg-attributes, fix/navigation-flow-regressions,
  fix/browser-focus-transfer: SVG, navigation, input, and focus fixes.
- style/remove-header-tag, style/app-icons: header and application icons.
- chore/typescript-config, chore/design-skills: config and local guidance.

## Current folders

- src/: Expo routes, core services and theme, data contracts and repositories,
  feature screens, shared widgets, and application state.
- assets/: local fonts, icon paths, and application images.
- public/: browser icons, manifest, and browser document template.
- server/supabase/: reserved backend area; backend implementation is not
  included in the application preview.
- design/: approved reference only; not shipped in the application.
- test/: native component, persistence, workflow, real-router integration,
  and browser regression tests.
- .agents/skills/: development guidance only; excluded from the bundler.
- docs/: project guidance and team plans.

## Teammate branches

The other contributors' implementation branches remain separate. Their
scaffold uses apps/mobile, packages/shared, and a root supabase area.
Before merging those branches, reconcile those paths with this branch's
approved layout and select one application entry point.

In particular, review package scripts, the lockfile, lint configuration,
application configuration, Romanian copy, shared contracts, and backend
imports. A clean Git merge by itself does not establish compatibility.
Keep the backend-owned shared contract authoritative when connecting real
services, and coordinate schema differences with its owner.

The screens use demo data when no backend URL is configured. Real camera
capture, remote services, deployment, and physical-device acceptance must
be verified with the corresponding contributors' implementation.

## Verification

Run npm run check for TypeScript, lint, component/integration tests, and
browser regression tests. Router tests exercise the actual application
routes and reject console warnings and errors.

Run ./node_modules/.bin/expo export --platform all to verify web, iOS, and
Android bundles. These checks do not replace physical-device testing.

For browser use, run npm run web. Use npm run web:awake to prevent sleep
while the development server runs. Refresh an already-open viewer after
changing branches.

Merge this review branch into main only after the team reviews it. Do not
merge the historical frontend branches again; their commits are included.
