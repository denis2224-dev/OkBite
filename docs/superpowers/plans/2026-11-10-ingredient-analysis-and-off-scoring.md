# Coca-Cola Zero / Open Food Facts Scoring & Ingredient Risk Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure products imported from Open Food Facts (like Coca-Cola Zero) and user-scanned products are scored under their true beverage/food category (applying the Nutri-Score 2023 non-nutritive sweetener penalty for beverages), match all ingredients and additives (including parenthesized E-codes and functional prefixes like `îndulcitori: ...` or `colorant: ...`) against a populated, source-backed ingredient knowledge base, and surface ingredient/additive roles and risk explanations directly on the product result screen.

**Architecture:**
1. **Populate Knowledge Base (`data/ingredients.json`):** Add verified Romanian entries with official regulatory/scientific sources (Reg. (UE) nr. 1333/2008, Reg. (CE) nr. 1334/2008, EFSA, WHO) for non-nutritive sweeteners (`aspartam-e951`, `acesulfam-k-e950`, `ciclamat-de-sodiu-e952`, `sucraloza-e955`, `zaharina-e954`, `glicozide-steviolice-e960a`), beverage additives (`colorant-caramel-e150d`, `acid-fosforic-e338`, `acid-citric-e330`, `citrati-de-sodiu-e331`, `benzoat-de-sodiu-e211`, `sorbat-de-potasiu-e202`, `dioxid-de-carbon-e290`, `cafeina`, `apa-carbogazoasa`), and common food ingredients/additives.
2. **Shared Ingredient Parser & DB Fallback (`packages/shared/src/ingredients/match.ts` & `supabase/functions/_lib/db.ts`):** Upgrade `matchIngredients` to parse functional prefixes (`colorant:`, `îndulcitori:`, `acidifiant:`, `corector de aciditate:`, etc.), parenthesized E-codes (`caramel cu sulfit de amoniu (E150d)`), and parenthesized additive lists (`îndulcitori (ciclamați, acesulfam K și aspartam)`), while keeping compound food ingredients (`preparat de căpșuni 12% (...)`) intact. In `loadProduct` (`db.ts`), when `product_ingredients` has no rows (as for existing OFF products) and `ingredients_text` is present, dynamically match `ingredients_text` against `public.ingredients` so `product.ingredients` is always populated.
3. **Open Food Facts Category Mapping & Ingredient Linking (`scripts/import-off.ts`):** Map OFF `categories_tags` and product cues to OkBite categories (`bauturi-racoritoare`, `suc`, `apa`, `lapte`, `iaurt`, `branza`, `mezeluri`, `biscuiti`, `ulei`, etc.) instead of hardcoding `'necunoscut'`, and populate `public.product_ingredients` on import. Under `bauturi-racoritoare` (`scoreKind: 'beverage'`), Coca-Cola Zero receives the `+4` non-nutritive sweetener penalty -> **53/100 (Letter C, Medium)** with negative reason `"Conține îndulcitori"`, instead of **80/100 (Letter A, Good)** under `'general'`.
4. **Inline Ingredient & Additive Highlights on `ResultView.tsx`:** Render matched ingredients and highlighted additives (`group === 'add'` and sweeteners, with their role and explanation) directly inside the Ingredients card on `ResultView.tsx`, above the `"Înțelege ingredientele"` button.

**Tech Stack:** TypeScript, Vitest (`packages/shared`, `scripts`), Jest + React Native Testing Library (`apps/mobile`), Deno (`supabase/functions`), Supabase Postgres.

---

## Root-Cause Summary

1. **Why Coca-Cola Zero scored `80/100` instead of `53/100`:**
   - `scripts/import-off.ts:111` hardcodes `categorySlug: 'necunoscut'` for every Open Food Facts product.
   - `data/categories.json:88-91` sets `'necunoscut'` to `scoreKind: 'general'`.
   - In `packages/shared/src/score/nutriscore.ts:69-83`, non-nutritive sweeteners (`aspartam`, `acesulfam K`, `ciclamat`) add `+4` unfavourable points **only when `kind === 'beverage'`**. Under `'general'`, 0 kcal / 0 g sugar / 0 g sat / 0 g salt yields `0` points -> Letter `A` -> `toHundred(0, 'A', 'general') = 80/100` (`grade: 'good'`).
   - When categorized as `'bauturi-racoritoare'` (`scoreKind: 'beverage'`), beverages cannot get `'A'` (water only) and NNS adds `+4` points -> Letter `'C'` -> **`53/100` (`grade: 'medium'`)** with reason `{ tone: 'bad', title: 'Conține îndulcitori', detail: 'Îndulcitori fără calorii în ingrediente' }`.
   - Additionally, after `U2a` (`supabase/functions/_lib/db.ts:75`), any product left with `category_slug = 'necunoscut'` has its score withheld (`score: null, grade: 'unavailable'`). Mapping OFF categories fixes both!
2. **Why ingredients were not analyzed (`product.ingredients = []`):**
   - `scripts/import-off.ts:372-376` only upserts `public.products` and never inserts into `public.product_ingredients`.
   - `supabase/functions/_lib/db.ts:23-64` builds `product.ingredients` exclusively from `public.product_ingredients` with no fallback to `row.ingredients_text`.
   - `data/ingredients.json` is currently `[]` (empty array).
   - `supabase/functions/add-product/matchIngredients.ts:30` does `part.split('(')[0]`, which strips parenthesized E-codes like `(E150d)` and parenthesized sweetener lists like `îndulcitori (ciclamat de sodiu, acesulfam K, aspartam)`, and does not split functional class prefixes (`colorant:`, `îndulcitori:`, `acidifiant:`) or `" și "` additive lists.
3. **Why `ResultView.tsx` didn't show ingredient risks immediately:**
   - `apps/mobile/src/features/product/ResultView.tsx:161-169` only displays the raw `product.ingredientsText` string and a button to navigate to `/product/[id]/ingredients`, without showing matched additives/sweeteners and their risk/role explanations on the main result screen.

---

## File Structure

- **Modify:** `data/ingredients.json` — Populate verified Romanian ingredient & additive entries with official regulatory/scientific URLs (`https://eur-lex.europa.eu/...`, EFSA, WHO).
- **Modify:** `supabase/functions/add-product/matchIngredients.ts` — Support functional prefixes (`colorant:`, `îndulcitori:`, etc.), parenthesized E-codes (`(E150d)`), parenthesized additive lists (`îndulcitori (ciclamat, acesulfam K, aspartam)`), and `" și "` conjunctions in additive lists while preserving compound food ingredient behaviour.
- **Modify:** `supabase/functions/add-product/matchIngredients.test.ts` — Add TDD tests for Coca-Cola Zero and soda/food label strings while keeping all existing tests green.
- **Modify:** `supabase/functions/_lib/db.ts` — When `product_ingredients` is empty for a product and `row.ingredients_text` is non-empty, fall back to matching `row.ingredients_text` against `public.ingredients` so `product.ingredients` is populated on lookup/identify.
- **Modify:** `scripts/import-off.ts` & `scripts/import-off.test.ts` — Infer OkBite `categorySlug` from OFF `categories_tags` + product name/unit (`bauturi-racoritoare`, `suc`, `apa`, `lapte`, `iaurt`, `branza`, `mezeluri`, `biscuiti`, `ulei`, etc., defaulting to `'necunoscut'` only when no category matches) and populate `product_ingredients` during `importOff`.
- **Modify:** `apps/mobile/src/copy/ro.ts` — Add concise Romanian copy keys under `ro.result` for inline additive/ingredient highlights on the product result screen.
- **Modify:** `apps/mobile/src/features/product/ResultView.tsx` & `apps/mobile/src/features/product/ResultView.test.tsx` — Render matched ingredient/additive badges and explanations inline inside the Ingredients section on `ResultView`.

---

### Task 1: Populate `data/ingredients.json` with Sourced Beverage & Food Ingredients/Additives

**Files:**
- Modify: `data/ingredients.json`
- Test: `scripts/check-data.test.ts` & `pnpm data:check`

- [ ] **Step 1: Verify what `scripts/check-data.ts` requires for every entry in `data/ingredients.json`**

`scripts/check-data.ts` validates each item against `IngredientEntrySchema` (`packages/shared/src/contract.ts:62-71`):
- `slug`: non-empty string (`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- `name`: non-empty Romanian display name
- `aliases`: array of strings (synonyms, E-codes like `"E951"`, `"aspartam"`, etc.)
- `group`: `'base' | 'fat' | 'taste' | 'add' | 'cult'`
- `role`: non-empty short role label (e.g. `'Îndulcitor intens (E951)'`, `'Colorant (E150d)'`, `'Acidifiant (E338)'`)
- `explanation`: plain-Romanian explanation of what it is and what to watch out for (e.g., phenylalanine warning for aspartame, dental/acidity note for phosphoric acid, non-nutritive sweetener note)
- `source`: non-empty citation containing at least one `https://` URL (`URL_PATTERN = /https?:\/\/\S+/`)
- `allergen`: optional `Allergen` (`'Lapte' | 'Gluten' | 'Soia' | 'Dioxid de sulf și sulfiți'`, etc.)

- [ ] **Step 2: Write `data/ingredients.json` with beverage sweeteners, soda additives, and core food ingredients**

Populate `data/ingredients.json` with:
1. `apa-carbogazoasa` (`Apă carbogazoasă`, aliases `["apa", "apa minerala", "apa carbogazoasa", "apa carbonatata"]`, group `'base'`)
2. `dioxid-de-carbon-e290` (`Dioxid de carbon (E290)`, aliases `["dioxid de carbon", "e290", "e 290"]`, group `'add'`)
3. `colorant-caramel-e150d` (`Caramel cu sulfit de amoniu (E150d)`, aliases `["caramel cu sulfit de amoniu", "caramel sulfit de amoniu", "caramel", "e150d", "e 150d", "e150a", "e150b", "e150c", "colorant caramel"]`, group `'add'`)
4. `acid-fosforic-e338` (`Acid fosforic (E338)`, aliases `["acid fosforic", "e338", "e 338"]`, group `'add'`)
5. `acid-citric-e330` (`Acid citric (E330)`, aliases `["acid citric", "e330", "e 330"]`, group `'add'`)
6. `citrati-de-sodiu-e331` (`Citrați de sodiu (E331)`, aliases `["citrati de sodiu", "citrat de sodiu", "citrat trisodic", "e331", "e 331"]`, group `'add'`)
7. `aspartam-e951` (`Aspartam (E951)`, aliases `["aspartam", "e951", "e 951"]`, group `'add'`, explanation noting intense low-calorie sweetener, source of phenylalanine, and `+4` beverage Nutri-Score penalty, citing EFSA & Reg. (UE) 1333/2008)
8. `acesulfam-k-e950` (`Acesulfam K (E950)`, aliases `["acesulfam k", "acesulfam de potasiu", "acesulfam-k", "e950", "e 950"]`, group `'add'`)
9. `ciclamat-de-sodiu-e952` (`Ciclamați (E952)`, aliases `["ciclamati", "ciclamat de sodiu", "acid ciclamic", "ciclamat", "e952", "e 952"]`, group `'add'`)
10. `sucraloza-e955` (`Sucraloză (E955)`, aliases `["sucraloza", "e955", "e 955"]`, group `'add'`)
11. `zaharina-e954` (`Zaharină (E954)`, aliases `["zaharina", "zaharina de sodiu", "e954", "e 954"]`, group `'add'`)
12. `glicozide-steviolice-e960a` (`Glicozide steviolice din stevia (E960a)`, aliases `["glicozide steviolice", "glicozide derivate din steviol", "stevia", "e960", "e960a", "e 960a"]`, group `'add'`)
13. `cafeina` (`Cafeină`, aliases `["cafeina", "cofeina", "aroma cafeina"]`, group `'taste'`)
14. `benzoat-de-sodiu-e211` (`Benzoat de sodiu (E211)`, aliases `["benzoat de sodiu", "e211", "e 211"]`, group `'add'`)
15. `sorbat-de-potasiu-e202` (`Sorbat de potasiu (E202)`, aliases `["sorbat de potasiu", "e202", "e 202"]`, group `'add'`)
16. `aroma-naturala` (`Arome naturale`, aliases `["aroma naturala", "arome naturale", "arome", "aroma"]`, group `'taste'`)
17. `zahar` (`Zahăr`, aliases `["zahar", "sirop de glucoza-fructoza", "sirop de fructoza-glucoza"]`, group `'taste'`)
18. `sare` (`Sare`, aliases `["sare", "sare iodata", "clorura de sodiu"]`, group `'taste'`)
19. Plus the core food ingredients (`lapte-normalizat`, `lapte-integral`, `smantana`, `culturi-lactice-vii`, `amidon-modificat`, `pectina-e440`, `carmin-e120`, `faina-de-grau`, `ulei-de-palmier`, `ulei-de-floarea-soarelui`, `lecitina-din-soia-e322`, `bicarbonat-de-sodiu-e500`, `acid-ascorbic-e300`, `suc-de-mere-din-concentrat`).

- [ ] **Step 3: Run `pnpm data:check` and `pnpm test:scripts`**

Run: `pnpm data:check` and `pnpm test:scripts`
Expected: `Checked 16 categories and <N> ingredients.` with exit code 0.

---

### Task 2: Upgrade `matchIngredients` & Add Dynamic Fallback in `supabase/functions/_lib/db.ts`

**Files:**
- Modify: `supabase/functions/add-product/matchIngredients.ts`
- Modify: `supabase/functions/add-product/matchIngredients.test.ts`
- Modify: `supabase/functions/_lib/db.ts`

- [ ] **Step 1: Write failing tests in `supabase/functions/add-product/matchIngredients.test.ts`**

Add tests covering real Romanian & OFF Coca-Cola Zero ingredient strings:
```ts
Deno.test('matches Coca-Cola Zero functional prefixes, parenthesized E-codes, and sweetener lists', () => {
  const sodaKb = [
    { slug: 'apa-carbogazoasa', name: 'Apă carbogazoasă', aliases: ['apa', 'apa carbonatata'] },
    { slug: 'dioxid-de-carbon-e290', name: 'Dioxid de carbon (E290)', aliases: ['dioxid de carbon', 'e290'] },
    { slug: 'colorant-caramel-e150d', name: 'Caramel cu sulfit de amoniu (E150d)', aliases: ['caramel cu sulfit de amoniu', 'e150d'] },
    { slug: 'acid-fosforic-e338', name: 'Acid fosforic (E338)', aliases: ['acid fosforic', 'e338'] },
    { slug: 'citrati-de-sodiu-e331', name: 'Citrați de sodiu (E331)', aliases: ['citrati de sodiu', 'citrat trisodic', 'e331'] },
    { slug: 'aspartam-e951', name: 'Aspartam (E951)', aliases: ['aspartam', 'e951'] },
    { slug: 'acesulfam-k-e950', name: 'Acesulfam K (E950)', aliases: ['acesulfam k', 'e950'] },
    { slug: 'ciclamat-de-sodiu-e952', name: 'Ciclamați (E952)', aliases: ['ciclamati', 'ciclamat de sodiu', 'e952'] },
    { slug: 'aroma-naturala', name: 'Arome naturale', aliases: ['arome naturale', 'aroma naturala'] },
    { slug: 'cafeina', name: 'Cafeină', aliases: ['cafeina', 'aroma cafeina'] },
  ];
  const label =
    'Apă, dioxid de carbon, colorant: caramel cu sulfit de amoniu (E150d), acidifiant: acid fosforic (E338), îndulcitori (ciclamați, acesulfam K și aspartam), corector de aciditate: citrați de sodiu, arome naturale, aromă cafeină.';
  assertEquals(matchIngredients(label, sodaKb), [
    { rawName: 'Apă', slug: 'apa-carbogazoasa' },
    { rawName: 'dioxid de carbon', slug: 'dioxid-de-carbon-e290' },
    { rawName: 'colorant: caramel cu sulfit de amoniu (E150d)', slug: 'colorant-caramel-e150d' },
    { rawName: 'acidifiant: acid fosforic (E338)', slug: 'acid-fosforic-e338' },
    { rawName: 'ciclamați', slug: 'ciclamat-de-sodiu-e952' },
    { rawName: 'acesulfam K', slug: 'acesulfam-k-e950' },
    { rawName: 'aspartam', slug: 'aspartam-e951' },
    { rawName: 'corector de aciditate: citrați de sodiu', slug: 'citrati-de-sodiu-e331' },
    { rawName: 'arome naturale', slug: 'aroma-naturala' },
    { rawName: 'aromă cafeină', slug: 'cafeina' },
  ]);
});
```
Ensure all 3 existing `Deno.test` cases in `matchIngredients.test.ts` remain untouched and pass.

- [ ] **Step 2: Implement enhanced matching in `supabase/functions/add-product/matchIngredients.ts`**

Update `matchIngredients.ts` to:
1. Strip leading `"Ingrediente:"` header and trailing `"Conține o sursă de fenilalanină..."` / `"Poate conține..."` clauses after `.` if present.
2. When a top-level part is a functional class with parenthesized additive list (e.g., `îndulcitori (ciclamați, acesulfam K și aspartam)` or `îndulcitori: ciclamați, acesulfam K și aspartam`), expand the list items on `,` and ` și ` when the prefix is a functional class (`indulcitor\w*`, `colorant\w*`, `acidifiant\w*`, `conservant\w*`, `corector\w* de aciditate`, `antioxidant\w*`, `stabilizator\w*`, `emulsifiant\w*`, `agent\w* de \w+`).
3. For single items:
   - Keep `part.split('(')[0]` as the default `rawName` for compound food ingredients (`preparat de căpșuni 12% (căpșuni, zahăr, pectină)` -> `rawName: 'preparat de căpșuni 12%'`, `zahăr (sfeclă (origine), apă)` -> `rawName: 'zahăr'`).
   - If the part has a functional prefix (`colorant: ...`, `acidifiant: ...`) or a parenthesized E-code `(E150d)` / `(E338)` that matches the KB, resolve `slug` by checking:
     a. `normalized(beforeParen)`
     b. `normalized(afterColonBeforeParen)`
     c. `normalized(parenContent)` (e.g. `e150d`, `e338`)
   - Preserve the full `rawName` (with `(E150d)` when the parenthesized token is an E-code, or `beforeParen` for compound ingredients so existing tests pass 100%).

- [ ] **Step 3: Add fallback ingredient matching in `supabase/functions/_lib/db.ts`**

In `supabase/functions/_lib/db.ts`, inside `loadProduct`:
- Currently lines 23-32 query `product_ingredients` for `product_id = id`.
- If `(links.data ?? []).length === 0` and `row.ingredients_text?.trim()`, query `public.ingredients` (`slug, name, aliases, grp, role, explanation, source, allergen`) and run `matchIngredients(row.ingredients_text, kb)` so that Open Food Facts products (or any product missing `product_ingredients` rows) still return full `product.ingredients` with matched `group`, `role`, `explanation`, and `source`!

---

### Task 3: Map Open Food Facts Categories & Populate `product_ingredients` in `scripts/import-off.ts`

**Files:**
- Modify: `scripts/import-off.ts`
- Modify: `scripts/import-off.test.ts`

- [ ] **Step 1: Write failing unit tests in `scripts/import-off.test.ts`**

Add tests to `scripts/import-off.test.ts` verifying that:
1. A carbonated soft drink / cola (`categories_tags: ['en:beverages', 'en:carbonated-drinks', 'en:sodas', 'en:colas']`, or name `'Coca-Cola Zero'`) maps to `categorySlug: 'bauturi-racoritoare'`.
2. Water (`'en:waters'`, `'en:spring-waters'`, `'en:mineral-waters'`) maps to `'apa'`.
3. Fruit juice (`'en:juices-and-nectars'`, `'en:fruit-juices'`) maps to `'suc'`.
4. Dairy/yogurt/cheese/milk/meats/biscuits/oils/sauces/cereals/sweets/salty-snacks/canned/bread map to their respective slugs in `data/categories.json`, falling back to `'necunoscut'` only when `categories_tags` is absent or unrecognized.
5. Verify that `computeScore` on the mapped Coca-Cola Zero product with `scoreKind: 'beverage'` produces `score: 53`, `letter: 'C'`, `grade: 'medium'`, and reason `'Conține îndulcitori'`.

- [ ] **Step 2: Implement `inferCategorySlug` and `product_ingredients` linking in `scripts/import-off.ts`**

In `scripts/import-off.ts`:
1. Add `categories_tags?: unknown` to `OffProduct`.
2. Implement `inferCategorySlug(raw: OffProduct, name: string, unit: 'g' | 'ml'): string` mapping OFF category tags and clear product keywords to the 15 real slugs in `data/categories.json` (`'apa'`, `'bauturi-racoritoare'`, `'suc'`, `'iaurt'`, `'lapte'`, `'branza'`, `'mezeluri'`, `'ulei'`, `'biscuiti'`, `'dulciuri'`, `'gustari-sarate'`, `'cereale'`, `'paine'`, `'sosuri'`, `'conserve'`), defaulting to `'necunoscut'` when none match.
3. In `importOff`, also load `data/ingredients.json` (or query `public.ingredients`) and upsert matched `public.product_ingredients` rows for imported products that have `ingredients_text`.

- [ ] **Step 3: Run `pnpm test:scripts`**

Run: `pnpm test:scripts`
Expected: All tests in `scripts/import-off.test.ts` and `scripts/check-data.test.ts` pass.

---

### Task 4: Surface Ingredient & Additive Risks Directly on `ResultView.tsx`

**Files:**
- Modify: `apps/mobile/src/copy/ro.ts`
- Modify: `apps/mobile/src/features/product/ResultView.tsx`
- Modify: `apps/mobile/src/features/product/ResultView.test.tsx`

- [ ] **Step 1: Write failing test in `apps/mobile/src/features/product/ResultView.test.tsx`**

Add a test verifying that when `product.ingredients` contains matched additives/ingredients with explanations (such as `Aspartam (E951)` or `Carmin (E120)` with `group: 'add'`), `ResultView` renders their name, role, and risk/explanation directly in the Ingredients section on the result screen without requiring an extra tap, while keeping the `"Înțelege ingredientele"` button working.

- [ ] **Step 2: Add Romanian copy keys in `apps/mobile/src/copy/ro.ts` and render inline additive/ingredient cards in `ResultView.tsx`**

In `apps/mobile/src/features/product/ResultView.tsx`:
- Inside the `ro.result.ingredients` `Section` (around line 161):
  - When `product.ingredients.length > 0`, show highlighted cards for matched additives (`group === 'add'`) first (with `theme.badBg` / `theme.warnBg` badge showing `item.role` and `item.explanation`), plus a compact summary of the remaining matched ingredients, followed by the raw `ingredientsText` and the `"Înțelege ingredientele"` button for full source details.

- [ ] **Step 3: Run `ResultView.test.tsx`**

Run: `pnpm test:app -- apps/mobile/src/features/product/ResultView.test.tsx`
Expected: PASS.

---

### Task 5: Sync Shared Code, Update Seed Data & Full Verification

**Files:**
- Modify: `supabase/seed.sql` (sync new beverage/soda ingredient KB entries so local/staging DB has them out of the box)
- Run: `pnpm sync-shared`, `pnpm data:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`

- [ ] **Step 1: Sync shared code and run all verification gates**

Run:
1. `pnpm sync-shared`
2. `pnpm data:check`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test:shared`
6. `pnpm test:scripts`
7. `pnpm test:app`
8. Deno tests for `matchIngredients.test.ts`

Expected: All suites green with 0 errors.

