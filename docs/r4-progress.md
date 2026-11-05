# R4 handoff

The application follows the supplied prototype's forest green, cream, lime,
Manrope and Bricolage Grotesque styling, with the newer photo-first specification.
The reference export lacked its supporting stylesheet and runtime, so exact visual
matching could not be verified. Safari automation was unavailable for final inspection.

## Local branches

These branches are stacked in the order below. The final branch contains the
combined implementation; each earlier branch preserves its feature checkpoint.
Nothing has been pushed or merged into the main branch.

1. `r4/setup-preview` — approved minimal Expo workspace and supplied shared schema.
2. `r4/A1-romanian-copy` — central Romanian copy and formatting.
3. `r4/B1-app-shell` — theme, components, home, navigation and service client.
4. `r4/B4-product-result` — allergens, score, portion values, sources and reports.
5. `r4/B6-offline-history` — SQLite / IndexedDB history and durable queued lookups.
6. `r4/A4-information-pages` — about, method, privacy and terms.
7. `r4/workflow-preview` — photo, confirmation, missing product, label capture,
   correction, comparison and important edge states, using simulated inputs.
8. `r4/B8-accessibility-polish` — sharing, keyboard focus, contrast, loading,
   theme support and review fixes.

## Run

Install: `npx --yes pnpm@9.12.0 install`

Browser preview: `npx --yes pnpm@9.12.0 web`

Browser preview with temporary sleep prevention:
`npx --yes pnpm@9.12.0 web:awake`

Phone development server: `npx --yes pnpm@9.12.0 dev`

The keep-awake wrapper lasts only as long as the development command. Stop it
with Control-C. It does not change persistent power settings.

## Integration

With no service URL, or with `EXPO_PUBLIC_PREVIEW=1`, the interface clearly shows
that it is a demonstration. Sample products and scores come from the supplied
prototype. New examples are stored only on this device, and their score remains
unavailable until a scoring service is connected.

For connected operation, configure the two service settings from
`client/.env.example` and set `EXPO_PUBLIC_PREVIEW=0`. Real capture,
identification and contribution routes belong to R5; production ingredient,
label and comparison routes belong to R1. Those routes are not implemented here.
The preview-only equivalents demonstrate the intended design without service calls.

Queue retries save found products into history and offer an actionable result
message. Unknown products remain queued and do not block later known products.
The capture owner still needs to route candidate and not-found responses to their
confirmation/contribution flow. Native photos are copied into persistent storage;
browser photos are stored as Blobs. Network failures retain queued work.

Privacy and terms remain drafts. Operator name, contact email, retention periods,
transfer details and final review are required before publication. The older legal
reference in the plan was updated to Law 195/2024 based on the Ministry of Justice:
https://www.justice.gov.md/ro/content/noua-lege-privind-protectia-datelor-cu-caracter-personal-reprezinta-un-pas-esential

## Verification and remaining acceptance

Component and logic tests cover copy, request/response validation, score absence,
portion math, SQLite and IndexedDB history, queue retries and recovery, saved-product
details, workflow navigation, sharing, actionable messages and text contrast in both themes.
Type checking, lint and exports for all three platforms are run before handoff.

Physical iPhone / Android testing, VoiceOver / TalkBack, 200% font scaling on devices,
production service checks and the later end-to-end flows remain acceptance work.
The installable offline shell and hosting belong to R1. No store build or publication
has been performed. Existing skill files in the original checkout were preserved.

Final automated checks: 52 application tests and 2 shared-schema tests passed; both
TypeScript projects and lint passed; browser, iOS and Android JavaScript exports passed.
The three review findings were fixed and rechecked with targeted regression tests.

## Repository layout update

`chore/full-stack-layout` builds on the completed R4 branch and moves the
application into `client` and shared contracts into `shared/contracts`.
Backend work belongs in `server/supabase`; development helpers belong in
`scripts`. Earlier feature branches retain the paths they used at their checkpoints.

## Client/server naming

The current layout is on `chore/client-server-layout`. The frontend is directly
in `client`, with reusable components, hooks, services and helpers grouped
under `src`. Expo Router screens live in `client/src/app`. Browser assets live
in `client/public`, and server-side work belongs in `server/supabase`.
The root development commands and shared package name remain unchanged.

## Root feature-oriented application

The current application is directly in `PWA_Moldova` on
`refactor/expo-feature-layout`. `src/core`, `src/data`, `src/features` and
`src/shared` replace the previous client-folder organization. Tests are now
under root `test`. The shared validation schemas are local models in
`src/data/models/contract.ts`, and the application is one package rather than
a nested workspace. Use the root README for current paths and run commands.
The previous sections describe preserved feature checkpoints and their paths.

Root-layout verification: 62 tests passed, along with type checking, lint and all-platform exports. Reference HTML and canvas files match the supplied archive.
