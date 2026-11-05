# B5 detail screens — review handoff

Base: R1-ci-integration / PR #41. Target app: apps/mobile.

Ingredients and label routes use R4's useProduct, shared API validation, UI,
theme and copy. Ingredients retain allergen declarations, possible traces,
row indicators, verification status and provenance. Unknown or unsourced
explanations remain pending. Only HTTP(S) explanation sources can open.
Hidden product content is excluded.

Comparison reads the durable history, prioritizes matching categories,
excludes the other selection, preserves status/allergens/provenance and
shows decimal commas. Different categories or units produce guidance instead
of a table; missing/equal values have no winner, and zero is preserved.
Missing required nutrition fields yield an unavailable score. A new deep
link masks stale selections while refreshed history loads.

## Required integration interfaces

- R4: wire ResultView's existing ingredient and label actions to
  /product/<id>/ingredients and /product/<id>/label. The user explicitly
  reserved these two buttons for R4; ResultView is untouched here.
- R5: /capture must be supplied by #14 before the photo comparison action
  completes the intended flow.
- Claude cross-review and human approval precede integration. Codex review
  found two display gaps; the fix pass added provenance/allergens and
  regression tests. Minor: unit mismatch reuses category guidance until R4
  supplies dedicated copy.

## Evidence and outstanding acceptance

Frozen pnpm 11.25.0 install, lint (0 errors, 55 inherited warnings), all
types and 420 tests pass. Web, iOS and Android exports pass. Browser checks
used the existing explicitly demonstrative fixtures through a local API:
ingredients expanded to pending text, label text/provenance appeared, and
saved-history comparison showed 4,1 g vs 13,2 g with source/allergen details.
This is browser UI evidence, not staging or human food-data verification.

Real label-image delivery, staging flows, 200% font checks and physical
iPhone/Android acceptance remain pending. The full B5 plan box stays open.
