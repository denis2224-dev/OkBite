# OkBite

A Romanian-language application for shoppers in Moldova to understand food
labels: allergens, nutrition scores, ingredients and product comparisons.

## Repository layout

```text
frontend/
  mobile/           Expo application for iOS, Android and browsers
    app/            Screens and navigation
    src/            Features, components, theme, copy and client integrations
    assets/         App images and icons
backend/
  supabase/         Server-side workspace; implementation pending
shared/
  contracts/        Shared request/response schemas and types
scripts/            Development helpers
docs/              Plans, handoff notes and integration guidance
```

Framework configuration stays beside the application. Workspace configuration,
the dependency lockfile and common commands stay at the repository root.
Tests stay beside the features they cover; they move with those features.

## Development

Run commands from the repository root:

```sh
npx --yes pnpm@9.12.0 install
npx --yes pnpm@9.12.0 web
```

Use `dev` for the phone development server, `test` for all workspace tests,
`typecheck` for both TypeScript projects, `lint` for frontend lint checks,
and `build:web` for the browser export.

On macOS, `web:awake` and `dev:awake` keep the laptop active while the development
command runs. The helper in `scripts/keep-awake.sh` stops when that command exits
and does not change persistent power settings.

## Current status

The interface and local workflow preview are implemented. Backend services,
production capture integration and physical-device acceptance are still pending.
The same frontend code serves phone and browser builds. Shared schemas are
available to both the frontend and future backend services.

See [R4 handoff](docs/r4-progress.md), [backend responsibilities](backend/supabase/README.md)
and [shared contracts](shared/contracts/README.md) for details.
