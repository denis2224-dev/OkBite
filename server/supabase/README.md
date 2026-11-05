# Backend

The authoritative backend now lives at root [`supabase/`](../../supabase/README.md),
preserved from the team's C2 database work on main. Keep its configuration,
migrations, demo seed and database tests there. This folder is retained only
as a documentation pointer; do not create a second backend here.

The backend role continues implementation in root `supabase/`:

- `functions/` — product lookup, identification, label reading and moderation.
- `migrations/` — versioned database schema and access policies.
- `tests/` — database and function integration tests.
- `seed.sql` — development records.
- `config.toml` — local service configuration.

Use the backend-owned contract in `packages/shared/src/contract.ts` through
the agreed server-side synchronization process. Reconcile the root preview's
local models before connecting live services. Keep server credentials out of
the frontend and out of version control.
