# Client/server layout implementation plan

**Goal:** Match the requested client/server organization while preserving the working application and its framework conventions.

**Layout:** `client/src/app` holds Expo Router screens; `components`, `hooks`, `services`, `utils`, `config`, `theme`, `copy` and `features` separate client responsibilities. `client/public` holds browser assets and `client/assets` holds native assets. `server/supabase` is the existing server-side workspace. `shared/contracts`, `scripts` and `docs` remain independent.

**Constraints:** No framework replacement, backend implementation or application behavior changes. Keep secrets ignored and preserve all earlier branches.

- [x] Move folders and rewrite relative module references.
- [x] Update workspace and lockfile paths, asset paths, documentation and conventions.
- [x] Relink dependencies; run the existing suite, type checks, lint and platform exports.
- [x] Review references, restore the local preview and commit on `chore/client-server-layout`.

Verification: all 54 tests, both TypeScript projects, lint and browser/iOS/Android exports passed. Reference review found no broken module targets across 82 source files. Earlier feature branches are preserved.
