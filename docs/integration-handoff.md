# Integration handoff

The r4/ready-for-review branch contains the complete application work from
this session, the remaining icon and browser setup, the TypeScript config,
and the project design skills. Earlier feature branches are preserved for
review. Their commits are already ancestors of this branch, so they do not
need to be merged individually.

The latest origin/main history, including the D1 scaffold and C1 shared
contract, has been merged into this review branch. Main itself has not been
changed by this work. The README and project guidance
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

- packages/shared/: the backend-owned team API contract and its tests.\n- apps/mobile/: the team baseline scaffold, preserved as a separate workspace.\n- src/: Expo routes, core services and theme, data contracts and repositories,
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

The D1 scaffold and C1 shared contract are already included through main.
Their source files are preserved in apps/mobile and packages/shared.
The approved application in src remains the default app for npm run dev
and npm run web. The baseline scaffold can be started separately with
npm run dev:scaffold; it does not replace the implemented application.

The remaining teammates' branches are separate. Backend branches use a
root supabase area. Reconcile backend paths and shared-schema imports
before connecting the frontend to real services.

In particular, review package scripts, the lockfile, lint configuration,
application configuration, Romanian copy, shared contracts, and backend
imports. A clean Git merge by itself does not establish compatibility.
Keep the backend-owned shared contract authoritative when connecting real
services, and coordinate schema differences with its owner.

The screens use demo data when no backend URL is configured. Real camera
capture, remote services, deployment, and physical-device acceptance must
be verified with the corresponding contributors' implementation.

## Verification

Run npm run check for frontend TypeScript, lint, component/integration tests,\nbrowser regression tests, shared-contract tests/types, and scaffold tests/types.\nRouter tests exercise the actual application routes and reject console warnings\nand errors. All workspace dependencies are declared in their package files.

Run ./node_modules/.bin/expo export --platform all to verify web, iOS, and
Android bundles. These checks do not replace physical-device testing.

For browser use, run npm run web. Use npm run web:awake to prevent sleep
while the development server runs. Refresh an already-open viewer after
changing branches.

Merge this review branch into main only after the team reviews it. Do not
merge the historical frontend branches again; their commits are included.
