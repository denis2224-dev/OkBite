# Unknown-product flow: physical-phone acceptance, November 2026

**Status: NOT RUN. U10 is incomplete; this file is a runner and evidence template.** No physical-phone session, live API call, product save, or photo capture was performed to prepare it. Execution is blocked pending the U9 preview and confirmed backend readiness described below.
Source: [design specification, §9](../superpowers/specs/2026-11-03-okbite-design.md#9-acceptance-criteria), using the U0 draft in `C:\ASCS\okbite-U0`; confirm its approved wording in the U9 preview commit before execution.

## Preflight — required before any run

- Obtain the U9 HTTPS preview URL, its exact deployed commit SHA, and the backend owner's readiness confirmation. Leave evidence blank until actually observed.
- U9 must include U1, U2a, U3, U5, U6, and U8 on the reviewed main integration; U2b is optional enrichment scope. A standalone U5 branch or an older cached preview cannot pass this acceptance.
- Confirm the preview uses the designated test backend, matching request/response schemas, migrations, storage, AI configuration, and scoring rules. Do not run production write commands or substitute production for an unavailable test backend.
- Pin the same SHA for all modes. Verify the browser and installed PWA load that version; resolve stale service-worker content before testing. A changed SHA starts a separate evidence set.
- Agree one known real-product case ID and one unknown real-product case ID with the team. Reuse these identifiers across modes; use a team-prepared isolated test backend state so an earlier save does not make the unknown case known in later runs.
- Keep real label photos, screenshots, recordings, and the case-to-product mapping in the approved private evidence store outside Git. Record references only; never invent label values, product identities, categories, or expected scores.

| Run setup | Observed value |
| --- | --- |
| U9 preview URL | |
| Deployed SHA and verification reference | |
| Backend readiness / owner confirmation | |
| Known / unknown case IDs | |
| Private evidence-store reference | |
| Runner / start time / timezone | |
| U2b included or team-approved deferral reference | |

## Four execution modes

`IS` = physical iPhone, Safari browser; `IP` = physical iPhone, installed home-screen PWA.
`AC` = physical Android phone, Chrome browser; `AP` = physical Android phone, installed home-screen PWA.
Installed PWA evidence does not establish that an EAS/App Store/Google Play native build passed; native-device acceptance remains separate.

Repeat every criterion below in every mode, in light and dark appearance and with effective 200% text scaling. Record the actual browser/OS scaling control used and verify the resulting text size; an unsupported control is a recorded gap. Check all controls remain readable, reachable, and usable without clipped text.

## Eight criteria and runner steps

1. **Unknown product creation from front + ingredients photos without mandatory keyboard input.** Start the unknown case from photo identification and barcode entry. Reuse an existing front photo after identification; barcode-only entry requests one. Capture ingredients and save without being forced to type brand, product name, or category. Never supply guessed values to get past validation.
2. **Nutrition question asked only after both photos with all four choices.** Confirm no nutrition question appears before front and ingredients exist. Verify separate photo (`separate`), table in ingredients photo (`same_photo`), no table (`none`), and skip for now (`skipped`) are distinct actions.
3. **“No table” and “skip for now” save ingredients-only without misleading nutrition warning.** Exercise both choices. Ingredients analysis remains available; nutrients remain null, score is unavailable, and neither choice produces a blurry-photo/camera-error warning. Check explicit `not_printed` versus `not_photographed` reasons in approved read-only test evidence.
4. **“Yes” and “same-photo” retain only printed nutrition and score conditionally.** Exercise separate and same-photo reads using the private real-label references. Compare extracted values against the label, including printed zero versus missing values. Show an approved score only with sufficient approved nutrient inputs and a confirmed category; `necunoscut` never receives a score. Otherwise show “Date insuficiente”; never guess a category or unit to force a score.
5. **Unreadable optional table offers retake or continue ingredients-only.** Use a team-approved unreadable-table case, including applicable `unreadable`, `no_per_100`, and `failed` responses. Verify both retake and continue paths preserve front/ingredients identities and already-extracted ingredients. Continuing does not call AI again, clears nutrition values to null, and does not fabricate a replacement unit/name.
6. **Missing nutrients stay null, never zero or invented.** Compare the saved/reloaded result with the printed label and approved read-only response evidence. Missing, unreadable, and non-per-100 values stay null; an explicitly printed zero may stay zero. Repeat for all four nutrition answers.
7. **Enrichment updates same ID conditionally, retries prevent duplicates, drafts restore locally.** Save with rapid double-taps and an intentional network interruption using the preview UI: one product results, and retries reuse original photo identities. Reload a pending draft: photos, choices, and completed reading return locally; no AI request starts until an explicit resume/retry action. When U2b is included, enrich only a still-unverified product with every nutrient null, keep its ID/status, and reject ineligible verified or partially populated targets. Enrichment remains NOT RUN, or becomes DEFERRED only with the team's recorded U2b scope cut; it never becomes PASS by omission.
8. **Physical verification on iPhone and Android.** Complete all four physical-phone modes with light/dark and 200% text evidence. Include an older supported iPhone: record model, OS, mode, session length, capture/read/save timings, observed warmth, scrolling/camera stutter, and any reproduction steps. Distinguish observations from assumptions about their cause.

Use the same known real-product case as a regression control: identification should return its existing product rather than adding a duplicate. Capture permission refusal/gallery fallback and recovery when encountered; record a failure or gap rather than bypassing it silently.

## Evidence matrix — one row per criterion and mode

All rows start NOT RUN. Fill SHA, device model, OS version, actual browser/version, time (with timezone), and private screenshot/recording references only after execution. Each evidence reference must include the four nutrition-answer subcases where applicable, appearance/text variants, observed outcome, and any defect ID. Use additional evidence entries rather than overwriting a failed attempt.

| Criterion | Mode | Status | SHA | Device | OS | Browser/version | Time | Screenshot/evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | IS | NOT RUN | | | | | | |
| 1 | IP | NOT RUN | | | | | | |
| 1 | AC | NOT RUN | | | | | | |
| 1 | AP | NOT RUN | | | | | | |
| 2 | IS | NOT RUN | | | | | | |
| 2 | IP | NOT RUN | | | | | | |
| 2 | AC | NOT RUN | | | | | | |
| 2 | AP | NOT RUN | | | | | | |
| 3 | IS | NOT RUN | | | | | | |
| 3 | IP | NOT RUN | | | | | | |
| 3 | AC | NOT RUN | | | | | | |
| 3 | AP | NOT RUN | | | | | | |
| 4 | IS | NOT RUN | | | | | | |
| 4 | IP | NOT RUN | | | | | | |
| 4 | AC | NOT RUN | | | | | | |
| 4 | AP | NOT RUN | | | | | | |
| 5 | IS | NOT RUN | | | | | | |
| 5 | IP | NOT RUN | | | | | | |
| 5 | AC | NOT RUN | | | | | | |
| 5 | AP | NOT RUN | | | | | | |
| 6 | IS | NOT RUN | | | | | | |
| 6 | IP | NOT RUN | | | | | | |
| 6 | AC | NOT RUN | | | | | | |
| 6 | AP | NOT RUN | | | | | | |
| 7 | IS | NOT RUN | | | | | | |
| 7 | IP | NOT RUN | | | | | | |
| 7 | AC | NOT RUN | | | | | | |
| 7 | AP | NOT RUN | | | | | | |
| 8 | IS | NOT RUN | | | | | | |
| 8 | IP | NOT RUN | | | | | | |
| 8 | AC | NOT RUN | | | | | | |
| 8 | AP | NOT RUN | | | | | | |

Enrichment subtest status: **NOT RUN**. Team-approved deferral reference, if U2b is cut: .

A runner may mark PASS only after the expected behavior is observed and supporting evidence is linked. Record FAIL for an observed defect and BLOCKED for an unmet execution dependency; preserve unexecuted rows as NOT RUN. A deferred enrichment subtest does not make the full enrichment criterion pass.
U10 remains incomplete until the physical runs, defect handling, evidence review, and human acceptance are finished.
