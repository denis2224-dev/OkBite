# okBite

The Expo application lives directly inside `PWA_Moldova`. It follows the supplied
feature-oriented layout using TypeScript instead of Dart.

```text
PWA_Moldova/
├── design/                      Reference HTML and canvas metadata; not shipped
├── assets/
│   ├── fonts/                   Local Bricolage Grotesque and Manrope files
│   └── icons/                   Original icon paths and application images
├── src/
│   ├── main.ts                  Expo Router entry point
│   ├── app.tsx                  Providers, fonts, application shell and theme
│   ├── app/                     Thin Expo Router route entry files
│   ├── core/
│   │   ├── theme/               Colors, typography, radii, spacing and theme
│   │   ├── router/              Route paths and bottom navigation shell
│   │   ├── utils/               Barcode validation, score grade and formatting
│   │   ├── services/            Connectivity, persistence and platform services
│   │   └── constants/           Romanian interface text
│   ├── data/
│   │   ├── models/              Validated product and service schemas/types
│   │   ├── mock/                Demonstration products and extracted label data
│   │   └── repositories/        Product-service calls and local history
│   ├── features/
│   │   ├── home/
│   │   ├── scanner/
│   │   ├── result/
│   │   ├── ingredients/
│   │   ├── compare/
│   │   ├── capture/
│   │   ├── history/
│   │   ├── states/
│   │   ├── legal/
│   │   └── share/
│   └── shared/
│       ├── widgets/             Cards, buttons, chips, icons, layout and toast
│       └── state/               Shared application flags
├── test/                        Unit, component, persistence and workflow tests
├── public/                      Browser favicon
├── server/                      Reserved Supabase backend workspace
├── scripts/                     Development helpers
├── docs/                        Plans and integration notes
├── app.json                     Expo application configuration
├── package.json                 Dependencies and development commands
├── tsconfig.json                TypeScript configuration
├── metro.config.js              Bundler configuration and reference exclusions
├── jest.config.cjs              Test configuration
└── eslint.config.js             Lint configuration
```

Expo requires route entry files in `src/app`. These delegate to screens in
`src/features`, preserving both the requested separation and working navigation.
No Dart files, Flutter dependencies or empty controller abstractions are added.
All tests are in `test`. Fonts are bundled locally without runtime font downloads.

## Run from this folder

Dependencies are installed. To open the browser development version:

```sh
cd /Users/davidnenita/Documents/PWA/PWA_Moldova
npm run web
```

Use `npm run dev` for the phone development server or `npm run web:awake` to
keep the laptop active while the browser development server runs. Control-C
stops the command and its temporary sleep prevention.

For a fresh checkout, install the locked dependencies first:

```sh
npx --yes pnpm@9.12.0 install --frozen-lockfile
```

Checks: `npm test`, `npm run typecheck`, `npm run lint`.
Browser export: `npm run build:web`. All platform bundles: `npx expo export --platform all`.

Copy `.env.example` to `.env.local` for local settings. Without service settings,
the app displays the demonstration workflow and does not upload photos. Live
capture and backend integration remain pending. Operator details and final review
are still required for the draft policy pages.

Earlier implementations are preserved on their existing branches and in the
previous worktree. Current branch: `refactor/expo-feature-layout`.

See [integration notes](docs/r4-progress.md), [design reference](design/README.md),
[backend responsibilities](server/supabase/README.md) and
[local design skills](docs/design-resources.md).

## Team review and integration

The full review branch is r4/ready-for-review. See
[the integration handoff](docs/integration-handoff.md) for branch coverage,
the current folder layout, verification commands, and teammate integration.

The team's planning documents are preserved alongside the application:

- [Specification](docs/superpowers/specs/2026-11-03-okbite-design.md)
- [Overall plan](docs/superpowers/plans/2026-11-04-okbite-overall.md)
- [Application screens plan](docs/superpowers/plans/2026-11-04-okbite-r4-app-screens.md)
- [Team prototype](docs/prototype/)
- [Planning graph](graphify-out/GRAPH_REPORT.md)
