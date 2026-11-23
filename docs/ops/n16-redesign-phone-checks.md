# N16 — physical-phone redesign acceptance

Owner: Stas, with Ion. Source: [redesign assignment](https://claude.ai/artifact/EvYSU7v816VitAfdQmmtTA#1827fc89-3eec).

**Status: pending physical-device testing.** Use the approved staging deployment and matching native builds. Link failures to the responsible owner and keep browser emulation results in the automated test record.

For each run, record tester, date, full commit SHA, immutable Pages deployment URL or native build ID, device model, OS and browser version, language, system appearance, text size, outcome and evidence. Confirm the deployed commit rather than relying only on a mutable branch URL.

| Surface | Model / OS / browser | Commit / deployment | Outcome / evidence |
| --- | --- | --- | --- |
| iPhone native | Pending | Pending | Pending |
| Android native | Pending | Pending | Pending |
| iPhone Safari | Not recorded | Not recorded | Not run |
| iPhone installed PWA | Not recorded | Not recorded | Not run |
| Android Chrome | Not recorded | Not recorded | Not run |
| Android installed PWA | Not recorded | Not recorded | Not run |

Run the native builds in Romanian and the browser and installed PWA in Romanian, English and Russian. Check the light interface at 200% text and confirm it stays light when the phone uses a dark appearance.

- [ ] Fresh launch: finish onboarding; repeat from a reset and skip onboarding. Both land on Scan.
- [ ] Verify the four tabs in order: History, Compare, Scan and Profile. Open Settings and About from Profile.
- [ ] Scan five actual known product barcodes. Record the real barcode and first-read time for each; include iPhone first-read timing.
- [ ] Check manual barcode entry on the standalone Scan route and take a photo from Compare. A known product opens the correct result or fills the chosen comparison slot. An unknown product opens the contribution flow.
- [ ] Verify the result tier, score reasons and additives. Check a declared profile allergen, a trace-only match and a product with a blank or incomplete label. Compare the wording in Result, Ingredients and Compare with the package.
- [ ] Comparison remains reachable from a result and rejects incompatible categories.
- [ ] Close a successful Scan result and open History. The product appears immediately and has one row after a reload or rescan. Open the saved result offline and confirm an unknown score stays unavailable.
- [ ] Check that the web language persists after reload. In History, cancel and then confirm clearing the saved entries. Reset onboarding from Settings and verify the profile restarts.
- [ ] Install guidance works in Safari; Android shows the browser install action when available. Already installed apps do not keep prompting. Dismissal persists.
- [ ] After the first online visit, reopen offline: tabs and history load, known saved product opens, locally cached decoder starts. No queued POST is replayed automatically.
- [ ] Unknown-product additions preserve drafts, photo retakes, four nutrition choices, manual fallback and one save per contribution.
- [ ] At 200% text, check clipping, contrast, touch targets, VoiceOver or TalkBack labels and visible keyboard focus.

| Device / surface | Actual known barcode | First read (ms) | Outcome | Evidence |
| --- | --- | --- | --- | --- |
| Not recorded | Not recorded | Not measured | Not run | Not recorded |

Record staging shelf results in the [OB-08 release verification](ob08-release-verification-2026-11-22.md) record after a shelf entry point is approved.
