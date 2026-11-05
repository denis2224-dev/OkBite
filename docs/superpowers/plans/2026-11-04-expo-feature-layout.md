# Expo feature layout implementation plan

**Goal:** Apply the supplied feature-oriented layout directly in the project root while keeping Expo and the existing behavior.

**Structure:** `src/main.ts` starts the application; `src/app.tsx` owns providers and theme. Expo route entry files remain in `src/app` and delegate to feature screens. Shared presentation lives in `src/shared/widgets`; core theme, utilities, constants and platform services live in `src/core`; models, demonstration records and repositories live in `src/data`. Root `assets/fonts` contains local fonts and `assets/icons` contains icon data. `design` holds the supplied reference export and is never imported by application code. All tests live under root `test`.

**Constraints:** Preserve the existing branches and root skill files. Keep interface copy, routes, services and workflows unchanged. Do not add a second framework, fake server implementation or empty controller abstractions.

- [x] Move the application to the root and map source files into core/data/features/shared.
- [x] Update imports, route delegates, entry point, configuration and package layout.
- [x] Bundle the existing fonts locally and retain the original icon paths.
- [x] Place the reference HTML/canvas files in `design` and tests in `test`.
- [x] Verify imports, all tests, type checking, lint and browser/native exports.
- [x] Review and commit on `refactor/expo-feature-layout`.

Verification: 62 tests passed, type checking and lint passed, and browser/iOS/Android exports passed. The reference files match the supplied archive. Review found no issues and confirmed that all 69 original schema declarations and public exports were preserved. Fonts load from local assets.
