# OkBite R3 · AI and Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-04-okbite-overall.md` (Global Constraints, Review Focus, who owns what, dependencies) and the spec before your first task. Steps marked **(human)** are done or checked by the person, not the agent. Task IDs keep their original letters (A = content, B = app, C = backend, D = platform/AI) so cross-references stay stable.

**Goal:** Everything that turns photos and labels into trustworthy facts: barcode normaliser and allergen matcher, the Claude-powered `identify` and `read-label` functions, the score engine, the ingredient knowledge base, score fixtures, and the data loaders and Open Food Facts import.

**Owns (only this role edits these paths):** `packages/shared/src/score/`, `packages/shared/src/ean/`, `packages/shared/src/allergens/`, `supabase/functions/identify/`, `supabase/functions/read-label/`, `supabase/functions/_lib/claude.ts`, `data/`, `scripts/check-data.ts`, `scripts/load-data.ts`, `scripts/import-off.ts`

**Tasks in order:** D3 → A3 → C4 → A2 → C5 → D4 → D5

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Role-specific: every fact you produce (allergen synonyms, ingredient explanations, score fixtures) must cite a source a human opened. The 150 ingredient checks in A2 are split across all five people (30 each) on 10–13 Nov; you prepare the drafts and merge. C3 (R2) creates a temporary `score/index.ts`; C4 replaces it.

## Review Focus (owned here)

- A barcode Claude read but the phone missed counts only when its checksum is valid (D4).
- "0,3" → 0.3; blank or unreadable → `null` and listed in `unclear` (D5).
- Any of kcal, sugar, sat or salt missing → `score: null`, `grade: unavailable` (C4).
- "unt de cacao" is not milk; "poate conține" goes to `mayContain` (D3).

---

### Task D3: EAN normaliser and allergen matcher

**Files:**
- Create: `packages/shared/src/ean/index.ts`, `packages/shared/src/allergens/index.ts`, `packages/shared/src/allergens/synonyms.ts`
- Modify: `packages/shared/src/index.ts` (re-exports)
- Test: `packages/shared/src/ean/index.test.ts`, `packages/shared/src/allergens/index.test.ts`

**Interfaces:**
- Consumes: `Allergen`, `ALLERGENS` (C1).
- Produces: `normalizeCode(raw: string): string | null` (digits only; UPC-A 12 digits → EAN-13 with leading `0`; valid EAN-8/13 checksum or `null`); `detectAllergens(text: string): { allergens: Allergen[]; mayContain: Allergen[] }` (in `ALLERGENS` order, no duplicates).

- [ ] **Step 1: Failing tests**
```ts
it.each([
  ['4840001000014', '4840001000014'], ['036000291452', '0036000291452'], ['4840001000017', null],
  ['96385074', '96385074'], [' 4840001 000014 ', '4840001000014'], ['abc', null],
])('normalizeCode(%s)', (raw, out) => expect(normalizeCode(raw)).toBe(out));

it.each([
  ['lapte normalizat, culturi lactice vii', ['Lapte'], []],
  ['făină de grâu, zahăr, lecitină din soia', ['Gluten', 'Soia'], []],
  ['ciocolată (zahăr, unt de cacao, masă de cacao)', [], []],
  ['FAINA DE GRAU, OUA', ['Gluten', 'Ouă'], []],
  ['zahăr. Poate conține urme de arahide și susan.', [], ['Arahide', 'Susan']],
  ['ovăz 32%, lapte praf. Poate conține: ouă.', ['Gluten', 'Lapte'], ['Ouă']],
])('detectAllergens(%s)', (text, allergens, may) => expect(detectAllergens(text)).toEqual({ allergens, mayContain: may }));
```
Run: `pnpm --filter @okbite/shared test` → Expected: FAIL.
- [ ] **Step 2: Implement** — allergens: lower-case and strip diacritics, split at the first "poate conține / poate contine / urme de" (before → `allergens`, after → `mayContain`); `synonyms.ts` lists Romanian keywords per allergen with a comment citing Reg. (UE) nr. 1169/2011, Anexa II ("unt" counts as milk except in "unt de cacao").
- [ ] **Step 3: Verify** — PASS; the human owner checks `synonyms.ts` against the regulation.
- [ ] **Step 4: Commit** — `feat(shared): barcode normaliser and Romanian allergen matcher`

---

### Task A3: Score test fixtures

**Files:**
- Create: `data/score-fixtures.json`

**Interfaces:**
- Produces: 30 `ScoreFixture` entries for C4's tests: at least 5 per letter A–E, at least 4 beverages, 3 cheeses, 3 fats/oils, 1 water.

- [ ] **Step 1 (human):** Pick 30 real products and copy their per-100 g values.
- [ ] **Step 2 (human):** Enter each into the official Nutri-Score 2023 calculator spreadsheet from Santé publique France; record `expectedPoints`, `expectedLetter` and `checkedWith: "SpF calculator <version>"`.
- [ ] **Step 3:** `pnpm data:check` → 0 errors.
- [ ] **Step 4: Commit** — `test(data): 30 hand-checked Nutri-Score fixtures`. C4 (also yours) uses them.

---

### Task C4: Score engine

**Files:**
- Create: `packages/shared/src/score/nutriscore.ts`, `toHundred.ts`, `reasons.ts`
- Modify: `packages/shared/src/score/index.ts` (replace the temporary body)
- Test: `packages/shared/src/score/nutriscore.test.ts`, `toHundred.test.ts`, `index.test.ts`

**Interfaces:**
- Consumes: `Nutrients`, `ScoreKind`, `ScoreResult`, `ScoreFixture` (C1); `data/score-fixtures.json` (A3).
- Produces: `nutriScorePoints(n: Nutrients, kind: ScoreKind): { points: number; letter: Letter; components: Record<string, number> }`, `toHundred(points: number, letter: Letter, kind: ScoreKind): number`, `computeScore(n, kind): ScoreResult` (same signature as in C3).

- [ ] **Step 1: Failing tests**
  - `nutriscore.test.ts`: every entry of `data/score-fixtures.json` gives its `expectedPoints` and `expectedLetter`.
  - `toHundred.test.ts`: best possible `general` points → 100; worst → 0; first points value of B → 79; last points value of C → 40; never outside 0–100.
  - `index.test.ts`: `sugar: null` → `{ score: null, grade: 'unavailable', missing: ['sugar'] }`; letters A/B → `good`, C → `medium`, D/E → `low`; ≤ 3 reasons in Romanian whose detail contains the real number with a decimal comma ("13,2 g la 100 g").
  Run: `pnpm --filter @okbite/shared test score` → Expected: FAIL.
- [ ] **Step 2: Implement `nutriScorePoints`** exactly as in Santé publique France's 2023 update reports (general foods incl. cheese and red meat; fats, oils, nuts and seeds; beverages incl. water), with the report's table references as comments. Missing positive components count as 0; missing kcal/sugar/sat/salt is handled in `computeScore`.
- [ ] **Step 3: Implement `toHundred`** per spec §4: inside a band, `score = top − round((points − bandMin) / (bandMax − bandMin) × (top − bottom))`, using the kind's letter cut-offs and its minimum/maximum possible points for open ends.
- [ ] **Step 4: Implement `reasons.ts` and `computeScore`** — bad reasons from the two highest negative components scoring at least half their maximum; one good reason from the highest positive component scoring ≥ 2; a neutral reason only if fewer than 2 exist. Wording follows the prototype ("Zahăr adăugat", "Bogat în fibre", "Grăsimi saturate: nivel mediu").
- [ ] **Step 5: Verify** — tests PASS; the human owner checks 5 fixtures against the official calculator before the PR.
- [ ] **Step 6: Commit** — `feat(shared): Nutri-Score 2023 points and the 0–100 OkBite score`

---

### Task A2: Categories and ingredient knowledge base

**Files:**
- Create: `data/categories.json`, `data/ingredients.json`, `scripts/check-data.ts`
- Modify: root `package.json` (`"data:check": "tsx scripts/check-data.ts"`)
- Test: `scripts/check-data.test.ts`

**Interfaces:**
- Consumes: `CategoryEntry`, `IngredientEntry`, `ScoreFixture`, `ALLERGENS` (C1).
- Produces: the two JSON files and `checkData(): { errors: string[] }` (C5's loader imports it).

- [ ] **Step 1: Failing test** — `checkData` reports: an ingredient without `checkedBy`; a duplicate slug or alias; an allergen not in `ALLERGENS`; a category with an unknown `scoreKind`; an invalid entry in `data/score-fixtures.json` (when the file exists).
- [ ] **Step 2: Categories** — about 16 shelf categories in Moldovan shops (iaurt, lapte, brânză, unt și smântână, biscuiți, ciocolată și dulciuri, cereale, pâine, mezeluri, ulei, snacks sărate, suc, băuturi răcoritoare, apă, înghețată, conserve) plus `necunoscut`, each with the right `scoreKind` (`cheese` for brânză, `fat` for ulei and unt, `beverage` for sucuri and răcoritoare, `water` for apă, `red_meat` where it applies, else `general`).
- [ ] **Step 3: Ingredients** — 150 entries for the most common ingredients and E-numbers on Moldovan labels, each with `aliases` as they appear on labels (e.g. "E322", "lecitină din soia", "emulsifiant: lecitine"). The agent drafts `role`, a plain one-to-two-sentence Romanian `explanation`, and `source` (Reg. (UE) nr. 1333/2008 for additives, the EFSA page for the additive, or the Moldovan food safety agency). **(human)** open each source, correct the text, fill `checkedBy` and `checkedAt`.
- [ ] **Step 4: Verify** — `pnpm data:check` → Expected: `0 errors`.
- [ ] **Step 5: Commit** — `feat(data): categories and 150 checked ingredient explanations`

---

### Task C5: Data loaders and Open Food Facts import

**Files:**
- Create: `scripts/load-data.ts`, `scripts/import-off.ts`
- Modify: root `package.json` (`"data:load": "tsx scripts/load-data.ts"`, `"data:off": "tsx scripts/import-off.ts"`)
- Test: `scripts/import-off.test.ts`

**Interfaces:**
- Consumes: `data/categories.json`, `data/ingredients.json` (A2), `checkData()` from `scripts/check-data.ts` (A2); env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Failing test** for `mapOffProduct(off): AddProductRequest | null` — maps name, brand, quantity, `nutriments.*_100g`; returns `null` unless the code starts with `484` and has a name; absent nutrients stay `null`.
- [ ] **Step 2: Implement** — `load-data` refuses to run if `checkData()` reports errors, then upserts categories and ingredients. `import-off` pages through the Open Food Facts search API for codes starting with 484, inserts new codes as `unverified` with `source = 'Open Food Facts'` and category `necunoscut` unless mapped, skips existing codes, and is safe to re-run.
- [ ] **Step 3: Run** — `pnpm data:load && pnpm data:off` against staging → counts printed; a second run inserts 0.
- [ ] **Step 4: Commit** — `feat(scripts): load checked data and import Moldovan products from Open Food Facts`

---

### Task D4: `identify` function

**Files:**
- Create: `supabase/functions/identify/index.ts`, `supabase/functions/identify/parseFront.ts`, `supabase/functions/identify/prompt.ts`, `supabase/functions/_lib/claude.ts`
- Test: `supabase/functions/identify/parseFront.test.ts`, `supabase/functions/identify/index.test.ts`

**Interfaces:**
- Consumes: `IdentifyRequest`, `IdentifyResponse`, `FrontRead` (C1); `normalizeCode` (D3); `_lib/http.ts`, `_lib/storage.ts`, `_lib/db.ts` (C3); SQL `search_products` (C2).
- Produces: `POST /functions/v1/identify` → `IdentifyResponse`; `askClaude(images: string[], prompt: string): Promise<string>` in `_lib/claude.ts` (D5 reuses it); `parseFront(raw: string): FrontRead`.

- [ ] **Step 1: Failing tests for `parseFront`** — JSON with brand/name/quantity → same values; `barcodeDigits: "4840001000014"` → `code: '4840001000014'`; digits failing the checksum → `code: null`; JSON inside ``` fences parses; non-JSON → throws `UpstreamError`.
- [ ] **Step 2: Implement `askClaude` and `parseFront`** — `POST https://api.anthropic.com/v1/messages`, headers `x-api-key: ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, body `model: "claude-haiku-5-5"`, `max_tokens: 800`, one user message with the image blocks (base64 JPEG) and the prompt. The front prompt asks for `{"brand","name","quantity","barcodeDigits"}` exactly as printed, empty string when not visible, nothing else.
- [ ] **Step 3: Failing handler tests** (mock `fetch`; local Supabase with seed) — body > 2 MB → 400 before any upload; 41st call in 24 h → 429; Claude reads a valid seeded code → `found` with that product; Claude reads "Zorel" + "Iaurt cu căpșuni" and no code → `candidates` with the strawberry yogurt first; unknown brand/name → `not_found` with `read` filled; Claude failure → 502 `upstream_failed`; every success includes `photoPath` under `uploads/<deviceId>/`.
- [ ] **Step 4: Implement the handler** — `readJsonBody` → rate limit (40) → `saveJpeg(front)` → `askClaude` → `parseFront` → code? `loadProduct({ code })` → found : `search_products(brand + ' ' + name)` → candidates or not_found → `logEvent('photo' | 'identified' | 'not_found')`.
- [ ] **Step 5: Grade on real photos** — 30 front photos of products already in the database (20 with barcode hidden): record found / right candidate / wrong in the PR. Target ≥ 80% right on the first screen.
- [ ] **Step 6: Commit** — `feat(functions): identify products from a photo with Claude and trigram search`

---

### Task D5: `read-label` function

- [x] **2026-11-10 review follow-up:** ignore marked reasoning drafts, reject ambiguous JSON/arrays, and keep unknown nutrition cells unreadable. Regression tests failed before the fix and pass in Deno; explicit absence markers, zero values and partial reads are preserved.

**Files:**
- Create: `supabase/functions/read-label/index.ts`, `supabase/functions/read-label/parseLabel.ts`, `supabase/functions/read-label/prompt.ts`
- Test: `supabase/functions/read-label/parseLabel.test.ts`, `supabase/functions/read-label/index.test.ts`

**Interfaces:**
- Consumes: `ReadLabelRequest`, `ReadLabelResponse` (C1); `askClaude` (D4); `_lib/*` (C3).
- Produces: `POST /functions/v1/read-label` → `ReadLabelResponse`; `parseLabel(raw: string): Omit<ReadLabelResponse, 'ingredientsPhotoPath' | 'nutritionPhotoPath'>`.

- [ ] **Step 1: Failing tests for `parseLabel`** — valid JSON → numbers; `"salt": "0,3"` → `0.3`; `"sugar": ""` → `null` and `'sugar'` in `unclear`; `"ingredientsText": ""` → `null` and `'ingredientsText'` in `unclear`; fenced JSON parses; non-JSON → `UpstreamError`.
- [ ] **Step 2: Implement `parseLabel`**, run → PASS.
- [ ] **Step 3: Failing handler tests** — > 2 MB → 400; 21st call → 429; `nutritionImage: null` sends one image and returns `nutritionPhotoPath: null`; success → both paths under `uploads/<deviceId>/`; AI failure after storing valid photos → 200 with blank, unclear fields and the private photo paths for manual entry.
- [ ] **Step 4: Implement** — prompt asks for Romanian ingredients text exactly as printed and nutrition per 100 g/ml as JSON keys `ingredientsText, unit, kcal, fat, sat, sugar, salt, protein, fiber, fruitVegPct`, empty string when unreadable. Run → PASS.
- [ ] **Step 5: Grade on 30 real label photo pairs** — per field: correct / wrong / null; target ≥ 90% correct or correctly null; table in the PR.
- [ ] **Step 6: Spend cap (human)** — monthly limit on the Anthropic key; `ANTHROPIC_API_KEY` set in both Supabase projects' function secrets.
- [ ] **Step 7: Commit** — `feat(functions): read ingredients and nutrition tables from label photos`
