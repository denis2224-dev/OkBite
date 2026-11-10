# Label accuracy check (U4): how to run

The script `scripts/label-accuracy.ts` sends real package photos to `read-label` and compares the
answer with ground truth typed by a person. It writes `docs/ops/label-accuracy-2026-11.md`.

## Before the first run

- [human] The free TokenHarbor route may log or train on images (terms §7). Confirm the team accepts
  that before any real photo goes through it.
- [human] U3 (#107, #108) must be deployed to the staging functions. Without it the script stops
  each set with "the server does not return reasons".

## Folder layout (git-ignored)

```
label-photos/
  01-short-name/
    front.jpg          optional; kept for the record, read-label does not use it
    ingredients.jpg    required
    nutrition.jpg      only when nutrition is "separate"
    truth.json         typed by a person from the package
```

Photos are JPEG, at most 1,5 MB each (the size the app uploads). No faces, no receipts.

## truth.json

```json
{
  "nutrition": "separate",
  "ingredientsText": "",
  "unit": null,
  "nutrients": {
    "kcal": null, "fat": null, "sat": null, "sugar": null,
    "salt": null, "protein": null, "fiber": null, "fruitVegPct": null
  }
}
```

- `nutrition`: `separate` (own photo), `same_photo` (table is in the ingredients photo), `none`
  (the package has no table) or `skipped`.
- `ingredientsText`: the ingredients exactly as printed.
- `unit`: `"g"` or `"ml"` as in "per 100 g"; `null` when there is no per-100 table.
- `nutrients`: the per 100 g / 100 ml values with a decimal point (`0.3`). Keep `null` for every
  value the package does not print. Write `0` only where the package prints 0.
- All eight nutrient keys must be present. The script rejects a file with a missing key.

The agent must never fill or correct `truth.json`.

## Run

Set the staging values in the shell (never commit them), then run:

```
EXPO_PUBLIC_SUPABASE_URL=<staging url> EXPO_PUBLIC_SUPABASE_ANON_KEY=<staging anon key> LABEL_MODEL=<AI_MODEL in use> pnpm label:accuracy
```

- Each set makes one `read-label` call with its own device id, because the quota is 20 reads per
  device per day. Use it against staging only.
- The photos are stored in the staging `uploads` bucket, like any shopper upload.
- A set that cannot be run (no truth file, photo too large, HTTP error) is listed under
  "Sets not run" with the reason and is not counted.
