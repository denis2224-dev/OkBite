# Current PR #16 review integration

This review integrates main `b4ba501`, preserving all merged backend/admin code,
function settings, shared exports, generator and gateway checks. Root commands
now validate both the design preview and every workspace suite exactly once.
`pnpm sync-shared` runs the real generator; CI exports the root preview as well
as the workspace app. Incoming backend and workspace sources remain unchanged.

The root UI is explicitly demonstration-only even with backend env settings.
Saved preview examples hydrate on Home and History after restart, and the demo
sheet scrolls within the viewport for enlarged text. Existing project rules are
preserved in AGENTS.md alongside the scoped preview guidance. Native devices,
live service/model integration and operator policy review remain separate work.

The final main reconciliation also preserves C5 data-loader scripts and tests.
Local validation passes all 368 tests, lint (0 errors, 55 warnings), root/workspace
TypeScript and data checks. The earlier 353-test CI run passed database and live
function integration; CI is rerun for the final main reconciliation.

The user explicitly approved merging this design preview with an exception for
the missing Claude cross-review and physical iPhone/Android acceptance. This
exception does not mark those acceptance steps complete.

Earlier integration notes and evidence below refer to their recorded revisions.

# Integration handoff

The r4/ready-for-review branch contains the complete application work from
this session, the remaining icon and browser setup, the TypeScript config,
and the project design skills. Earlier feature branches are preserved for
review. Their commits are already ancestors of this branch, so they do not
need to be merged individually.

Main through `3b0d6c5` (2026-11-05), including the D1 scaffold, C1 shared
contract, B1 app foundation, D3 helpers, A2 data checker and C2 database,
has been merged into this review branch. Main itself has not been
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

- packages/shared/: the backend-owned team API contract, EAN/allergen helpers and tests.
- apps/mobile/: the team app foundation, preserved as a separate workspace.
- src/: Expo routes, core services and theme, data contracts and repositories,
  feature screens, shared widgets, and application state.
- assets/: local fonts, icon paths, and application images.
- public/: browser icons, manifest, and browser document template.
- supabase/: the backend-owned C2 database configuration, migrations, demo seed and tests from main.
- server/supabase/: documentation pointing to the authoritative root backend.
- data/: team categories and ingredient records; unchecked drafts are not shipped in the preview.
- design/: approved reference only; not shipped in the application.
- test/: native component, persistence, workflow, real-router integration,
  and browser regression tests.
- .agents/skills/: development guidance only; excluded from the bundler.
- docs/: project guidance and team plans.

## Teammate branches

The D1 scaffold, B1 app foundation, C1 contract, D3 helpers, A2 checker and
C2 database are included through main. Their source files are preserved in
apps/mobile, packages/shared, scripts, data and supabase.
The approved application in src remains the default app for npm run dev
and npm run web. The baseline scaffold can be started separately with
npm run dev:scaffold; it does not replace the implemented application.

The remaining teammates' branches are separate. Root supabase is the
authoritative backend location; its schemas were preserved without edits.
Use packages/shared as the backend-owned service contract when connecting
real services. The root preview's local models still require reconciliation
with that contract before enabling live services.

In particular, review package scripts, the lockfile, lint configuration,
application configuration, Romanian copy, shared contracts, and backend
imports. A clean Git merge by itself does not establish compatibility.
Keep the backend-owned shared contract authoritative when connecting real
services, and coordinate schema differences with its owner.

The screens use demo data when no backend URL is configured. Real camera
capture, remote services, deployment, and physical-device acceptance must
be verified with the corresponding contributors' implementation.

## Verification

Install with pnpm 9.12.0 using `pnpm install --frozen-lockfile`.

Run npm run check for frontend TypeScript, lint, component/integration tests,
browser regression tests, shared-contract tests/types, scaffold tests/types,
script tests and the data validator. Script tests use vitest.scripts.config.mts
so the root runner does not collect other workspaces' suites.
Router tests exercise the actual application routes and reject console warnings
and errors. All workspace dependencies are declared in their package files.

Run ./node_modules/.bin/expo export --platform all to verify web, iOS, and
Android bundles. These checks do not replace physical-device testing.

Database verification is separate: follow supabase/README.md for the isolated
local stack and pgTAP checks. No database deployment or reset is part of this
frontend integration.

Integration verification on 2026-11-05 against main `3b0d6c5`:

- pnpm 9.12.0 frozen-lockfile install passed.
- npm run check passed: 331 tests (99 root, 9 browser, 111 shared,
  99 scaffold, 13 script), all configured TypeScript checks and lint,
  and the data validator with 0 errors.
- Strict standalone TypeScript checking of the data scripts and Vitest
  configuration passed.
- Web, iOS and Android exports passed; application bundle hashes match
  the pre-integration export.
- Independent integration review found no blocking issues; its test-location
  documentation finding was corrected.

The root app sources/assets/configuration match the pre-integration branch;
incoming app foundation, shared, data, checker and database sources match
main. Database tests were not rerun, and physical-device acceptance and live
service integration remain separate.

For browser use, run npm run web. Use npm run web:awake to prevent sleep
while the development server runs. Refresh an already-open viewer after
changing branches.

Merge this review branch into main only after the team reviews it. Do not
merge the historical frontend branches again; their commits are included.
