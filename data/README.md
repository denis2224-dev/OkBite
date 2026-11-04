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
