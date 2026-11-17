# OkBite R2 · `top-products` Edge Function Implementation Plan

> **For agentic workers:** Run this plan with superpowers:executing-plans, one task per branch and PR. Steps use checkbox (`- [ ]`) syntax. Read `AGENTS.md`, the spec `docs/api/top-products.md` and the R2 plan `docs/superpowers/plans/2026-11-04-okbite-r2-backend.md` before the first task. Write the failing test first, see it fail, then implement.

**Goal:** Add the `top-products` Edge Function that the mobile app already calls for the Scan home section "Cel mai bun din raft": per category, up to 20 verified products that have a nutrition score, best score first.

**Architecture:** A new GET function, `supabase/functions/top-products/`, reads verified products of one category with the anon key (RLS already hides hidden rows), loads their ingredients in batches, and scores each one with the shared `computeScore` used by `lookup`. Response types come from `packages/shared/src/contract.ts` and reach the function through `pnpm sync-shared`. One partial index supports the category selection; no RPC is planned unless the tests show the query is too slow.

**Tech Stack:** Deno Edge Functions (`npm:zod@3.23.8`, `@supabase/supabase-js` via `supabase/functions/deno.json`), Postgres 15 with pgTAP (`supabase/tests/*.test.sql`), Zod contract in `packages/shared`, Vitest for shared tests, `deno test` for functions, Supabase CLI for local stack.

**Spec:** `docs/api/top-products.md`

## Global constraints

- Only R2 edits `packages/shared/src/contract.ts`, `supabase/`, and `scripts/sync-shared.mjs`. This plan stays inside those paths.
- Never edit `supabase/functions/_shared/` by hand. Run `pnpm sync-shared` after every change in `packages/shared/src/`.
- One task, one branch, one PR, at most about 400 changed lines. Branch name: `R2-TP<n>-<short-name>`.
- Tests first. Do not weaken or delete an existing test to make it pass. The `lookup` tests must stay green.
- Validate every request and response with Zod schemas from the contract.
- Error bodies use `ErrorBody` through `fail()` from `supabase/functions/_lib/http.ts`. Same CORS handling (`cors()`, `withCors()`) as `lookup`.
- The mobile app (`apps/mobile/`) is not changed in this plan. Its local copy of the schema is a follow-up PR (see Task 1).
- No payment or subscription code. No AI model calls in this function.
- UI copy is not part of this plan. Error messages are Romanian, as in `lookup`.

## Facts found in the repo

- Template: `supabase/functions/lookup/index.ts` (exports `createHandler(overrides)` and `handler`, runs `Deno.serve` only when `import.meta.main`). Unit tests inject dependencies (`index.test.ts`). Integration tests use `integrationTest` from `supabase/functions/_lib/integration.ts` (`lookup.integration.test.ts`).
- Helpers: `supabase/functions/_lib/http.ts` (`cors`, `withCors`, `json`, `fail`, `HttpError`, `readDeviceId`); `supabase/functions/_lib/db.ts` (`loadProduct`, which does one product query and one ingredient query per product, plus a knowledge-base fallback); `supabase/functions/_lib/client.ts` (`adminClient`).
- Score: there is no score column. `computeScore(nutrients, scoreKind, ingredientsText)` is in `supabase/functions/_shared/score/index.ts` (generated copy). Product score (`productScore`) is in `packages/shared/src/score/product.ts`.
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_name.sql`. Latest is `20261115000001_off_misses.sql`. The `products` table is defined in `20261105000000_init.sql` (`status` in verified/unverified/hidden, `category_slug` references `categories`, `search_text` generated). Index style: `create index products_search_trgm ...`.
- RLS: `products_read` lets `anon` and `authenticated` select rows where `status <> 'hidden'`. `top-products` must filter `status = 'verified'` itself.
- Categories: table `public.categories (slug, name, score_kind)`. Seed in `supabase/seed.sql` and `20261113000001_partial_product_category.sql` (adds `necunoscut`).
- Usage events: `usage_events.kind` is a check list (`photo`, `barcode`, `identified`, `not_found`, `read_label`, `added`, `report`). There is no kind for shelves, so the function writes no usage events.
- pgTAP tests: `supabase/tests/*.test.sql` (example: `search.test.sql`), run by `supabase test db`.
- Config: `supabase/config.toml` has one `[functions.<name>]` block per function (`verify_jwt = false`, `import_map = "./functions/deno.json"`).
- CI: `.github/workflows/ci.yml` runs unit tests with `deno test ... --ignore=...integration.test.ts`, and the integration job starts `supabase functions serve` and checks `lookup` is reachable (line ~101).
- Mobile side: `apps/mobile/src/features/shelf/topProducts.ts` has a local `TopProductsResponse`, `ShelfCategory` regex and `TOP_PRODUCTS_LIMIT = 20`. `apps/mobile/src/lib/api.ts` calls `request('top-products', ...)` with `category` and `limit`.

---

### Task R2-TP1: Contract for the top-products response

**Files:**
- Modify: `packages/shared/src/contract.ts` (add after `LookupResponse`)
- Modify: `packages/shared/src/contract.test.ts` (add cases)
- Generated (do not edit by hand): `supabase/functions/_shared/contract.ts`

**What to add:**
- `TopProductsQuery`: `z.object({ category: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(64), limit: ... }).strict()`. The limit bounds are a TO CONFIRM (see Open questions); default proposal: integer 1 to 20, default 20.
- `TopProductsResponse`: `z.object({ category: z.string().min(1), products: z.array(z.object({ product: Product, score: ScoreResult })).max(20) })`.
- Export matching `type` aliases, as the other schemas do.

**Failing tests to write first (`contract.test.ts`):**
- `TopProductsResponse accepts an empty shelf` (`products: []`) → success.
- `TopProductsResponse rejects more than 20 products` → failure.
- `TopProductsResponse rejects an entry without a score` → failure.
- `TopProductsQuery accepts iaurt and fructe-legume` → success.
- `TopProductsQuery rejects uppercase, spaces, leading or trailing hyphen and 65 characters` → failure.
- `TopProductsQuery rejects unknown keys` (strict) → failure.

**Commands:**
- `pnpm --filter @okbite/shared test contract` (expect FAIL first, then PASS)
- `pnpm sync-shared`
- `git diff --exit-code -- supabase/functions/_shared` is clean only after the sync is committed with this change
- `pnpm test:sync-shared`

**Commit message:** `feat(contract): add top-products query and response schemas`

**Follow-up (separate PR, owned by the app role, not R2):** change `apps/mobile/src/features/shelf/topProducts.ts` to import `TopProductsResponse` from `@okbite/shared` and delete the local copy. Its test `topProducts.test.ts` must keep passing.

---

### Task R2-TP2: Index for the category selection

**Files:**
- Create: `supabase/migrations/20261116000000_top_products_index.sql`
- Create: `supabase/tests/top-products.test.sql`

**What to add:**
- A partial index so the category selection is cheap:
  `create index products_verified_category on public.products (category_slug) where status = 'verified';`
- No new table, column or RPC. The score is computed in the function, so there is nothing to store.
- Migration only adds the index; it does not change RLS or grants.

**Failing tests to write first (`supabase/tests/top-products.test.sql`, pgTAP):**
- `products_verified_category exists` → `has_index('public','products','products_verified_category')`.
- `index is partial on verified` → check `pg_get_indexdef` contains `status = 'verified'`.
- `anon sees only non-hidden rows of one category` → insert one verified, one unverified, one hidden in `iaurt`; as role `anon`, `select count(*) where category_slug='iaurt' and status='verified'` equals 1 (proves the query shape the function uses).
- `category with no products returns zero rows` → `biscuiti` with no rows gives 0, not an error.

**Commands:**
- `supabase start` (once), then `supabase db reset`
- `supabase test db`
- `pnpm test:local-ops`

**Commit message:** `feat(db): partial index for verified products by category`

---

### Task R2-TP3: Batched candidate loader

**Files:**
- Create: `supabase/functions/top-products/service.ts`
- Create: `supabase/functions/top-products/service.test.ts` (unit, fake client)
- Create: `supabase/functions/top-products/service.integration.test.ts` (local stack)
- Optional refactor (only if the PR stays under about 400 lines): extract the row-to-`Product` mapping from `supabase/functions/_lib/db.ts` into `supabase/functions/_lib/productRow.ts`, and make `loadProduct` call it. If done, `lookup` tests must stay green with no edits to them.

**What to add:**
- `loadShelfCandidates(category: string, db): Promise<{ product: Product; score: ScoreResult }[]>`:
  1. Check the category exists in `categories` (unknown slug → throw `HttpError(400, ..., 'bad_request')`).
  2. Select verified products of that category, column list like `columns` in `db.ts`, `.eq('status','verified')`, bounded by a pool limit (TO CONFIRM, proposal 500 rows, ordered by `id`).
  3. Load ingredient links for all candidate ids in ONE query (`in('product_id', ids)`), and the knowledge base once, not per product. This avoids the N+1 pattern in `loadProduct`.
  4. Build each `Product` with the same mapping as `loadProduct`, then score with `computeScore`. Products with `category.slug === 'necunoscut'` get the `unavailable` score (as `loadProduct` does).
  5. Drop products whose `score.score` is null.
  6. Sort by `score.score` descending, ties by `name` in Romanian collation (`localeCompare(b, 'ro')`), keep the first `limit`.

**Failing tests to write first (`service.test.ts`, fake db):**
- `returns verified products only, never hidden or unverified` → fake rows with each status; only verified come back.
- `drops products with a null nutrition score` → a product missing `kcal`, `sat`, `sugar`, `salt` is absent.
- `sorts best nutrition score first and breaks ties by name` → two equal scores, names `Zăhăr` and `Apă` ordered `Apă`, then `Zăhăr`.
- `keeps at most limit products` → 25 candidates, limit 20 → 20 returned.
- `unknown category throws bad_request` → category missing in fake `categories` → `HttpError` with status 400.
- `empty category returns an empty list, no error` → `[]`.
- `loads ingredients with one query for all candidates` → count calls to the ingredient query; must be 1 for 5 candidates.

**Integration tests (`service.integration.test.ts`, `integrationTest`):**
- `seeded iaurt shelf returns only verified products with scores` (uses `supabase/seed.sql` data).
- `hidden seed product is not returned even when it would score best`.

**Commands:**
- `deno test supabase/functions/top-products/service.test.ts`
- `deno test --config supabase/functions/deno.json --allow-all supabase/functions/top-products/service.integration.test.ts` (needs `supabase start`)
- If refactor done: `deno test --config supabase/functions/deno.json --allow-all supabase/functions/lookup/`

**Commit message:** `feat(top-products): load and rank verified shelf candidates`

---

### Task R2-TP4: The Edge Function handler

**Files:**
- Create: `supabase/functions/top-products/index.ts`
- Create: `supabase/functions/top-products/index.test.ts`
- Create: `supabase/functions/top-products/top-products.integration.test.ts`

**What to add:**
- `createHandler(overrides)` and `export const handler = createHandler()`, same shape as `lookup/index.ts`, with `if (import.meta.main) Deno.serve(handler)`.
- Method other than GET → `fail('bad_request', 'Metodă nepermisă.', 405)` with `allow: GET, OPTIONS`.
- Parse query with `TopProductsQuery`. Exactly the params `category` and `limit` are allowed; unknown or repeated params → 400. A missing `limit` uses 20 (the app always sends 20).
- `readDeviceId(req)` is NOT required by the doc (the header is sent but the function does not need it). TO CONFIRM: if the team wants the header validated like `lookup`, call `readDeviceId` and return 400 when it is missing. Default in this plan: do not require it.
- Call `loadShelfCandidates`, build `TopProductsResponse.parse({ category, products })`, return `json(body)`. Add `cache-control: max-age=180` (proposal; the app does not depend on it).
- Errors: `HttpError` → `fail(error, message, status)`; any other error → `fail('upstream_failed', 'Serviciul nu este disponibil momentan.', 502)`. Always end with `withCors(req, response)`.
- Rate limit: `lookup` does not call `checkRateLimit` today, so this function does not either (TO CONFIRM, Open question 5).

**Failing tests to write first (`index.test.ts`, injected deps, no network):**
- `top-products returns 200 with at most 20 products and the requested category` → fake loader returns 25 → body has 20 and `category: 'iaurt'`.
- `top-products returns 200 and an empty array for an empty shelf` → not an error.
- `top-products rejects a bad category slug before any I/O` → `Iaurt`, `iaurt ` (space), `a--b`, 65 characters → 400 `bad_request`, loader not called.
- `top-products rejects limit outside 1 to 20` → `0`, `21`, `abc` → 400, loader not called.
- `top-products rejects unknown keys and duplicate params` → `?category=iaurt&foo=1` and `?category=iaurt&category=suc` → 400.
- `top-products maps an unknown category to 400 bad_request` → loader throws `HttpError(400)` → 400 with `ErrorBody` shape.
- `top-products maps a database failure to 502 upstream_failed without leaking details` → loader throws `Error('secret')` → 502, body message is the Romanian generic text, not `secret`.
- `top-products rejects POST with 405 and an allow header` → 405, `allow` contains `GET`.
- `top-products answers CORS preflight from okbite.md` → OPTIONS 204 with `access-control-allow-origin: https://okbite.md`.
- `top-products rejects an origin that is not allowed` → origin `https://evil.example` → 403.

**Integration test (`top-products.integration.test.ts`, local stack):**
- `GET top-products?category=iaurt&limit=20 returns the seeded verified shelf and parses with TopProductsResponse`.
- `GET with an unknown category returns 400 bad_request`.
- `GET with an existing empty category returns 200 and products []`.

**Commands:**
- `deno test supabase/functions/top-products/` (unit tests; integration file is excluded by name pattern or run separately, as CI does)
- `deno test --config supabase/functions/deno.json --allow-all supabase/functions/top-products/top-products.integration.test.ts` (needs `supabase start`)
- `deno check --config supabase/functions/deno.json --no-lock --node-modules-dir=none supabase/functions/top-products/index.ts`

**Commit message:** `feat(top-products): add the shelf candidates Edge Function`

---

### Task R2-TP5: Local wiring, CI and deploy notes

**Files:**
- Modify: `supabase/config.toml` (add block after `[functions.enrich-product]`)
- Modify: `.github/workflows/ci.yml` (only if the gateway smoke check should also cover this function; line ~101 checks `lookup` only)
- Modify: `supabase/README.md` (one short paragraph listing the function and its three query params) — only if the README lists functions today; otherwise skip (TO CONFIRM)

**What to add:**
```toml
[functions.top-products]
verify_jwt = false
import_map = "./functions/deno.json"
```
- Keep `verify_jwt = false`: the app sends the anon key and the data is public.

**Failing tests to write first:**
- `supabase/tests/local-cors.test.mjs` (or `local-project.test.mjs`): add a case that `config.toml` has a `[functions.top-products]` block with `verify_jwt = false`. Expect FAIL first.
- If CI is changed: a local `curl` to `$API_URL/functions/v1/top-products?category=iaurt&limit=20` returns 200 (added to the gateway step).

**Commands:**
- `pnpm test:local-gateway`
- `pnpm test:local-ops`
- `pnpm test` (full, before opening the PR)

**Deploy notes (for the human, not automated here):**
- The function is deployed with the Supabase CLI to the hosted project with the same import map. TO CONFIRM: the exact hosted deploy command and which environment (staging first) — the repo has no deploy script for functions (`docs/ops/c8-release-checklist-2026-11-09.md` and `docs/ops/web-release.md` are the places to check).
- No new secret is needed: the function uses `SUPABASE_URL` and `SUPABASE_ANON_KEY`, as `lookup` does.
- Until deployed, the app shows its error state with retry (per the spec).

**Commit message:** `chore(top-products): register the function in config and gateway checks`

---

## Open questions from `docs/api/top-products.md`, with a proposed answer

1. **Move `TopProductsResponse` into the shared contract?** Proposed answer: yes, done in Task R2-TP1. The app switch is a follow-up PR owned by the app role.
2. **Order by product score so 20 candidates are enough?** Decision needed. The spec says "best `score.score` first", so this plan follows the spec. The product score (`productScore` in `packages/shared/src/score/product.ts`) can be computed in the function too, which would make the top 20 match what the app shows. Human to decide; if yes, change the sort in `service.ts` and update the spec.
3. **A `total` count of verified products on the shelf?** Not in this plan. Proposed: no, not needed for v1. If wanted, add `total` to the schema in Task R2-TP1 and a `count` query in Task R2-TP3.
4. **Include verified Open Food Facts imports (`source` starting with "Open Food Facts")?** Not decided. This plan includes every verified product, OFF or team. Human to confirm; if excluded, add `.not('source','ilike','Open Food Facts%')` in Task R2-TP3.
5. **Rate limiting: is the `lookup` per-device limit suitable?** `lookup` has no rate limit in code today (`checkRateLimit` exists in `_lib/http.ts` but no read function calls it). Proposal: no limit in v1 for this read-only endpoint; revisit if abuse appears. Human to decide. Note the 25 shelves per user are read-only and each is cached by the app.

## TO CONFIRM items

- Limit bounds: the spec gives `limit=20 (always, today)` and "maximum number". Proposed: integer 1 to 20, default 20. Confirm with the app role.
- Pool size before ranking (proposed 500 verified rows per category). Confirm acceptable for the current catalogue size.
- Whether an unknown or `necunoscut` category returns 400 (proposed: unknown → 400; `necunoscut` → 400 as well, since the app never sends it). The spec only says "unknown category should be 400 bad_request".
- Whether the `x-device-id` header must be validated (proposed: not required).
- The exact hosted deploy command and environment order for Edge Functions.
- Whether `supabase/README.md` lists functions (Task R2-TP5 step is conditional).
- Whether `.github/workflows/ci.yml` should also smoke-test `top-products` (currently only `lookup`).
- Whether a `cache-control` header value of 180 seconds is acceptable.
