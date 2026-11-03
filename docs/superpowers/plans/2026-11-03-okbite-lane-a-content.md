# OkBite Lane A (Content and Data) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-03-okbite-overall.md` and `docs/prototype/Main.dc.html` before Task A1. Many steps here are marked **(human)**: the agent drafts, the person checks against the source before committing.

**Goal:** Provide every word the app shows, the hand-checked data the score and explanations rely on, the legal pages, 300 real products, and the testers and launch posts.

**Architecture:** Copy lives in one typed object `apps/web/src/copy/ro.ts` that screens read by key. Reference data lives in JSON files under `data/`, validated by the contract's schemas and loaded into the database by Lane C's `pnpm data:load`. Legal and method pages are React components under `apps/web/src/features/legal/` that render Markdown-like JSX.

**Tech Stack:** TypeScript, Zod (via `@okbite/shared`), Vitest, Markdown, the official Nutri-Score calculator spreadsheet from Santé publique France.

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Lane-specific: every ingredient explanation, allergen synonym and score fixture must name a source that a human has opened; no invented facts, prices or statistics. Romanian with diacritics in all copy (ă, â, î, ș, ț — comma-below, not cedilla).

## Review Focus (owned here)

- Copy keys used by screens must exist: a missing key is a type error, never a blank on screen (A1).
- An ingredient entry without `checkedBy` must fail `pnpm data:check` (A2).

---

### Task A1: Romanian copy file (fully specified structure)

**Files:**
- Create: `apps/web/src/copy/ro.ts`
- Test: `apps/web/src/copy/ro.test.ts`

**Interfaces:**
- Produces: `export const ro = { … } as const;` and `export type Copy = typeof ro;`. Top-level sections exactly: `app, nav, home, scan, confirm, result, score, ingredients, compare, contribute, review, history, notFound, offline, errors, legal`. Plural helper `plural(n: number, one: string, many: string): string` (`1 produs`, `2 produse`, `20 de produse` — Romanian "de" when `n % 100` is 0 or ≥ 20, and n ≥ 20).
- Keys other lanes already reference by name (must exist with these names): `home.title`, `scan.manualInvalid`, `result.scoreUnavailable`, `result.teaspoons` (object with `underHalf`, `half`, `one`, `many: (n: string) => string`), `score.ringLabel: (score: number, grade: string) => string`, `score.disclaimer`, `compare.otherCategory`, `review.unclearField`.

- [ ] **Step 1: Failing tests**

```ts
import { ro, plural } from './ro';
it('has every section', () => {
  expect(Object.keys(ro)).toEqual(['app','nav','home','scan','confirm','result','score','ingredients','compare','contribute','review','history','notFound','offline','errors','legal']);
});
it('uses comma-below diacritics only', () => {
  expect(JSON.stringify(ro)).not.toMatch(/[şţŞŢ]/);
});
it.each([[1, '1 produs'], [2, '2 produse'], [19, '19 produse'], [20, '20 de produse'], [101, '101 produse']])(
  'plural %i', (n, s) => expect(plural(n, 'produs', 'produse')).toBe(s));
it('has the score disclaimer verbatim', () => {
  expect(ro.score.disclaimer).toBe('Calculat la 100 g; nu indică riscul unei boli.');
});
```
Run: `pnpm --filter web test copy` → Expected: FAIL.

- [ ] **Step 2: Fill `ro.ts`** — extract every visible string from `docs/prototype/Main.dc.html` into the sections above (one key per string, camelCase names describing the purpose, e.g. `home.scanButton`, `scan.manualInvalid`, `result.scoreUnavailable`, `score.ringLabel` as a function `(score: number, grade: string) => string`). Strings with numbers become functions. Fix any typo you find in the prototype and list it in the PR.
- [ ] **Step 3: Verify** — tests PASS; **(human)** read every string once in context of the prototype screen.
- [ ] **Step 4: Commit** — `feat(copy): Romanian copy for all screens`. Tell Lane B the keys are merged.

---

### Task A2: Categories and ingredient knowledge base

**Files:**
- Create: `data/categories.json`, `data/ingredients.json`, `scripts/check-data.ts` (shared with C: this file only validates, C's loader imports it)
- Modify: root `package.json` (`"data:check": "tsx scripts/check-data.ts"`)
- Test: `scripts/check-data.test.ts`

**Interfaces:**
- Consumes: `CategoryEntry`, `IngredientEntry` (C1).
- Produces: `data/categories.json` (array of `CategoryEntry`, slugs lower-case ASCII), `data/ingredients.json` (array of `IngredientEntry`), `checkData(): { errors: string[] }`.

- [ ] **Step 1: Failing test** — `checkData` reports: an ingredient without `checkedBy`; a duplicate slug; an allergen value not in `ALLERGENS`; a category with an unknown `scoreKind`.
- [ ] **Step 2: Categories** — about 15 shelf categories common in Moldovan shops (iaurt, lapte, brânză, unt și smântână, biscuiți, ciocolată și dulciuri, cereale, pâine, mezeluri, ulei, snacks sărate, suc, băuturi răcoritoare, apă, înghețată, conserve), each with the right `scoreKind` (`cheese` for brânză, `fat` for ulei/unt, `beverage` for sucuri/răcoritoare, `water` for apă, `red_meat` where applicable, else `general`).
- [ ] **Step 3: Ingredients** — 150 entries: the most common ingredients and E-numbers on Moldovan labels (start from the prototype's list, then the additives in the first 50 imported products). Agent drafts `name`, `group`, `role`, a plain one-to-two-sentence Romanian `explanation`, and `source` (EU additive regulation 1333/2008 and the EFSA or Moldovan food agency page for the additive). **(human)** open each source, correct the text, then fill `checkedBy` and `checkedAt`.
- [ ] **Step 4: Verify** — `pnpm data:check` → Expected: `0 errors`.
- [ ] **Step 5: Commit** — `feat(data): categories and 150 checked ingredient explanations`

---

### Task A3: Score test fixtures

**Files:**
- Create: `data/score-fixtures.json`

**Interfaces:**
- Produces: 30 entries of `ScoreFixture` (C1) used by C4's tests: at least 5 per letter A–E, at least 4 beverages, 3 cheeses, 3 fats/oils, 1 water.

- [ ] **Step 1 (human):** Pick 30 real products (photos from the shop runs are fine), copy their per-100 g values.
- [ ] **Step 2 (human):** Enter each into the official Nutri-Score 2023 calculator spreadsheet from Santé publique France; record `expectedPoints`, `expectedLetter` and `checkedWith: "SpF calculator <version>"`.
- [ ] **Step 3:** Agent validates the file with `ScoreFixture` (`pnpm data:check` covers it after adding it to `checkData`).
- [ ] **Step 4: Commit** — `test(data): 30 hand-checked Nutri-Score fixtures`. Tell Lane C.

---

### Task A4: Legal and method pages

**Files:**
- Create: `apps/web/src/features/legal/PrivacyPage.tsx`, `TermsPage.tsx`, `MethodPage.tsx`, `AboutPage.tsx`
- Test: `apps/web/src/features/legal/pages.test.tsx`

**Interfaces:**
- Consumes: UI kit (B1). Produces: the four page components; B registers them on `/confidentialitate`, `/termeni`, `/metoda`, `/despre`.

- [ ] **Step 1: Failing test** — each page renders an `h1` and a "Ultima actualizare" date; the privacy page mentions the Claude API and that photos are sent for reading; the method page contains the disclaimer from `ro.score.disclaimer`.
- [ ] **Step 2: Draft** — privacy (what is collected: device id, photos you send, usage counts; nothing else; Law 133/2011 on personal data protection; contact email `[TEAM EMAIL]`), terms (information only, not medical advice, check the pack if allergic), method (how the score is computed, band mapping from spec §4, limits), about the data (sources: producer labels, Open Food Facts with licence ODbL attribution, team checks).
- [ ] **Step 3 (human):** Read against the law and the spec; replace placeholders.
- [ ] **Step 4: Commit** — `feat(legal): privacy, terms, method and about pages`

---

### Task A5: Shop photo runs (human, all four people, 12–29 Nov)

- [ ] **Step 1:** Make a shared list of the 300 best-selling packaged products per category (split by person, 75 each), avoiding codes already imported from Open Food Facts.
- [ ] **Step 2:** First run (by 18 Nov): photograph front, ingredients and nutrition table; enter through the moderation tool if B7 is not merged yet.
- [ ] **Step 3:** Second run (19–29 Nov): add products through the app's own "Fotografiază eticheta" flow, so the flow gets real testing; note every problem as a GitHub issue labelled `beta`.
- [ ] **Step 4:** Checkpoint: `select count(*) from products where status = 'approved'` ≥ 300 on production.

---

### Task A6: Beta testers and feedback triage (human, 23 Nov – 6 Dec)

- [ ] **Step 1:** Recruit 25 testers (classmates, families, one allergy community); send the preview link and a 5-question feedback form.
- [ ] **Step 2:** Daily: turn feedback into GitHub issues with severity P1 (wrong allergen, crash, data loss), P2, P3; assign to the owning lane.
- [ ] **Step 3:** Checkpoint 6 Dec: zero open P1 issues.

---

### Task A7: Launch posts (by 8 Dec)

- [ ] **Step 1:** 30-second screen recording of scan → result → ingredients on a real phone.
- [ ] **Step 2:** Posts for student groups and local Facebook/Telegram groups, in Romanian, linking `okbite.md`; no health claims.
- [ ] **Step 3:** Publish on 8 Dec after Lane D confirms production is live.
