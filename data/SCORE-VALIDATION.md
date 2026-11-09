# A3/C4 scoring validation — 9 November 2026

Local implementation verification is complete only when the checks below pass.
Calculator agreement is **agent reproduction**, not human approval or release readiness.
The public `computeScore(nutrients, kind, ingredientsText)` API and Nutri-Score 2023
algorithm are preserved. No contract, migration, shared helper or deployment changes.

## Independent primary references

- [SpF Nutri-Score page](https://www.santepubliquefrance.fr/nutrition-et-activite-physique/nutri-score)
  links the updated calculator separately from the original algorithm.
- [2022 scientific report](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/2022-main%20algorithm%20report%20update_FINAL.pdf),
  printed pp.130–135, algorithm recap: food thresholds, cheese/red-meat exceptions,
  fats' saturate energy (37 kJ/g), ratio thresholds and protein cap.
- [2023 beverage report](https://invs.santepubliquefrance.fr/sites/default/files/rdd/document/Update%20report%20beverages_31%2001%202023-VOTED.pdf),
  §§6.2–6.7 and final recap: beverage thresholds, uncapped protein, four NNS points,
  and water-only A. Report tables contain inconsistent equality notation; use the
  published allocation rules and operational formulas together, with the specific
  workbook exception documented below. FVL uses strict `>` thresholds.
- [SpF calculator 20240404](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/Nutri-Score_Updated-algorithm_20240404.xlsx)
  and [FPS French 2025-10 copy](https://www.health.belgium.be/sites/default/files/media/files/2025-10/va_outil_de_calcul_du_nutri-score_algorithme_actualise.xlsx).
  URL dates identify copies, not a newer points algorithm. SHA-256 digests are in
  `score-fixtures.validation.json`; a downloaded future replacement must be re-audited.
- [SpF FAQ V11](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf),
  printed pp.16–20, 26–32 and Appendix 3: category definitions, final calculation
  and newly authorized NNS. E960c/d are covered by Regulations
  [2021/1156](https://eur-lex.europa.eu/eli/reg/2021/1156/oj/eng) and
  [2023/447](https://eur-lex.europa.eu/eli/reg/2023/447/oj/eng);
  E960b by [2025/652](https://eur-lex.europa.eu/eli/reg/2025/652/oj/eng).
  These implement the FAQ's inclusion rule; they do not replace the 2023 algorithm.

Codex opened these sources. This records no new human opening or approval.

## Reproduction and corrections

Imported each original workbook with Artifact Tool and changed input cells only in
disposable memory copies. Recalculated the official formulas, without importing or
calling the OkBite engine. Both workbooks agree on all 31 original cases and the
four corrected classifications. The evidence records SpF sheet/row, results and
cross-workbook agreement. Updated result columns: General foods AD/AE, Red meat
AB/AC, Cheese AB/AC, Fats AI/AJ, Beverages AG/AH. The French copy has translated
sheet names and OUI/NON flags; the updated result columns are the same.

Known workbook exception: Beverage/Boissons `AC3` uses `<3.2` for the 15-point salt
branch, giving 16 at exactly 3.2 g. The published 2023 allocation table and FAQ V11
Table 9 say 16 only for **>3.2**. Keep the engine's 15 at equality, covered by an
explicit regression. Thus agreement on the 31 product cases is not a claim of
universal agreement with every workbook boundary. The reviewer verified this
exception in both pinned files; no current fixture sits on it.

Energy input is `kcal × 4.184`, matching the contract. Historical `checkedWith`
sometimes cites independently declared label kJ; those values are not a second
energy input in the public API. Unknown favourable nutrients were entered as zero
under the project's conservative policy, not asserted to be label-declared zero.
Non-water beverage reproductions assume NNS=NO: ingredient evidence must still be
checked. Plain water uses YES with all other workbook inputs blank. Its official
letter is A; its workbook points are not applicable (`#VALUE!` in the unused
points column). Zero points/100 in OkBite is an explicit water convention.

| Fixture code | Correction | Official result with corrected kind |
| --- | --- | --- |
| 4841257001275 | OM plain water: beverage → water | A; OkBite points 0 |
| 4840362001095 | Căsuța Mea milk: general → beverage | 2, B |
| 4840811002024 | Banzai sunflower seeds: general → fat | −10, A |
| 5000295157569 | Plant soft-cheese alternative: cheese → general | 20, E |

The public OFF revisions linked in the evidence retain the original nutrient
provenance (ODbL, Open Food Facts contributors). The retrieved water and plant
alternative revisions confirm plain water and coconut-oil/plant-protein ingredients.
The existing draft remains historical source material, not current approval.
No nutrient values or checker identities were added. Superseded fixture records,
including their historical approval prose, are preserved in the evidence file.

## Tests and reference coverage

Regressions failed before fixes for the four classifications, E960b/c/d matching,
and a fat ratio just below 58% incorrectly rounded upward. Ratio comparisons now
allow only floating-point arithmetic error, not rounding to six decimal places.
All official scalar thresholds have equality/below/above tests; separate tests
cover FVL, protein caps, all kinds' band endpoints, required nulls, favourable
nulls, water, ingredient matching, and Romanian reasons with decimal commas.

Missing/empty/short reference files now fail score tests instead of skipping the
fixture suite. Every fixture must have matching independent calculator evidence
bound to `SHA256(JSON.stringify(ScoreFixture.parse(fixture)))`. These tests prove
reproduction integrity; they cannot prove that a person reviewed a label.

Current real-product coverage: **31**, letters **A7 B4 C8 D5 E7**, kinds
**general17 cheese2 fat5 beverage5 water2 red_meat0**. A3 still needs at least one
additional independently sourced B and one cheese (possibly the same product).
Red meat also reproduces the official workbook's beef example (-1/A); red meat
and NNS still have no real-product fixture in the 31-record A3 dataset.
Category assignment and absence of NNS are caller/data responsibilities; the
engine cannot infer a product's kind from nutrients. New real values require a source.

`score-fixtures.review.json` is an empty array: no new human attestation was
obtained. The data track's release validator consumes rows of
`{ fixtureSha256, checkedBy, checkedAt, source }`, using the digest above. It must
check current content and coverage separately. Developmental `pnpm data:check`
passing is not an A3 release gate. Reconcile the data track's release check when
integrating; water must be exempt from required kcal/sat/sugar/salt checks, as in
`computeScore` and the official water calculator path. Do not invent water values
to satisfy a generic readiness rule. Do not edit its validator or README here.

## Human gates

The first 25 original records retain the recorded Rusu Serghei 2026-11-05 claim;
that claim is historical evidence, not approval of later corrections. The six
originally pending fixtures still require a person to open the cited revision,
check label values/category/NNS, reproduce the official calculator and attest:

- [ ] Canzona, 5701638115863, OFF rev7 — 23/E, cheese.
- [ ] Cathedral City alternative, 5000295157569, rev16 — corrected to 20/E, general.
- [ ] Barilla Capellini, 8076800195019, rev2536 — 0/A, general.
- [ ] Vis beans, 4840019000938, rev7 — 4/C, general.
- [ ] Floris sunflower oil, 4840059000929, rev20 — 4/C, fat.
- [ ] Activia natur, 59467199, rev81 — 2/B, general.

Also re-check corrected OM water, Căsuța Mea milk and Banzai seeds. A person must
confirm/import valid historical attestations for unchanged records, review the new
sources and matcher names, and supply the missing B/cheese reference coverage.
Claude cross-review and human merge approval remain separate repository gates.

## Local checks and handoff

`pnpm check` passed: lint (zero errors, 57 existing warnings), typechecks, complete
repository tests and developmental data validation (0 errors). Shared tests:
274 passed; focused score tests: 162 passed. Six generator tests passed;
`pnpm sync-shared` followed by `git diff --exit-code -- supabase/functions/_shared`
confirmed generated parity. No generated files were hand-edited.

Deno 2.9.8 typechecked generated shared code, helpers and lookup. All 46 Edge unit
tests passed. Three existing live lookup/contribution integration tests passed,
including each required-null case. A temporary targeted live test inserted only a
synthetic boundary record: persisted E960b/c/d each produced C/53 and the NNS
reason through the real lookup handler; no sweetener produced B/62. It removed its
record afterward. No test nutrient values were added to the real-product fixtures.

Supabase CLI 3.0.0 used a copied PG17 configuration at
`/tmp/okbite-c4-scoring-20261109-b41f`, project of the same name, API62431/DB62432.
Existing projects and checked-in defaults were untouched. All 132 database
assertions passed. The initial extra database check was interrupted by an account
usage limit; after the user's resume instruction it ran successfully. The exact
copied-project identity alone was added to its copied local-project guard.

Fresh read-only Codex review found no critical/important implementation defects.
Its one documentation finding about beverage salt equality was addressed above,
with an explicit regression; the correct existing engine behavior was retained.
This is not the repository-required Claude cross-review or human approval.
The reviewer inspected original formulas, hashes and reproduction logs, but did
not independently rerun Artifact Tool. The executor did run both workbooks.

Integration: base `9704b38` already includes C2/C3 guards. Engine fix is `b07eeaf`;
the fixture/evidence commit follows it on `C4-scoring-followup`. The data track
reported implementing the hash-bound review interface and water exemption; verify
its `--release` gate after integration. Keep all current human/coverage gates open.
No UI was changed; no physical-device, hosted-runtime or deployment claim is made.
