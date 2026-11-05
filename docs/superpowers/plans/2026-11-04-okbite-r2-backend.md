# OkBite R2 · Backend and Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-04-okbite-overall.md` (Global Constraints, Review Focus, who owns what, dependencies) and the spec before your first task. Steps marked **(human)** are done or checked by the person, not the agent. Task IDs keep their original letters (A = content, B = app, C = backend, D = platform/AI) so cross-references stay stable.

**Goal:** The shared contract, the database (with trigram search), the function helpers, lookup, add-product, report, and moderation.

**Owns (only this role edits these paths):** `packages/shared/src/contract.ts`, `supabase/` except `functions/identify/`, `functions/read-label/`, `functions/client-error/`, `functions/_lib/claude.ts`; `scripts/sync-shared.mjs`; `apps/mobile/app/admin/`, `apps/mobile/src/features/admin/`; `docs/ops/moderation.md`

**Tasks in order:** C1 → C2 → C3 → C6 → C7 → C8

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Role-specific: the graph shows C1 (contract) and C2 (schema) are the two most connected tasks in the project — 23 and 20 links. Merge them by 6 Nov; every other role waits on them. You are the only role that changes `contract.ts` and `supabase/migrations/`; announce each change in the team chat and run `pnpm sync-shared`.

## Review Focus (owned here)

- `lookup` with a malformed code → 400 `bad_request`, not `not_found` (C3).
- Two `add-product` calls for the same new code at once → one product; the second returns it (C6).
- Search ignores case and diacritics: "branza" finds "Brânză" (C2).

---

### Task C1: Contract (fully specified)

**Files:**
- Create: `packages/shared/src/contract.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from './contract';`)
- Test: `packages/shared/src/contract.test.ts`

**Interfaces:**
- Produces: every schema and type below. Other roles import them from `@okbite/shared` (app) or `../_shared/contract.ts` (functions).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { Code, Nutrients, IdentifyResponse, AddProductRequest, ReadLabelResponse } from './contract';

const n = { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: 0, fruitVegPct: null };

describe('contract', () => {
  it('accepts EAN-8 and EAN-13 only', () => {
    expect(Code.safeParse('4840001000014').success).toBe(true);
    expect(Code.safeParse('96385074').success).toBe(true);
    expect(Code.safeParse('484000100001').success).toBe(false);
  });
  it('allows null nutrients but not negative ones', () => {
    expect(Nutrients.safeParse(n).success).toBe(true);
    expect(Nutrients.safeParse({ ...n, sugar: -1 }).success).toBe(false);
  });
  it('parses identify candidates with what the AI read', () => {
    const r = IdentifyResponse.parse({
      status: 'candidates', photoPath: 'dev/a-front.jpg',
      read: { brand: 'Zorel', name: 'Iaurt cu căpșuni', quantity: '400 g', code: null },
      candidates: [{ id: '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f', name: 'Iaurt cu căpșuni 2%', brand: 'Zorel', quantity: '400 g', imageUrl: null, similarity: 0.71 }],
    });
    expect(r.status).toBe('candidates');
  });
  it('lets a product be added without a barcode', () => {
    expect(AddProductRequest.safeParse({
      code: null, name: 'Biscuiți', brand: 'X', quantity: '200 g', unit: 'g', categorySlug: 'biscuiti',
      ingredientsText: 'făină de grâu, zahăr', nutrients: n,
      photoPath: null, ingredientsPhotoPath: 'dev/i.jpg', nutritionPhotoPath: 'dev/n.jpg',
    }).success).toBe(true);
  });
  it('lists unclear fields in read-label responses', () => {
    const r = ReadLabelResponse.parse({ ingredientsText: null, unit: 'g', nutrients: { ...n, sugar: null },
      unclear: ['ingredientsText', 'sugar'], ingredientsPhotoPath: 'dev/i.jpg', nutritionPhotoPath: 'dev/n.jpg' });
    expect(r.unclear).toContain('sugar');
  });
});
```
Run: `pnpm --filter @okbite/shared test contract` → Expected: FAIL (module not found).

- [ ] **Step 2: Write `contract.ts`** — exact content:

```ts
import { z } from 'zod';

export const ALLERGENS = ['Gluten', 'Crustacee', 'Ouă', 'Pește', 'Arahide', 'Soia', 'Lapte',
  'Fructe cu coajă lemnoasă', 'Țelină', 'Muștar', 'Susan', 'Dioxid de sulf și sulfiți', 'Lupin', 'Moluște'] as const;
export const Allergen = z.enum(ALLERGENS);
export const Code = z.string().regex(/^(\d{8}|\d{13})$/);
export const Uuid = z.string().uuid();
export const Unit = z.enum(['g', 'ml']);
export const ScoreKind = z.enum(['general', 'cheese', 'red_meat', 'fat', 'beverage', 'water']);
export const IngredientGroup = z.enum(['base', 'fat', 'taste', 'add', 'cult']);
export const ProductStatus = z.enum(['verified', 'unverified', 'hidden']);
export const NUTRIENT_KEYS = ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber', 'fruitVegPct'] as const;
export const NutrientKey = z.enum(NUTRIENT_KEYS);
const amount = z.number().nonnegative().nullable();
export const Nutrients = z.object({
  kcal: amount, fat: amount, sat: amount, sugar: amount, salt: amount, protein: amount, fiber: amount,
  fruitVegPct: z.number().min(0).max(100).nullable(),
});
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Category = z.object({ slug: z.string(), name: z.string(), scoreKind: ScoreKind });
export const Ingredient = z.object({
  slug: z.string().nullable(), name: z.string(), group: IngredientGroup.nullable(), role: z.string().nullable(),
  explanation: z.string().nullable(), source: z.string().nullable(), allergen: Allergen.nullable(),
}); // slug null = not in the knowledge base yet ("Explicație în curând")
export const Product = z.object({
  id: Uuid, code: Code.nullable(), status: ProductStatus,
  name: z.string(), brand: z.string(), quantity: z.string(), category: Category, unit: Unit,
  portion: z.object({ amount: z.number().positive(), label: z.string() }),
  nutrients: Nutrients, ingredientsText: z.string(), ingredients: z.array(Ingredient),
  allergens: z.array(Allergen), mayContain: z.array(Allergen),
  imageUrl: z.string().url().nullable(), labelImageUrl: z.string().url().nullable(),
  source: z.string(), addedAt: IsoDate, verifiedAt: IsoDate.nullable(),
});
export const ScoreReason = z.object({ tone: z.enum(['good', 'bad', 'neutral']), title: z.string(), detail: z.string() });
export const Grade = z.enum(['good', 'medium', 'low', 'unavailable']);
export const Letter = z.enum(['A', 'B', 'C', 'D', 'E']);
export const ScoreResult = z.object({
  score: z.number().int().min(0).max(100).nullable(), letter: Letter.nullable(), grade: Grade,
  reasons: z.array(ScoreReason).max(3), missing: z.array(NutrientKey),
});
export const LookupResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('found'), product: Product, score: ScoreResult }),
  z.object({ status: z.literal('not_found') }),
]);

export const FrontRead = z.object({
  brand: z.string().nullable(), name: z.string().nullable(), quantity: z.string().nullable(), code: Code.nullable(),
});
export const Candidate = z.object({
  id: Uuid, name: z.string(), brand: z.string(), quantity: z.string(),
  imageUrl: z.string().url().nullable(), similarity: z.number().min(0).max(1),
});
export const IdentifyRequest = z.object({ photo: z.string().min(1) }); // base64 JPEG
export const IdentifyResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('found'), product: Product, score: ScoreResult, photoPath: z.string() }),
  z.object({ status: z.literal('candidates'), candidates: z.array(Candidate).min(1).max(3), read: FrontRead, photoPath: z.string() }),
  z.object({ status: z.literal('not_found'), read: FrontRead, photoPath: z.string() }),
]);

export const ReadLabelRequest = z.object({
  ingredientsImage: z.string().min(1), nutritionImage: z.string().min(1).nullable(), // null = both on one photo
});
export const ReadLabelResponse = z.object({
  ingredientsText: z.string().nullable(), unit: Unit.nullable(), nutrients: Nutrients,
  unclear: z.array(z.union([NutrientKey, z.literal('ingredientsText')])),
  ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string().nullable(),
});
export const AddProductRequest = z.object({
  code: Code.nullable(), name: z.string().min(1).max(120), brand: z.string().min(1).max(80),
  quantity: z.string().max(30), unit: Unit, categorySlug: z.string(),
  ingredientsText: z.string().min(3).max(3000), nutrients: Nutrients,
  photoPath: z.string().nullable(), ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string().nullable(),
});
export const ReportRequest = z.object({ productId: Uuid, message: z.string().min(3).max(1000) });
export const ProductInput = AddProductRequest.omit({ photoPath: true, ingredientsPhotoPath: true, nutritionPhotoPath: true });
export const ModerateRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('verify'), productId: Uuid, product: ProductInput }),
  z.object({ action: z.literal('hide'), productId: Uuid, reason: z.string().min(3) }),
  z.object({ action: z.literal('close_report'), reportId: Uuid }),
]);
export const ErrorCode = z.enum(['bad_request', 'rate_limited', 'not_found', 'unauthorized', 'upstream_failed', 'duplicate']);
export const ErrorBody = z.object({ error: ErrorCode, message: z.string() });

// Hand-maintained data files in /data (R3)
export const CategoryEntry = Category;
export const IngredientEntry = z.object({
  slug: z.string(), name: z.string(), aliases: z.array(z.string()), group: IngredientGroup, role: z.string(),
  explanation: z.string(), source: z.string(), allergen: Allergen.nullable(),
  checkedBy: z.string().min(1), checkedAt: IsoDate,
});
export const ScoreFixture = z.object({
  name: z.string(), scoreKind: ScoreKind, nutrients: Nutrients,
  expectedPoints: z.number().int(), expectedLetter: Letter, checkedWith: z.string(),
});
```
Then add `export type X = z.infer<typeof X>;` for every schema above (same name for type and schema).

- [ ] **Step 3: Run tests** — `pnpm --filter @okbite/shared test contract` → Expected: PASS. `pnpm typecheck` → exit 0.

- [ ] **Step 4: Commit** — `feat(shared): add the OkBite API contract`. Post in the team chat: "Contract merged".

---

### Task C2: Database schema, RLS, search and seed (fully specified)

Implemented and locally verified on `C2-database-schema` (2026-11-04). Review was explicitly waived by the user; no review or approval is recorded. C1/PR #4 remains the merge dependency. See `supabase/README.md` for evidence and handoff.

**Files:**
- Create: `supabase/config.toml` (via `supabase init`), `supabase/migrations/20261105000000_init.sql`, `supabase/seed.sql`
- Test: `supabase/tests/rls.test.sql`, `supabase/tests/search.test.sql` (pgTAP)

**Interfaces:**
- Produces: tables `categories`, `ingredients`, `products`, `product_ingredients`, `reports`, `moderators`, `usage_events`, `client_errors`; SQL functions `is_moderator() returns boolean` and `search_products(q text, max_results int default 3) returns table(id uuid, name text, brand text, quantity text, image_path text, similarity real)`; view `daily_stats`; buckets `uploads` (private) and `products` (public).

- [x] **Step 1: Failing pgTAP tests** — anon can select a `verified` and an `unverified` product, not a `hidden` one; anon cannot insert into any table; `search_products('zorel iaurt capsuni')` returns the strawberry yogurt first with similarity ≥ 0.35; `search_products('branza')` matches a product named "Brânză …"; a hidden product never appears in search.
Run: `supabase start && supabase test db` → Expected: FAIL.

- [x] **Step 2: Write the migration**

```sql
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create or replace function f_unaccent(text) returns text language sql immutable parallel safe
  as $$ select public.unaccent('public.unaccent', $1) $$;

create table categories (slug text primary key, name text not null,
  score_kind text not null check (score_kind in ('general','cheese','red_meat','fat','beverage','water')));
create table ingredients (slug text primary key, name text not null, aliases text[] not null default '{}',
  grp text not null check (grp in ('base','fat','taste','add','cult')), role text not null,
  explanation text not null, source text not null, allergen text);
create table products (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^([0-9]{8}|[0-9]{13})$'),
  status text not null default 'unverified' check (status in ('verified','unverified','hidden')),
  name text not null, brand text not null, quantity text not null,
  category_slug text not null references categories, unit text not null check (unit in ('g','ml')),
  portion_amount numeric not null default 100 check (portion_amount > 0), portion_label text not null default '100 g',
  kcal numeric, fat numeric, sat numeric, sugar numeric, salt numeric, protein numeric, fiber numeric,
  fruit_veg_pct numeric check (fruit_veg_pct between 0 and 100),
  ingredients_text text not null, allergens text[] not null default '{}', may_contain text[] not null default '{}',
  image_path text, ingredients_photo_path text, nutrition_photo_path text, source text not null,
  added_by_device text, added_at timestamptz not null default now(), verified_at timestamptz, verified_by uuid references auth.users,
  hidden_reason text, search_text text generated always as (lower(f_unaccent(brand || ' ' || name))) stored);
create index products_search_trgm on products using gin (search_text gin_trgm_ops);
create table product_ingredients (product_id uuid references products on delete cascade, position int not null,
  raw_name text not null, ingredient_slug text references ingredients, primary key (product_id, position));
create table reports (id uuid primary key default gen_random_uuid(), product_id uuid not null references products,
  message text not null check (length(message) between 3 and 1000), device_id text not null,
  status text not null default 'open' check (status in ('open','closed')), created_at timestamptz not null default now());
create table moderators (user_id uuid primary key references auth.users);
create table usage_events (id bigserial primary key,
  kind text not null check (kind in ('photo','barcode','identified','not_found','read_label','added','report')),
  device_id text not null, product_id uuid, created_at timestamptz not null default now());
create index usage_events_device_kind_time on usage_events (device_id, kind, created_at);
create table client_errors (id bigserial primary key, device_id text not null, message text not null,
  stack text, screen text, app_version text, platform text, created_at timestamptz not null default now());
```
Then: `search_products` (`select … similarity(search_text, lower(f_unaccent(q))) … where status <> 'hidden' and search_text % lower(f_unaccent(q)) order by similarity desc limit max_results`, `stable`, `security definer`, with `set pg_trgm.similarity_threshold = 0.35`); `is_moderator()` (`security definer`); RLS on every table; anon `select` on `categories`, `ingredients`, `product_ingredients`, and `products where status <> 'hidden'`; moderators full access on `products`, `product_ingredients`, `reports`; no other policies (functions use the service role). View `daily_stats` per day: photos, barcodes, identified, not_found, read_labels, added. Buckets: `insert into storage.buckets (id, name, public) values ('uploads','uploads',false), ('products','products',true);`

- [x] **Step 3: Seed** — `seed.sql` inserts categories `iaurt` (Iaurturi, general), `biscuiti` (Biscuiți, general), `suc` (Sucuri, beverage); the ingredients used by the prototype products; and the 6 prototype products as `verified`, with the prototype's values and these checksum-valid codes (the prototype's own codes have wrong check digits): natural yogurt `4840001000014`, strawberry yogurt `4840001000021`, Greek yogurt `4840001000038`, oat-chocolate biscuits `4840001000045`, apple juice `4840001000052` (with `sat`, `sugar`, `salt`, `fiber` null), wholegrain biscuits `4840001000069`. Values come from the product table in `docs/prototype/Main.dc.html`.

- [x] **Step 4: Run** — `supabase db reset && supabase test db` → Expected: PASS.

- [x] **Step 5: Commit** — `feat(db): schema, RLS, trigram product search, buckets and seed`

---

### Task C3: `sync-shared`, function helpers and `lookup`

**Files:**
- Create: `scripts/sync-shared.mjs`, `supabase/functions/deno.json`, `supabase/functions/_lib/http.ts`, `supabase/functions/_lib/db.ts`, `supabase/functions/_lib/storage.ts`, `supabase/functions/lookup/index.ts`, `packages/shared/src/score/index.ts` (temporary)
- Modify: root `package.json` (`"sync-shared": "node scripts/sync-shared.mjs"`)
- Test: `supabase/functions/_lib/http.test.ts`, `supabase/functions/lookup/index.test.ts`

**Interfaces:**
- Consumes: C1 contract, C2 tables.
- Produces (D4, D5, C6, C7, D7 rely on these exact names):
  - `_lib/http.ts`: `json(body: unknown, status = 200): Response`, `fail(error: ErrorCode, message: string, status: number): Response`, `cors(req: Request): Response | null` (answers preflight and allows the origins `https://okbite.md`, `https://*.okbite.pages.dev` and `http://localhost:8081` for the web app), `readDeviceId(req: Request): string` (throws `HttpError(400)` when missing or not a UUID), `readJsonBody<T>(req: Request, schema: ZodType<T>, maxBytes = 2_000_000): Promise<T>` (`bad_request` over the limit or on invalid JSON), `checkRateLimit(deviceId: string, kind: UsageKind, max: number): Promise<boolean>` (counts the last 24 h), `logEvent(kind: UsageKind, deviceId: string, productId?: string): Promise<void>`, `adminClient(): SupabaseClient`.
  - `_lib/storage.ts`: `saveJpeg(base64: string, deviceId: string, suffix: 'front' | 'ingredients' | 'nutrition'): Promise<string>` (path in `uploads`), `publishPhoto(uploadPath: string, productId: string, suffix: string): Promise<string>` (copies to the public `products` bucket, returns its path).
  - `_lib/db.ts`: `loadProduct(by: { id: string } | { code: string }): Promise<{ product: Product; score: ScoreResult } | null>` (hidden → null).
  - `computeScore(nutrients: Nutrients, kind: ScoreKind): ScoreResult` from `@okbite/shared` (temporary body returns `{ score: null, letter: null, grade: 'unavailable', reasons: [], missing: [] }`; C4 replaces it).

- [x] **C3a: generation only (locally verified)** — generator, root script wiring and focused tests; repeatable output and stale-file cleanup verified; generated entry point passes `deno check`. Review requirements waived by the user.
  C3a does not require C2 or database services. Remaining C3 work is implemented and locally verified in dependent C3b/C3c/C3d/C3 PRs; see `supabase/README.md`. Review waived; unmerged and undeployed.

- [x] **Step 1: `sync-shared`** copies `packages/shared/src/**/*.ts` (not tests) to `supabase/functions/_shared/`, rewrites `'zod'` to `'npm:zod@3.23.8'`, adds `.ts` to relative imports, and writes a `// GENERATED by pnpm sync-shared — do not edit` header. `deno.json` imports `@supabase/supabase-js` as `npm:@supabase/supabase-js@2`.
Run: `pnpm sync-shared && deno check supabase/functions/_shared/index.ts` → Expected: exit 0.

- [x] **Step 2: Failing tests** — `lookup?code=4840001000014` → 200 `found`, valid `LookupResponse`, `product.status === 'verified'`, ingredients in label order; `lookup?id=<seeded uuid>` → same product; `code=4840001009995` → 200 `not_found`, one `not_found` usage event; `code=abc` → 400 `bad_request`; neither `code` nor `id` → 400; missing `x-device-id` → 400.
Run: `deno test --allow-all supabase/functions/lookup/` (with `supabase start`) → Expected: FAIL.

- [x] **Step 3: Implement** the helpers and `lookup` (validate → `loadProduct` → log `barcode` or `not_found` → `json`). Run → Expected: PASS.

- [x] **Step 4: Commit** — `feat(functions): shared helpers and product lookup`

---

### Task C6: `add-product` and `report` functions

**Files:**
- Create: `supabase/functions/add-product/index.ts`, `supabase/functions/add-product/matchIngredients.ts`, `supabase/functions/report/index.ts`
- Test: `supabase/functions/add-product/matchIngredients.test.ts`, `supabase/functions/add-product/index.test.ts`, `supabase/functions/report/index.test.ts`

**Interfaces:**
- Consumes: `AddProductRequest`, `LookupResponse`, `ReportRequest` (C1); `computeScore` (C4); `detectAllergens` (D3); `_lib/*` (C3).
- Produces: `POST /functions/v1/add-product` → `LookupResponse` (`found`, product `unverified`); `POST /functions/v1/report` → `{ status: 'ok' }`; `matchIngredients(text: string, kb: IngredientEntry[]): { rawName: string; slug: string | null }[]`.

- [ ] **Step 1: Failing tests**
  - `matchIngredients('lapte normalizat, preparat de căpșuni 12% (căpșuni, zahăr, pectină), zahăr', kb)` → top-level items only (`lapte normalizat`, `preparat de căpșuni 12%`, `zahăr`), matched by name or alias ignoring case, diacritics and percentages; unknown → `slug: null`.
  - add-product: valid request → product row `unverified`, allergens and may-contain from `detectAllergens`, photos copied to the public bucket, response is a valid `LookupResponse` with a score; photo paths not under `<deviceId>/` → 400; existing code → 200 with the existing product (no duplicate); two concurrent requests for one new code → one row; 11th add in 24 h → 429.
  - report: message of 2 chars → 400; valid → row `open`.
- [ ] **Step 2: Implement** — insert inside one transaction (`on conflict (code) do nothing returning id`, then select the existing row if nothing returned); log `added` / `report` usage events.
- [ ] **Step 3: Verify and commit** — tests PASS; `feat(functions): add products from shoppers and accept error reports`

---

### Task C7: Moderation function and admin screens

**Files:**
- Create: `supabase/functions/moderate/index.ts`, `apps/mobile/app/admin/index.tsx`, `apps/mobile/app/admin/product/[id].tsx`, `apps/mobile/src/features/admin/UnverifiedList.tsx`, `apps/mobile/src/features/admin/ProductEditor.tsx`, `apps/mobile/src/features/admin/ReportsList.tsx`
- Test: `supabase/functions/moderate/index.test.ts`, `apps/mobile/src/features/admin/ProductEditor.test.tsx`

**Interfaces:**
- Consumes: `ModerateRequest` (C1); `is_moderator()` (C2); B1's `supabase` client and UI kit.
- Produces: the `/admin` routes (reached by a long press on the app version in About; requires a moderator magic-link sign-in).

- [ ] **Step 1: Failing tests** — non-moderator JWT → 401; `verify` updates the fields, sets `status = 'verified'` and `verified_at`, re-matches ingredients; `hide` sets `hidden` with the reason; `close_report` closes it. UI: saving with an empty name shows a validation error and sends nothing.
- [ ] **Step 2: Implement** — list of unverified products (newest first) with the three photos and editable fields; open reports list; Verify / Hide / Close actions.
- [ ] **Step 3: Verify** — tests PASS; on staging, verify one real shopper-added product on a phone.
- [ ] **Step 4: Commit** — `feat(admin): verify, hide and handle reports from the app`

---

### Task C8: Backups and moderation routine (human-led)

- [ ] **Step 1:** Write `docs/ops/moderation.md`: daily routine (verify or hide every unverified product, close reports), what to check (photos match fields, allergens printed in bold on the label are listed), rota 8 Dec – 8 Jan.
- [ ] **Step 2:** Backup and restore drill on staging (`supabase db dump`, restore into a fresh local DB, `supabase test db`); record the commands.
- [ ] **Step 3: Commit** — `docs(ops): moderation routine and backup drill`
