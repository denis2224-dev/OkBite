# PR #16 integration plan

**Goal:** Make the existing frontend review branch compatible with current main while preserving the approved root Expo application.

**Architecture:** Keep `src/main.ts`, root `src/`, assets, routes and UI authoritative. Preserve incoming team work in `apps/mobile`, `packages/shared`, `data`, `scripts` and `supabase` without moving or changing backend-owned schemas.

**Scope:** Dependency, validation and handoff reconciliation; no new product behavior or redesign. The user authorized updating PR #16 and marking it ready for human review. Main must not be merged automatically.

**References:** `AGENTS.md`, `docs/superpowers/specs/2026-11-03-okbite-design.md`, the R4/R2 role plans and `docs/integration-handoff.md`.

- [x] Merge fetched `origin/main` into `r4/ready-for-review` and resolve package scripts/dependencies without dropping either application's setup.
- [x] Regenerate the pnpm 9.12.0 lockfile and verify a frozen install.
- [x] Include incoming script/data validation in `npm run check`; run all app, browser, shared and scaffold checks plus web/iOS/Android exports.
- [x] Update the handoff with the reconciled paths, validation results and remaining device/backend acceptance steps.
- [x] Obtain independent code review and address integration findings; prepare the tested merge for commit.
- [ ] Push the existing PR branch, update its description, mark it ready and verify GitHub mergeability. Leave main for human review.

## Review focus

- Root app entry, routes, assets and design must remain unchanged.
- Incoming data validation scripts and workspace dependencies must be retained.
- Test runners must target their own suites, including newly merged tests.
- The lockfile must install without modification under the pinned pnpm version.
- Incoming backend files must be preserved; a frontend export is not database or physical-device acceptance.

## Decisions and evidence

- Integrated main `3b0d6c5`; root UI and incoming teammate implementation files are unchanged.
- Kept the authoritative database at root `supabase/` and replaced the old server documentation with a pointer.
- Scoped root Vitest to script suites; used `.mts` for explicit ESM configuration.
- Ran the data checker through Node's tsx import hook, preserving its entry-point behavior without the CLI's sandbox-blocked IPC listener.
- Frozen install, all 331 tests, configured type/lint checks, strict data-script type checking, data validation and all three platform exports passed.
- Independent review found no blocking issues; corrected its README test-location wording finding.
