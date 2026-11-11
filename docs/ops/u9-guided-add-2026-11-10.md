# U9 variant 1 follow-up — 10 November 2026

Base: `2435fbd98721503a033eb41f3f8c20d28e7746cd`; branch: `U9-guided-add-variant-one`.
Scope: remaining blank-brand/yogurt issues, using front-first variant 1.

Verified existing work:

- U5 already captures front, then ingredients, then asks all four nutrition choices.
- U1/U2a already allow an empty brand and omitted category; guided confirmation already uses them.
- U3/#128 preserve unknown cells as null/unreadable, explicit absent rows as not_printed, and printed zero.

Changes:

- Guided add defaults on for barcode, identify and direct `/add`; `flow=manual` remains available.
- Optional null rows do not trigger photography warnings when other nutrition was read.
  Core unreadable values and all-null unreadable tables still allow targeted recovery.
- Manual fallback accepts empty brand and omitted category using the existing shared schema.
- Completed drafts resume confirmation without replay; conflicting identities offer resume or discard.
- Discard restarts a usable flow, retains controls if deletion fails, and reports storage errors.
- Manual retake persists identity edits before navigation and suppresses navigation after leaving.

Rulings against the attachment:

- Preserve reviewed #128 semantics: unknown does not establish absence. Fix warning presentation.
- Preserve the specification's confirmed-category requirement and U1 g/ml selection.
  No category/unit inference or invented score inputs. Ingredients analysis remains available without a score.
- The attachment's push-main promise is quoted context; publication requires project review gates.

Verification (Node 24.14.0, pnpm 11.25.0): `pnpm check` passed; 810 mobile tests passed.
Lint retains 88 existing warnings and no errors. Web, iOS and Android exports passed.
Native Deno read-label tests: 35 passed. Independent Codex review found no remaining issues.
Browser run: 71 passed, one unsupported Safari camera scenario skipped; local stubs and existing fixtures.

Release gates remain open: Claude cross-review, backend-owner confirmation of deployed U1/U2a/U3,
physical iPhone and Android app/browser evidence, and human approval before main integration.
Use `EXPO_PUBLIC_GUIDED_ADD=0` and rebuild for an older backend. No contract, migration, score or Edge changes.
