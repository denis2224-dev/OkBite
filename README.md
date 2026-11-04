# OkBite

A Romanian-language application for shoppers in Moldova to understand food
labels: allergens, nutrition scores, ingredients and product comparisons.

## Project structure

```text
client/                         Frontend for iOS, Android and browsers
├── public/                     Browser static files and favicon
├── assets/                     Native app icons and images
├── src/
│   ├── app/                    Screens and navigation with Expo Router
│   ├── components/             Reusable interface components
│   ├── hooks/                  Custom React hooks
│   ├── services/               Service calls, device identity and photo storage
│   ├── utils/                  Formatting and small helpers
│   ├── config/                 Client configuration
│   ├── features/               Domain logic and specialized views
│   ├── theme/                  Colors, typography and spacing
│   ├── copy/                   Romanian interface text
│   └── test/                   Shared test helpers and demonstration records
├── app.json                    Application configuration
├── package.json
└── .env.example                Safe example of client settings
server/
└── supabase/                   Server-side workspace; implementation pending
shared/
└── contracts/                  Shared request/response schemas and types
scripts/                        Development helpers
docs/                          Plans and integration notes
package.json                    Commands for the whole workspace
pnpm-workspace.yaml             Workspace package locations
pnpm-lock.yaml                  Locked dependency versions
.gitignore                      Dependencies, builds and secret files
```

Expo Router uses `client/src/app` for screens and `client/src/app/_layout.tsx`
for the app shell. It does not need a separate `App.jsx` or `pages` folder.
The planned backend uses Supabase functions and database migrations rather
than an Express `server.js`. Server controllers and endpoints will live in
that backend workspace when implemented.

Tests stay beside the components and features they cover. Framework
configuration stays inside `client`; workspace configuration stays at the root.
The shared package keeps the name `@okbite/shared`, preserving existing imports.

## Development

Run commands from the repository root:

```sh
npx --yes pnpm@9.12.0 install
npx --yes pnpm@9.12.0 web
```

Use `dev` for the phone development server, `test` for all workspace tests,
`typecheck` for both TypeScript projects, `lint` for frontend lint checks,
and `build:web` for the browser export.

Copy `client/.env.example` to `client/.env.local` to configure local client
settings. Only public client configuration belongs there. Keep service
credentials on the server. Local environment files are ignored by version control.

On macOS, `web:awake` and `dev:awake` keep the laptop active while the development
command runs. The helper in `scripts/keep-awake.sh` stops when that command exits
and does not change persistent power settings.

## Current status

The interface and local workflow preview are implemented. Backend services,
production capture integration and physical-device acceptance are still pending.

See [R4 handoff](docs/r4-progress.md), [backend responsibilities](server/supabase/README.md)
and [shared contracts](shared/contracts/README.md) for details.
