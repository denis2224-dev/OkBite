# Full-stack folder layout implementation plan

**Goal:** Give frontend, backend, shared schemas, documentation and development helpers clear homes without changing application behavior.

**Architecture:** Keep the pnpm workspace and Expo app. Move `apps/mobile` to `frontend/mobile` and `packages/shared` to `shared/contracts`; keep package names stable so existing imports and root commands continue to work. Reserve `backend/supabase` for server implementation and put reusable command helpers in `scripts`.

**Constraints:** Preserve feature branches, application logic, colocated tests, existing dependency versions and all prior wording restrictions. Do not invent backend services. Keep the changes on `chore/full-stack-layout`.

- [x] Verify the existing test, type and lint baseline.
- [x] Move directories; update workspace entries and lockfile links.
- [x] Extract the temporary keep-awake command into `scripts/keep-awake.sh`.
- [x] Update the main README and handoff documentation with current paths and responsibilities.
- [x] Relink dependencies offline; run all existing tests, type checks, lint and platform exports.
- [x] Commit the reorganization locally and leave the earlier feature branches intact.

Verification: 103 moved files are byte-identical; 54 tests, both type checks, frontend lint and browser/iOS/Android exports passed. Dependency versions and package names are unchanged.

Final reference review: no findings.
