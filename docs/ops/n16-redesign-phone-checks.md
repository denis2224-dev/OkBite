# N16 — physical-phone redesign acceptance

Owner: Stas, with Ion. Source: [redesign assignment](https://claude.ai/artifact/EvYSU7v816VitAfdQmmtTA#1827fc89-3eec).

**Status: not run.** This is a preparation checklist, not device evidence. Run only after the redesign dependencies merge and the exact main commit successfully deploys to `okbite-ir1`. Record failures in separate owner fix PRs; do not mark browser emulation as a physical-phone run.

For each run, record tester, date, full commit SHA, immutable Pages deployment URL, device model, OS/browser version, browser or installed PWA, language, theme, text size, outcome and screenshot/video paths. Confirm the deployed commit rather than relying only on a mutable branch URL.

| Surface | Model / OS / browser | Commit / deployment | Outcome / evidence |
| --- | --- | --- | --- |
| iPhone Safari | Not recorded | Not recorded | Not run |
| iPhone installed PWA | Not recorded | Not recorded | Not run |
| Android Chrome | Not recorded | Not recorded | Not run |
| Android installed PWA | Not recorded | Not recorded | Not run |

Execute on all four surfaces, in Romanian and English, light/dark mode and at 200% text:

- [ ] Fresh launch: finish onboarding; repeat from a reset and skip onboarding. Both land on Scan.
- [ ] Five tabs visible in order: About, History, Scan, Profile, Settings. Each opens and returns to Scan.
- [ ] Scan five actual known product barcodes. Record the real barcode and first-read time for each; include iPhone first-read timing.
- [ ] Manual barcode entry and photo fallback lead to the expected real product or unknown-product flow.
- [ ] Result sheet: correct tier and “De ce?”/“Why?”, reviewed deduction values, processing/additives and a profile allergen hit. Missing fields show unknown/unavailable rather than zero or absence.
- [ ] Comparison remains reachable from a result and rejects incompatible categories.
- [ ] History search finds previously opened products by name and brand; unknown score remains unavailable.
- [ ] Settings: language persists after reload; theme follows selection; cancelling clear-history keeps records; confirming clears only history; reset onboarding uses the local profile store.
- [ ] Install guidance works in Safari; Android shows the browser install action when available. Already installed apps do not keep prompting. Dismissal persists.
- [ ] After the first online visit, reopen offline: tabs and history load, known saved product opens, locally cached decoder starts. No queued POST is replayed automatically.
- [ ] Unknown-product additions preserve drafts, photo retakes, four nutrition choices, manual fallback and one save per contribution.
- [ ] No clipped controls at 200%, readable contrast in both themes, touch targets usable, screen-reader labels match the chosen language.

| Device / surface | Actual known barcode | First read (ms) | Outcome | Evidence |
| --- | --- | --- | --- | --- |
| Not recorded | Not recorded | Not measured | Not run | Not recorded |

Prerequisites still require owner integration: N17/N2 bilingual copy, N3 shell, N6/N7 scanner, N4/N11 score/profile logic, N8 Settings/About, N10 onboarding/profile, N12/N13 results/history, N14 reviewed data, N18/N19/N20 restyled contribution/detail/report flows, and N15 browser acceptance. Claude cross-review and human main-merge approval remain separate requirements.
