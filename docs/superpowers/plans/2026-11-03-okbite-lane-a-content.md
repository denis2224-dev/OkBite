# OkBite Lane A (Content, Data, Store Listing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-03-okbite-overall.md` and `docs/prototype/Main.dc.html` before Task A1. Steps marked **(human)** are done or checked by the person, not the agent.

**Goal:** Provide every word the app shows, the hand-checked data the score and explanations rely on, the legal screens and hosted privacy policy, the App Store and Google Play listings, 300 real products, the beta testers, and the launch posts.

**Architecture:** Copy lives in one typed object `apps/mobile/src/copy/ro.ts` that screens read by key. Reference data lives in JSON under `data/`, validated by the contract's schemas and loaded into the database by Lane C's `pnpm data:load`. Legal screens are Expo Router routes under `apps/mobile/app/(info)/`. Store listing material lives in `store/` (texts, screenshots, icon source, privacy answers), and the privacy policy is also published as a static page for the stores' required URL.

**Tech Stack:** TypeScript, Zod (via `@okbite/shared`), jest-expo, Markdown, GitHub Pages, the official Nutri-Score calculator spreadsheet from Santé publique France.

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Lane-specific: every ingredient explanation, allergen synonym and score fixture must name a source that a human has opened; no invented facts, prices or statistics. Romanian with comma-below diacritics (ș, ț), never cedilla (ş, ţ). Store texts must not make health claims.

## Review Focus (owned here)

- Keys other lanes use must exist with exactly these names; a missing key is a type error, never a blank on screen (A1).
- An ingredient entry without `checkedBy` fails `pnpm data:check` (A2).

---

### Task A1: Romanian copy file (fully specified structure)

**Files:**
- Create: `apps/mobile/src/copy/ro.ts`
- Test: `apps/mobile/src/copy/ro.test.ts`

**Interfaces:**
- Produces: `export const ro = { … } as const;`, `export type Copy = typeof ro;`, and `plural(n: number, one: string, many: string): string` ("1 produs", "2 produse", "20 de produse" — "de" when `n % 100` is 0 or ≥ 20 and `n ≥ 20`).
- Top-level sections, exactly: `app, nav, home, capture, identify, scan, result, score, ingredients, compare, add, review, history, offline, errors, share, legal`.
- Keys other lanes already reference (must exist with these names): `home.title`, `home.photoButton`, `home.scanLink`, `capture.working`, `scan.manualInvalid`, `result.scoreUnavailable`, `result.unverifiedNote`, `result.teaspoons` (object with `underHalf`, `half`, `one`, `many: (n: string) => string`), `score.ringLabel: (score: number, grade: string) => string`, `score.disclaimer`, `ingredients.explanationSoon`, `compare.otherCategory`, `review.unclearField`, `scan.webManualOnly` (browser without barcode reading: "În acest browser introdu codul de mână sau fotografiază produsul.").

- [ ] **Step 1: Failing tests**

```ts
import { ro, plural } from './ro';
it('has every section in order', () => {
  expect(Object.keys(ro)).toEqual(['app','nav','home','capture','identify','scan','result','score','ingredients','compare','add','review','history','offline','errors','share','legal']);
});
it('uses comma-below diacritics only', () => { expect(JSON.stringify(ro)).not.toMatch(/[şţŞŢ]/); });
it.each([[1, '1 produs'], [2, '2 produse'], [19, '19 produse'], [20, '20 de produse'], [101, '101 produse'], [120, '120 de produse']])(
  'plural %i', (n, s) => expect(plural(n, 'produs', 'produse')).toBe(s));
it('has the score disclaimer verbatim', () => {
  expect(ro.score.disclaimer).toBe('Calculat la 100 g; nu indică riscul unei boli.');
});
```
Run: `pnpm --filter mobile test src/copy` → Expected: FAIL.

- [ ] **Step 2: Fill `ro.ts`** — every visible string from `docs/prototype/Main.dc.html`, plus the new photo-first strings: home "Fotografiază produsul", capture working state ("Caut produsul…"), identify ("Este acesta?", "Alege produsul", "Nu e niciunul"), add ("Fotografiază lista de ingrediente", "Acum tabelul nutrițional", "Sunt pe aceeași poză"), the "Neverificat" badge and its note ("Adăugat de un utilizator. Echipa îl verifică în curând."). One key per string, camelCase names describing purpose; strings with numbers are functions.
- [ ] **Step 3: Verify** — tests PASS; **(human)** read every string in the context of its screen.
- [ ] **Step 4: Commit** — `feat(copy): Romanian copy for all screens`. Tell Lane B the keys are merged.

---

### Task A2: Categories and ingredient knowledge base

**Files:**
- Create: `data/categories.json`, `data/ingredients.json`, `scripts/check-data.ts`
- Modify: root `package.json` (`"data:check": "tsx scripts/check-data.ts"`)
- Test: `scripts/check-data.test.ts`

**Interfaces:**
- Consumes: `CategoryEntry`, `IngredientEntry`, `ScoreFixture`, `ALLERGENS` (C1).
- Produces: the two JSON files and `checkData(): { errors: string[] }` (Lane C's loader imports it).

- [ ] **Step 1: Failing test** — `checkData` reports: an ingredient without `checkedBy`; a duplicate slug or alias; an allergen not in `ALLERGENS`; a category with an unknown `scoreKind`; an invalid entry in `data/score-fixtures.json` (when the file exists).
- [ ] **Step 2: Categories** — about 16 shelf categories in Moldovan shops (iaurt, lapte, brânză, unt și smântână, biscuiți, ciocolată și dulciuri, cereale, pâine, mezeluri, ulei, snacks sărate, suc, băuturi răcoritoare, apă, înghețată, conserve) plus `necunoscut`, each with the right `scoreKind` (`cheese` for brânză, `fat` for ulei and unt, `beverage` for sucuri and răcoritoare, `water` for apă, `red_meat` where it applies, else `general`).
- [ ] **Step 3: Ingredients** — 150 entries for the most common ingredients and E-numbers on Moldovan labels, each with `aliases` as they appear on labels (e.g. "E322", "lecitină din soia", "emulsifiant: lecitine"). The agent drafts `role`, a plain one-to-two-sentence Romanian `explanation`, and `source` (Reg. (UE) nr. 1333/2008 for additives, the EFSA page for the additive, or the Moldovan food safety agency). **(human)** open each source, correct the text, fill `checkedBy` and `checkedAt`.
- [ ] **Step 4: Verify** — `pnpm data:check` → Expected: `0 errors`.
- [ ] **Step 5: Commit** — `feat(data): categories and 150 checked ingredient explanations`

---

### Task A3: Score test fixtures

**Files:**
- Create: `data/score-fixtures.json`

**Interfaces:**
- Produces: 30 `ScoreFixture` entries for C4's tests: at least 5 per letter A–E, at least 4 beverages, 3 cheeses, 3 fats/oils, 1 water.

- [ ] **Step 1 (human):** Pick 30 real products and copy their per-100 g values.
- [ ] **Step 2 (human):** Enter each into the official Nutri-Score 2023 calculator spreadsheet from Santé publique France; record `expectedPoints`, `expectedLetter` and `checkedWith: "SpF calculator <version>"`.
- [ ] **Step 3:** `pnpm data:check` → 0 errors.
- [ ] **Step 4: Commit** — `test(data): 30 hand-checked Nutri-Score fixtures`. Tell Lane C.

---

### Task A4: Legal and method screens, hosted privacy policy

**Files:**
- Create: `apps/mobile/app/(info)/about.tsx`, `privacy.tsx`, `terms.tsx`, `method.tsx`, `apps/mobile/src/features/legal/texts.ts`
- Test: `apps/mobile/src/features/legal/legal.test.tsx`

**Interfaces:**
- Consumes: UI kit (B1). Produces: routes `/about`, `/privacy`, `/terms`, `/method`; because the app also runs on the web, `https://okbite.md/privacy` is the public privacy policy URL for the store listings (A5).

- [ ] **Step 1: Failing test** — each screen renders a header and "Ultima actualizare"; privacy states that photos are sent to the Claude API for reading and stored with the product record, that a random device id is used, and that no account, name or location is collected; method contains `ro.score.disclaimer`; about lists data sources (producer labels, Open Food Facts with ODbL attribution, shopper photos, team checks).
- [ ] **Step 2: Draft** the texts in `texts.ts` (one source for app and web); mention Moldova's Law 133/2011 on personal data protection and the contact email `[TEAM EMAIL]`; terms: information only, not medical advice, check the pack if allergic, shopper-added products are unverified until checked.
- [ ] **Step 3 (human):** Read against the law and the spec; replace placeholders; open `/privacy` on the web preview to confirm it loads without the app.
- [ ] **Step 4: Commit** — `feat(legal): privacy, terms, method and about screens`

---

### Task A5: Store listing material

**Files:**
- Create: `store/listing.ro.md`, `store/privacy-answers.md`, `store/icon/icon.svg`, `store/screenshots/` (iPhone 6.7" and Android phone), `store/review-notes.md`

- [ ] **Step 1:** `listing.ro.md` — app name "OkBite", subtitle (≤ 30 characters), short description (≤ 80, Google Play), full description (≤ 4000), keywords (≤ 100, App Store), category Food & Drink, support email, privacy policy URL from A4. No health claims, no comparison with named competitors.
- [ ] **Step 2:** `privacy-answers.md` — answers for Apple's App Privacy labels and Google Play's Data safety form: photos (collected, not linked to identity, used for app functionality), device id (app functionality, not tracking), no location, no contacts, data encrypted in transit, deletion contact.
- [ ] **Step 3:** Icon (1024×1024 source) and splash with the brand green; hand the files to Lane D for `app.config.ts`.
- [ ] **Step 4 (human):** Six screenshots per platform from the beta build: home, photo, result, ingredients, add flow, compare; Romanian captions on each.
- [ ] **Step 5:** `review-notes.md` — notes for Apple review: what the app does, that no login is needed, test barcodes `4840001000014` and `4840001000021`, and that the admin area is staff-only.
- [ ] **Step 6: Commit** — `docs(store): listing texts, privacy answers, icon and screenshots`

---

### Task A6: Shop photo runs (human, all four people, 12–29 Nov)

- [ ] **Step 1:** Shared list of the 300 best-selling packaged products across the categories, 75 per person, skipping codes already imported from Open Food Facts.
- [ ] **Step 2:** First run (by 18 Nov): photograph front, ingredients and nutrition table of each product; enter them through the admin screens if B7 is not merged yet.
- [ ] **Step 3:** Second run (19–29 Nov): add products only through the app's own photo flow, so it gets real testing; file every problem as a GitHub issue labelled `beta`.
- [ ] **Step 4:** Lane C verifies the added products daily. Checkpoint: `select count(*) from products where status = 'verified'` ≥ 300 on production.

---

### Task A7: Beta testers and feedback triage (human, 24 Nov – 6 Dec)

- [ ] **Step 1:** Recruit 25 testers with iPhones and Android phones (classmates, families, one allergy community); add them to TestFlight and the Play internal testing track (D8 step 1); send a 5-question feedback form.
- [ ] **Step 2:** Daily: turn feedback into GitHub issues with severity P1 (wrong allergen, crash, data loss), P2, P3, assigned to the owning lane.
- [ ] **Step 3:** Checkpoint 6 Dec: zero open P1 issues.

---

### Task A8: Launch posts (8 Dec)

- [ ] **Step 1:** 30-second screen recording: photo of a product → result → ingredients; and photo of an unknown product → added.
- [ ] **Step 2:** Romanian posts for student groups and local Facebook / Telegram groups with the App Store and Google Play links and `okbite.md` for use in the browser; no health claims.
- [ ] **Step 3:** Publish once Lane D confirms both stores show the app.
