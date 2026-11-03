# OkBite Lane C (Backend and Contract) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md` and `docs/superpowers/plans/2026-11-03-okbite-overall.md` (Global Constraints, Review Focus, dependencies) before Task C1.

**Goal:** Define the shared contract and database, then build the product lookup, scoring, data loading, submissions and moderation that the app and the other lanes depend on.

**Architecture:** The contract (`packages/shared/src/contract.ts`) is the single source of types and Zod schemas; it is copied into `supabase/functions/_shared/` for the Deno functions. Postgres holds approved products and pending submissions; shoppers never write to tables directly, only through functions using the service role. The score is a pure function in `packages/shared/src/score/` so the app, functions and tests all use the same code.

**Tech Stack:** TypeScript 5, Zod 3, Vitest, Supabase CLI, Postgres 15 with RLS, Deno Edge Functions, Supabase Storage and Auth, React (admin page only).

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Lane-specific: you are the only lane allowed to change `contract.ts` and `supabase/migrations/`. A contract change needs a new migration when it touches stored data, a `pnpm sync-shared` run, and a message in the team chat naming the change.

## Review Focus (owned here)

- Any of kcal, sugar, sat or salt `null` → `score: null`, `grade: 'unavailable'`, `missing` lists exactly those keys (C4).
- `lookup` with a malformed code (letters, 12 digits) → 400 `bad_request`, not 404 (C3).
- A moderator approving a submission for a code that already exists updates that product instead of failing (C7).

---

### Task C1: Contract (fully specified)

**Files:**
- Create: `packages/shared/src/contract.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from './contract';`)
- Test: `packages/shared/src/contract.test.ts`

**Interfaces:**
- Produces: every schema and type below. All other lanes import them from `@okbite/shared` (web) or `../_shared/contract.ts` (functions).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { Code, LookupResponse, ReadLabelResponse, Nutrients } from './contract';

describe('contract', () => {
  it('accepts EAN-8 and EAN-13, rejects others', () => {
    expect(Code.safeParse('4840001000014').success).toBe(true);
    expect(Code.safeParse('48400010').success).toBe(true);
    expect(Code.safeParse('484000100001').success).toBe(false);
    expect(Code.safeParse('48400010000a7').success).toBe(false);
  });
  it('allows null nutrients but not negative ones', () => {
    const base = { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: 0, fruitVegPct: null };
    expect(Nutrients.safeParse(base).success).toBe(true);
    expect(Nutrients.safeParse({ ...base, sugar: -1 }).success).toBe(false);
  });
  it('parses a not_found lookup', () => {
    expect(LookupResponse.parse({ status: 'not_found', code: '4840001009995' }).status).toBe('not_found');
  });
  it('lists unclear fields in read-label responses', () => {
    const r = ReadLabelResponse.parse({
      ingredientsText: null, unit: 'g', unclear: ['ingredientsText', 'sugar'],
      nutrients: { kcal: 530, fat: 30, sat: 14, sugar: null, salt: 0.3, protein: 6, fiber: 2, fruitVegPct: null },
      ingredientsPhotoPath: 'dev/a-ingredients.jpg', nutritionPhotoPath: 'dev/a-nutrition.jpg',
    });
    expect(r.unclear).toContain('sugar');
  });
});
```
Run: `pnpm --filter @okbite/shared test contract` → Expected: FAIL (module not found).

- [ ] **Step 2: Write `contract.ts`** — exact content (this is the contract, so it is spelled out):

```ts
import { z } from 'zod';

export const ALLERGENS = ['Gluten', 'Crustacee', 'Ouă', 'Pește', 'Arahide', 'Soia', 'Lapte',
  'Fructe cu coajă lemnoasă', 'Țelină', 'Muștar', 'Susan', 'Dioxid de sulf și sulfiți', 'Lupin', 'Moluște'] as const;
export const Allergen = z.enum(ALLERGENS);
export const Code = z.string().regex(/^(\d{8}|\d{13})$/);
export const Unit = z.enum(['g', 'ml']);
export const ScoreKind = z.enum(['general', 'cheese', 'red_meat', 'fat', 'beverage', 'water']);
export const IngredientGroup = z.enum(['base', 'fat', 'taste', 'add', 'cult']);
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
  slug: z.string(), name: z.string(), group: IngredientGroup, role: z.string(),
  explanation: z.string(), source: z.string(), allergen: Allergen.nullable(),
});
export const Product = z.object({
  code: Code, name: z.string(), brand: z.string(), quantity: z.string(), category: Category, unit: Unit,
  portion: z.object({ amount: z.number().positive(), label: z.string() }),
  nutrients: Nutrients, ingredientsText: z.string(), ingredients: z.array(Ingredient),
  allergens: z.array(Allergen), mayContain: z.array(Allergen),
  imageUrl: z.string().url().nullable(), labelImageUrl: z.string().url().nullable(),
  source: z.string(), photoTakenAt: IsoDate.nullable(), photoPlace: z.string().nullable(), checkedAt: IsoDate,
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
  z.object({ status: z.literal('not_found'), code: Code }),
]);
export const ReadLabelRequest = z.object({ code: Code, ingredientsImage: z.string().min(1), nutritionImage: z.string().min(1) });
export const ReadLabelResponse = z.object({
  ingredientsText: z.string().nullable(), unit: Unit.nullable(), nutrients: Nutrients,
  unclear: z.array(z.union([NutrientKey, z.literal('ingredientsText')])),
  ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string(),
});
export const SubmitRequest = z.object({
  code: Code, name: z.string().min(1).max(120), brand: z.string().min(1).max(80), quantity: z.string().max(30),
  unit: Unit, ingredientsText: z.string().min(3).max(3000), nutrients: Nutrients,
  ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string(),
});
export const SubmitResponse = z.object({ status: z.literal('queued'), submissionId: z.string().uuid() });
export const ReportRequest = z.object({ code: Code, message: z.string().min(3).max(1000) });
export const ProductInput = Product.omit({ category: true, ingredients: true, imageUrl: true, labelImageUrl: true })
  .extend({ categorySlug: z.string(), ingredientSlugs: z.array(z.string()) });
export const ModerateRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), submissionId: z.string().uuid(), product: ProductInput }),
  z.object({ action: z.literal('reject'), submissionId: z.string().uuid(), reason: z.string().min(3) }),
  z.object({ action: z.literal('close_report'), reportId: z.string().uuid() }),
]);
export const ErrorCode = z.enum(['bad_request', 'rate_limited', 'not_found', 'unauthorized', 'upstream_failed']);
export const ErrorBody = z.object({ error: ErrorCode, message: z.string() });

// Hand-maintained data files in /data (Lane A)
export const CategoryEntry = Category;
export const IngredientEntry = Ingredient.extend({ checkedBy: z.string().min(1), checkedAt: IsoDate });
export const ScoreFixture = z.object({
  name: z.string(), scoreKind: ScoreKind, nutrients: Nutrients,
  expectedPoints: z.number().int(), expectedLetter: Letter, checkedWith: z.string(),
});
```
Then add `export type X = z.infer<typeof X>;` for every schema above (same name for type and schema).

- [ ] **Step 3: Run tests** — `pnpm --filter @okbite/shared test contract` → Expected: PASS. `pnpm typecheck` → exit 0.

- [ ] **Step 4: Commit** — `feat(shared): add the OkBite API contract`. Post in the team chat: "Contract merged".

---

### Task C2: Database schema, RLS and seed (fully specified)

**Files:**
- Create: `supabase/config.toml` (via `supabase init`), `supabase/migrations/20261105000000_init.sql`, `supabase/seed.sql`
- Test: `supabase/tests/rls.test.sql` (pgTAP)

**Interfaces:**
- Consumes: names and enums from C1.
- Produces: tables `categories`, `ingredients`, `products`, `product_ingredients`, `submissions`, `reports`, `moderators`, `usage_events`, `client_errors`; view `daily_stats`; buckets `uploads` (private) and `labels` (public); SQL function `is_moderator() returns boolean`.

- [ ] **Step 1: Write the failing pgTAP test** — anon can `select` an approved product; anon cannot select a product with `status = 'hidden'`; anon cannot `insert` into `products`, `submissions`, `reports`; anon cannot `select` `submissions`.
Run: `supabase start && supabase test db` → Expected: FAIL (tables missing).

- [ ] **Step 2: Write the migration** — columns (snake_case, nutrients nullable numeric):

```sql
create table categories (slug text primary key, name text not null,
  score_kind text not null check (score_kind in ('general','cheese','red_meat','fat','beverage','water')));
create table ingredients (slug text primary key, name text not null,
  grp text not null check (grp in ('base','fat','taste','add','cult')), role text not null,
  explanation text not null, source text not null, allergen text);
create table products (
  code text primary key check (code ~ '^([0-9]{8}|[0-9]{13})$'),
  name text not null, brand text not null, quantity text not null,
  category_slug text not null references categories, unit text not null check (unit in ('g','ml')),
  portion_amount numeric not null check (portion_amount > 0), portion_label text not null,
  kcal numeric, fat numeric, sat numeric, sugar numeric, salt numeric, protein numeric, fiber numeric,
  fruit_veg_pct numeric check (fruit_veg_pct between 0 and 100),
  ingredients_text text not null, allergens text[] not null default '{}', may_contain text[] not null default '{}',
  image_path text, label_image_path text, source text not null,
  photo_taken_at date, photo_place text, checked_at date not null,
  status text not null default 'approved' check (status in ('approved','hidden')),
  updated_at timestamptz not null default now());
create table product_ingredients (product_code text references products on delete cascade,
  position int not null, ingredient_slug text not null references ingredients, primary key (product_code, position));
create table submissions (id uuid primary key default gen_random_uuid(), code text not null, payload jsonb not null,
  ingredients_photo_path text not null, nutrition_photo_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text, device_id text not null, created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users, reviewed_at timestamptz);
create table reports (id uuid primary key default gen_random_uuid(), code text not null,
  message text not null check (length(message) between 3 and 1000), device_id text not null,
  status text not null default 'open' check (status in ('open','closed')), created_at timestamptz not null default now());
create table moderators (user_id uuid primary key references auth.users);
create table usage_events (id bigserial primary key, kind text not null check (kind in ('scan','not_found','submit','read_label','report')),
  device_id text not null, code text, created_at timestamptz not null default now());
create index usage_events_device_kind_time on usage_events (device_id, kind, created_at);
create table client_errors (id bigserial primary key, device_id text not null, message text not null,
  stack text, route text, app_version text, created_at timestamptz not null default now());
```
Then: `is_moderator()` (`exists (select 1 from moderators where user_id = auth.uid())`, `security definer`); enable RLS on every table; policies: anon/authenticated `select` on `categories`, `ingredients`, `product_ingredients`, and `products where status = 'approved'`; moderators `select/update` on `submissions` and `reports` and full access on `products`, `product_ingredients`; no other policies (functions use the service role). View `daily_stats` (per day: scans, not_found, submits, read_labels). Buckets: `insert into storage.buckets (id, name, public) values ('uploads','uploads',false), ('labels','labels',true);`

- [ ] **Step 3: Seed** — `seed.sql` inserts categories `iaurt` (Iaurturi, general), `biscuiti` (Biscuiți, general), `suc` (Sucuri, beverage); the ingredients used by the prototype products; and the 6 prototype products with exactly the prototype's values (use these checksum-valid codes, because the prototype's codes have wrong check digits: natural yogurt `4840001000014`, strawberry yogurt `4840001000021`, Greek yogurt `4840001000038`, oat-chocolate biscuits `4840001000045`, apple juice `4840001000052` with `sat`, `sugar`, `salt`, `fiber` null, wholegrain biscuits `4840001000069`). Source for values: the prototype's `Main.dc.html` product table.

- [ ] **Step 4: Run** — `supabase db reset && supabase test db` → Expected: PASS.

- [ ] **Step 5: Commit** — `feat(db): add schema, RLS policies, storage buckets and seed`

---

### Task C3: `sync-shared`, function helpers and `lookup`

**Files:**
- Create: `scripts/sync-shared.mjs`, `supabase/functions/deno.json`, `supabase/functions/_lib/http.ts`, `supabase/functions/_lib/db.ts`, `supabase/functions/lookup/index.ts`, `packages/shared/src/score/index.ts` (temporary)
- Modify: root `package.json` (`"sync-shared": "node scripts/sync-shared.mjs"`)
- Test: `supabase/functions/_lib/http.test.ts`, `supabase/functions/lookup/index.test.ts`

**Interfaces:**
- Consumes: C1 contract, C2 tables.
- Produces (D4, C6, C7, D6 rely on these exact names in `_lib/http.ts`): `json(body: unknown, status = 200): Response`, `fail(error: ErrorCode, message: string, status: number): Response`, `readDeviceId(req: Request): string` (throws → 400 if header missing or not a UUID), `checkRateLimit(deviceId: string, kind: UsageKind, max: number): Promise<boolean>` (true = allowed, counts last 24 h), `logEvent(kind: UsageKind, deviceId: string, code?: string): Promise<void>`, `adminClient(): SupabaseClient`, `cors(req): Response | null` (handles OPTIONS). In `_lib/db.ts`: `loadProduct(code: string): Promise<Product | null>`.
- Produces: `computeScore(nutrients: Nutrients, kind: ScoreKind): ScoreResult` exported from `@okbite/shared` (temporary body returns `{ score: null, letter: null, grade: 'unavailable', reasons: [], missing: [] }`; C4 replaces it).

- [ ] **Step 1: `sync-shared`** copies `packages/shared/src/**/*.ts` (not `*.test.ts`) into `supabase/functions/_shared/`, rewriting the `'zod'` import to `'npm:zod@3.23.8'` and adding `.ts` to relative imports; it writes a `// GENERATED by pnpm sync-shared — do not edit` header. `deno.json` sets `"imports": { "@supabase/supabase-js": "npm:@supabase/supabase-js@2" }`.
Run: `pnpm sync-shared && deno check supabase/functions/_shared/index.ts` → Expected: exit 0.

- [ ] **Step 2: Failing tests** — `lookup?code=4840001000014` → 200 `found`, parses with `LookupResponse`, `product.category.slug === 'iaurt'`, ingredients in label order; `code=4840001009995` → 200 `not_found` and one `not_found` usage event; `code=abc` → 400 `bad_request`; missing `x-device-id` → 400.
Run: `deno test supabase/functions/lookup/` (against `supabase start`) → Expected: FAIL.

- [ ] **Step 3: Implement** `_lib/http.ts`, `_lib/db.ts` (one query joining category and ordered ingredients; image URLs from the public `labels` bucket), and `lookup/index.ts` (validate code → `loadProduct` → `computeScore` → log `scan` or `not_found` → `json`). Run → Expected: PASS.

- [ ] **Step 4: Commit** — `feat(functions): add shared helpers and product lookup`

---

### Task C4: Score engine

**Files:**
- Create: `packages/shared/src/score/nutriscore.ts`, `packages/shared/src/score/toHundred.ts`, `packages/shared/src/score/reasons.ts`
- Modify: `packages/shared/src/score/index.ts` (replace the temporary body)
- Test: `packages/shared/src/score/nutriscore.test.ts`, `packages/shared/src/score/toHundred.test.ts`, `packages/shared/src/score/index.test.ts`

**Interfaces:**
- Consumes: `Nutrients`, `ScoreKind`, `ScoreResult`, `ScoreFixture` (C1); `data/score-fixtures.json` (A3).
- Produces: `nutriScorePoints(n: Nutrients, kind: ScoreKind): { points: number; letter: Letter; components: Record<string, number> }`, `toHundred(points: number, letter: Letter, kind: ScoreKind): number`, `computeScore(n, kind): ScoreResult` (same signature as C3).

- [ ] **Step 1: Failing tests**
  - `nutriscore.test.ts`: every entry of `data/score-fixtures.json` gives `expectedPoints` and `expectedLetter`.
  - `toHundred.test.ts`: the best possible points for `general` → 100; the worst → 0; the first points value of B → 79; the last points value of C → 40; scores never leave 0–100.
  - `index.test.ts`: `sugar: null` → `{ score: null, grade: 'unavailable', missing: ['sugar'] }`; a fixture graded A or B → `grade: 'good'`; C → `'medium'`; D or E → `'low'`; reasons ≤ 3, Romanian, each detail containing the real number with a decimal comma (e.g. "13,2 g la 100 g").
  Run: `pnpm --filter @okbite/shared test score` → Expected: FAIL.

- [ ] **Step 2: Implement `nutriScorePoints`** following the 2023 update reports from Santé publique France exactly (general foods incl. cheese and red meat; fats, oils, nuts and seeds; beverages incl. water). Put the report's table references as comments next to each threshold table. Missing positive components count as 0 points; missing kcal, sugar, sat or salt is handled in `computeScore`, never here.

- [ ] **Step 3: Implement `toHundred`** — band edges per spec §4: A 100–80, B 79–60, C 59–40, D 39–20, E 19–0; inside a band, `score = top − round((points − bandMin) / (bandMax − bandMin) × (top − bottom))`, using that kind's letter cut-offs as `bandMin/bandMax` and the kind's minimum and maximum possible points for the open ends.

- [ ] **Step 4: Implement `reasons.ts` and `computeScore`** — bad reasons from the two highest negative components scoring at least half their maximum; one good reason from the highest positive component scoring ≥ 2; a neutral reason only if fewer than 2 reasons exist. Titles and wording follow the prototype's examples ("Zahăr adăugat", "Bogat în fibre", "Grăsimi saturate: nivel mediu").

- [ ] **Step 5: Verify** — Run the tests → Expected: PASS. Human owner checks 5 fixtures by hand against the official calculator before the PR.

- [ ] **Step 6: Commit** — `feat(shared): compute Nutri-Score 2023 points and the 0–100 OkBite score`

---

### Task C5: Data loaders and Open Food Facts import

**Files:**
- Create: `scripts/load-data.ts`, `scripts/import-off.ts`
- Modify: root `package.json` (`"data:load": "tsx scripts/load-data.ts"`, `"data:off": "tsx scripts/import-off.ts"`)
- Test: `scripts/import-off.test.ts`

**Interfaces:**
- Consumes: `data/categories.json`, `data/ingredients.json` (A2, validated with `CategoryEntry`, `IngredientEntry`); env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Failing test** for `mapOffProduct(off: OffProduct): ProductInput | null`: maps `product_name`, `brands`, `quantity`, `nutriments.*_100g` (salt from `salt_100g`), returns `null` when the code does not start with `484` or the name is empty; nutrients absent in OFF stay `null`.
- [ ] **Step 2: Implement** both scripts. `load-data` upserts categories and ingredients and refuses to run if any ingredient lacks `checkedBy`. `import-off` streams the OFF CSV export (or queries the OFF search API for `code` prefix 484, 100 per page), upserts with `source = 'Open Food Facts'`, category `necunoscut` (general) unless mapped, and is safe to re-run.
- [ ] **Step 3: Run** — `pnpm data:load && pnpm data:off` against staging → Expected: counts printed; re-running changes nothing.
- [ ] **Step 4: Commit** — `feat(scripts): load hand-checked data and import Moldovan products from Open Food Facts`

---

### Task C6: `submit` and `report` functions

**Files:**
- Create: `supabase/functions/submit/index.ts`, `supabase/functions/report/index.ts`
- Test: `supabase/functions/submit/index.test.ts`, `supabase/functions/report/index.test.ts`

**Interfaces:**
- Consumes: `SubmitRequest`, `SubmitResponse`, `ReportRequest` (C1); `_lib/http.ts` (C3).
- Produces: `POST /functions/v1/submit` → `SubmitResponse`; `POST /functions/v1/report` → `{ status: 'ok' }`.

- [ ] **Step 1: Failing tests** — valid submit → 200 `queued`, row with status `pending`; photo paths not under `<deviceId>/` → 400; 11th submit in 24 h → 429; report message of 2 chars → 400; valid report → row `open`.
- [ ] **Step 2: Implement**, logging `submit` and `report` usage events. Run → Expected: PASS.
- [ ] **Step 3: Commit** — `feat(functions): accept product submissions and error reports`

---

### Task C7: Moderation function and `/admin` page

**Files:**
- Create: `supabase/functions/moderate/index.ts`, `apps/web/src/features/admin/AdminPage.tsx`, `apps/web/src/features/admin/SubmissionReview.tsx`, `apps/web/src/features/admin/ReportsList.tsx`
- Test: `supabase/functions/moderate/index.test.ts`, `apps/web/src/features/admin/SubmissionReview.test.tsx`

**Interfaces:**
- Consumes: `ModerateRequest` (C1); `is_moderator()` (C2); B1's `supabase` client (`apps/web/src/lib/supabase.ts`) and UI kit.
- Produces: route component `AdminPage` (B1 registers `/admin` lazily).

- [ ] **Step 1: Failing tests** — non-moderator JWT → 401; `approve` creates the product, links ingredients in order, copies the label photo from `uploads` to public `labels`, marks the submission approved; `approve` for an existing code updates it; `reject` stores the reason; `close_report` closes it. UI test: approving with an empty category shows a validation error and sends nothing.
- [ ] **Step 2: Implement** — the page signs in with a Supabase magic link, lists pending submissions with both photos side by side with the editable fields (pre-filled from the submission, allergens pre-filled with `detectAllergens`), category picker, ingredient matcher (suggests slugs from `ingredients` by name), and buttons Approve / Reject; a second tab lists open reports.
- [ ] **Step 3: Verify** — tests PASS; on staging, approve one real submission and see it via `lookup`.
- [ ] **Step 4: Commit** — `feat(admin): moderate submissions and reports`

---

### Task C8: Backups and moderation rota (human-led)

- [ ] **Step 1:** Write `docs/ops/moderation.md`: daily routine (approve or reject everything pending, close reports), what to check on each submission (photo matches fields, allergens bold on the label are listed), rota for 8 Dec – 8 Jan.
- [ ] **Step 2:** Run a backup and restore drill on staging (`supabase db dump`, restore into a fresh local DB, run `supabase test db`); record the commands in the doc.
- [ ] **Step 3: Commit** — `docs(ops): moderation routine and backup drill`
