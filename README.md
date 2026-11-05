> R1 integration policy (2026-11-05): the app is `apps/mobile`; use Node 22 and the declared pnpm 11.25.0 via Corepack. Root start/dev/web/build commands select this app. Root preview sources and tests remain references. See [.github/SETUP.md](.github/SETUP.md).

# okBite

The Expo design preview lives at the repository root. It follows the supplied
feature-oriented layout using TypeScript instead of Dart.

```text
OkBite/
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
├── supabase/                    Team database migrations, demo seed and tests
├── server/                      Backend location documentation
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
Root application tests are in `test`; workspace and data-script tests remain
beside their respective source files. Fonts are bundled locally without runtime font downloads.

## Run from this folder

Dependencies are installed. To open the browser development version:

```sh
# From the repository root:
pnpm web
```

Use `pnpm dev` for the phone development server or `pnpm web:awake` to
keep the laptop active while the browser development server runs. Control-C
stops the command and its temporary sleep prevention.

For a fresh checkout, install the locked dependencies first:

```sh
corepack pnpm install --frozen-lockfile
```

Combined checks: `pnpm check` (app, browser, shared, scaffold, scripts and data).
Browser export: `pnpm build:web`. All platform bundles: `corepack pnpm --filter mobile exec expo export --platform all`.

The preserved root preview stays in demonstration mode even when Supabase settings
are present; it does not upload photos or invoke unfinished live routes. Saved
examples restore from local history, while sample flags reset on each launch.
The service-integration workspace remains at `apps/mobile` and starts with
`pnpm --filter mobile start`. Live camera and backend wiring into this design
remain pending. Operator details and final review
are still required for the draft policy pages.

Earlier implementations are preserved on their existing branches and in the
previous worktree. Current review branch: `r4/ready-for-review`.

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


The target frontend is `apps/mobile`, using the authoritative shared contract
in `packages/shared`. The root preview is retained as a design reference.
Use npm run web for the implemented app; npm run dev:scaffold starts only the
baseline scaffold. Run npm run check to verify the app and both workspaces.
