# Backend

This is the home for Supabase server-side work: database migrations, seed data,
Edge Functions, storage policies and server configuration. These services are
not implemented in this branch.

Add the Supabase project here when backend implementation begins:

- `functions/` — product lookup, identification, label reading and moderation.
- `migrations/` — versioned database schema and access policies.
- `tests/` — database and function integration tests.
- `seed.sql` — development records.
- `config.toml` — local service configuration.

Import shared schemas from `src/data/models/contract.ts` through
the agreed server-side synchronization process. Keep server credentials out
of the frontend and out of version control.
