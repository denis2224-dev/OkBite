# data/

Hand-checked content. `pnpm data:check` must report `0 errors` before merge; `pnpm data:load` (C5) refuses to run otherwise.

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

`score-fixtures.draft.json` holds 28 candidate products from Open Food Facts (Moldovan 484 codes), **not checked**. Each has the OFF revision it was copied from (`source.url` opens that exact revision), the declared values per 100 g/ml, and `offReference`: Open Food Facts' own Nutri-Score 2023 result. `offReference` is only a cross-check; it is not the official calculator and never goes into `expectedPoints`.

To check one (needs 30 in total: at least 5 per letter, 4 beverages, 3 cheeses, 3 fats/oils, 1 water; the draft still lacks 2 cheeses):

1. Open `source.url` and compare the values with the package or the OFF photos; fill `fruitVegPct` only if the label declares it (else leave `null`, which counts 0).
2. Confirm `scoreKind` (OFF has e.g. an orange juice as `general`).
3. Enter the values in Santé publique France's official Nutri-Score 2023 calculator. Write its result in `expectedPoints` and `expectedLetter`, and `checkedWith: "SpF calculator <version>, <your name>, YYYY-MM-DD"`.
4. Move the entry to `score-fixtures.json` with only the `ScoreFixture` fields (`name`, `scoreKind`, `nutrients`, `expectedPoints`, `expectedLetter`, `checkedWith`), then run `pnpm data:check` and `pnpm --filter @okbite/shared test score`.

Beverages with a non-nutritive sweetener cannot be fixtures yet: `ScoreFixture` has no ingredients field (R2 request in PR #31).
