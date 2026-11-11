# data/

Checked content and drafts are kept separately. `pnpm data:check` validates development data and may pass with an empty checked knowledge base. `pnpm data:load` refuses invalid data; it does not imply release readiness.

- `categories.json`: shelf categories and their Nutri-Score kind.
- `ingredients.json`: **checked** ingredient explanations only. Every entry needs `checkedBy` and `checkedAt`.
- `ingredients.draft.json`: agent drafts, **not checked**. Never shown in the app.
- `score-fixtures.json` (A3): Nutri-Score cases checked with the official calculator.

## Checking a draft (A2, 30 entries each, 10–13 Nov)

1. Open the `source` link yourself. If it says `DE COMPLETAT`, find a source you can open (EUR-Lex, EFSA, ANSA) and paste it.
2. Fix `role`, `explanation` (1–2 plain Romanian sentences, ș/ț with comma) and `allergen` so they match the source.
3. Add `"checkedBy": "<your name>"` and `"checkedAt": "YYYY-MM-DD"`, move the entry from `ingredients.draft.json` to `ingredients.json`.
4. Run `pnpm data:check`.

Split: entries 1–35 R1, 36–70 R2, 71–104 R3, 105–138 R4, 139–172 R5.

## Score fixtures (A3)

`score-fixtures.draft.json` holds 28 candidate products from Open Food Facts (Moldovan 484 codes; data © Open Food Facts contributors, ODbL 1.0), **not checked**. Each has the OFF revision it was copied from (`source.url` opens that exact revision), the declared values per 100 g/ml, and `offReference`: Open Food Facts' own Nutri-Score 2023 result. `offReference` is only a cross-check; it is not the official calculator and never goes into `expectedPoints`.

To check one (needs 30 in total: at least 5 per letter, 4 beverages, 3 cheeses, 3 fats/oils, 1 water; the draft still lacks 2 cheeses):

1. Open `source.url` and compare the values with the package or the OFF photos; fill `fruitVegPct` only if the label declares it (else leave `null`, which counts 0).
2. Confirm `scoreKind` (OFF has e.g. an orange juice as `general`).
3. Enter the values in Santé publique France's official Nutri-Score 2023 calculator. Write its result in `expectedPoints` and `expectedLetter`, and `checkedWith: "SpF calculator <version>, <your name>, YYYY-MM-DD"`.
4. Move the entry to `score-fixtures.json` with only the `ScoreFixture` fields (`name`, `scoreKind`, `nutrients`, `expectedPoints`, `expectedLetter`, `checkedWith`), then run `pnpm data:check` and `pnpm --filter @okbite/shared test score`.

Beverages with a non-nutritive sweetener must include `ingredientsText` in the
fixture so their sweetener points are tested. The field is optional/nullable for
existing fixtures; do not invent ingredient text or human verification.

### Evidence status (2026-11-09)

The current 31 fixture records carry historical `checkedWith` prose: 25 claim a
human recheck on 2026-11-05 and six explicitly remain unchecked. This text alone
is not independently verified human approval. The scoring track owns corrections,
calculator evidence, fixture coverage and `data/score-*`; do not replace missing
human review with an agent assertion. Counts and classifications must be rechecked
after integrating that track.

## Product score (N4)

`productScore` in `packages/shared/src/score/product.ts` gives each product a 0–100 score
built from deductions. `computeScore` is unchanged: it stays the Nutri-Score part (letter A–E
and its own 0–100) and lookup keeps returning it. Weights decided by Sergiu on 2026-11-10;
the app's method page copies this section.

| Part | Worth | Rule |
| --- | --- | --- |
| Nutrition | 60 | `round(Nutri-Score 0–100 × 0.6)`. The loss has two parts. What the bad nutrients cost (the score the product would get with no energy, sugar, saturated fat, salt or sweeteners, minus its real score) is split over sugar, saturated fat, salt and energy in proportion to their Nutri-Score points; beverage sweetener points count as "other nutrition". The rest is "other nutrition": little fibre, protein, fruit or vegetables, or a category that cannot reach A (drinks other than water start at B). |
| Additives | 30 | −10 per high-risk additive, −5 per moderate, never below 0. Low risk takes nothing off. An additive whose risk is not assessed takes nothing off but is listed. Only ingredients in the additive group count, each once (same slug or name); if copies disagree, the highest risk counts. |
| Processing | 10 | NOVA group 1 or 2: 10, group 3: 5, group 4: 0. NOVA unknown (missing, or not 1–4): this part is left out and nutrition plus additives are scaled from 90 to 100, so a moderate additive shows as −6 and a high-risk one as −11. |
| Cap | — | Any high-risk additive caps the total at 49. |

- Nutrition unavailable (missing kcal, sugar, saturated fat or salt): no score at all, as today.
  A missing value is never counted as 0.
- Deductions are reported after scaling and rounding, so 100 minus their sum is always the score.
  Rounding uses largest remainder: every deduction is rounded down and the missing points go to the
  biggest fractions, so whole-number deductions (−10 processing, −5 additive) stay exact and none
  moves more than 1 point. They carry keys only
  (`sugar`, `sat`, `salt`, `kcal`, `nutrition_other`, `additive`, `processing`, `cap`); the app
  translates them.
- Tiers: excellent 80–100, good 60–79, fair 40–59, poor 20–39, bad 0–19. The Nutri-Score letter
  keeps its own A (green) to E (red) scale, drawn by us (never the official logo).
- Additive risk levels (`Ingredient.risk`) and the NOVA group (`Product.processing`, from Open Food
  Facts or the team) come from the N1 contract; each needs its own source a human opened.
- Every score is shown with "Calculat la 100 g; nu indică riscul unei boli."

## Explicit release gate

Run `pnpm data:check --release` before a content release. It requires:

- At least 150 valid checked ingredient records, real nonfuture review dates,
  opened source URLs, no blank content or matcher-equivalent name/alias collisions.
- The `necunoscut` fallback category needed by the importer.
- At least 30 distinct score fixtures: at least five per letter A–E, four
  beverages, three cheeses, three fats/oils/nuts, one water, and non-null
  kcal/saturated fat/sugar/salt calculator inputs for non-water fixtures. Water
  uses its dedicated score path and may keep those nutrients null.
- A current human review record for every fixture in
  `score-fixtures.review.json` (owned by the scoring track). Each record has
  `fixtureSha256`, `checkedBy`, `checkedAt` (`YYYY-MM-DD`) and `source` (the
  official calculator/report URL actually opened by the reviewer). Compute the
  digest with exported `scoreFixtureDigest(fixture)` from `scripts/check-data.ts`:
  SHA-256 of `JSON.stringify(ScoreFixture.parse(fixture))`. Changing any scoring
  input, expected output or provenance invalidates the record. Never manufacture
  records by parsing `checkedWith` prose.

`pnpm data:load --release` applies this gate before any writes. Ordinary loading
remains available for local development; it loads only `ingredients.json`, never
`ingredients.draft.json`. These commands check recorded evidence and content
coverage; a green result still needs independent human approval.

There are **0 checked ingredients and 172 drafts**. All draft sources have an
HTTPS link, which does not establish that the explanation is supported or that
any human opened it. Human reviewers still need to open each cited annex/page,
check that it supports the whole explanation (not only the allergen/additive
classification), correct Romanian text and aliases, confirm allergens, then add
their actual reviewer/date and move approved entries to the checked file. Review
at least 150 for the content gate; review all 172 to finish the draft backlog.

## Import operation and local verification

Load categories before importing: a fresh seed does not contain the importer’s
`necunoscut` category. The importer searches products **sold in Moldova** across
four language partitions; valid imported barcodes are retained alongside 484
codes. OFF `_100g` nutrient values are already normalized per 100 g/ml, including
when the source table was entered per serving. Never substitute `_serving` or
raw values for absent `_100g` fields. Missing/invalid nutrients remain null.
Liquid package unit `ml` or explicit `100ml` selects the 100 ml label.
[OFF field definitions](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/html/data-fields.txt)
explain the normalized units. All imported products remain unverified.

Romanian text is preferred; foreign ingredients require an explicitly configured
translation key. Translations preserve segments, numbers, E codes and trace
clauses, and combine detected allergens with OFF declarations. These mechanical
checks cannot prove a translation’s meaning: human label checks remain necessary.
No key means foreign rows are reported as skipped. Existing foreign codes are
checked before translating; insert-only conflict handling protects existing rows,
including races. Repeated runs insert zero existing codes.

The ignored `OFF_TRANSLATION_CACHE` (default
`.superpowers/off-import/translations.json`) saves validated translations before
database writes by atomic rename. Version 2 entries retain the validated model
segments, including punctuation within a segment. Legacy flat entries are reused
only when their boundaries can still be validated; ambiguous legacy entries stop
for inspection instead of silently requesting another translation. After
interruption, rerun with the same cache
and model: committed rows are skipped and cached translations are reused.
Corrupt checkpoints fail closed; restore a known-good copy or remove the affected
entry only after inspection. Do not delete the cache casually: translation work
would be repeated. A reported partition above OFF’s 1000-result cap requires a
smaller partition/export before claiming complete coverage. Pagination is not a
snapshot: later source changes may require another pass. Concurrent importers
must use distinct cache files; a shared checkpoint is not a multi-writer lock.

`import-off.integration.test.ts` is opt-in and accepts only the disposable C5
fixture at `http://127.0.0.1:64431` via `C5_LOCAL_URL` and `C5_LOCAL_KEY`. Copy
`supabase/` to a new temporary project (omit `.temp/` and `.env*`), use unique ID
`okbite-c5-data-20261109`, unused API/DB ports 64431/64432 and PG17. Keep checked-in
defaults unchanged. Run the scripts suite with those local-only variables to
exercise actual PostgREST loading, duplicate/repeated runs, null nutrients,
checksum rejection, interrupted inserts and durable translation reuse. OFF/AI
answers are disposable fixtures, with no hosted import or provider job. It cleans
its rows afterward; ordinary `pnpm test:scripts` skips this integration test.
