# Application integration — 5 November 2026

The remaining submitted platform, backend, AI and application PRs were integrated
in dependency order. The canonical app is `apps/mobile`; the merged root design
preview remains available as reference and its tests remain part of the suite.
This is implementation integration, not a public deployment or launch approval.

## Final connections

- Product results expose the existing ingredient and original-label routes.
- The app shell installs the private, best-effort diagnostics reporter and updates
  its route without query strings or callback fragments. The endpoint and reporter
  validate the shared request/response schemas.
- Score fixtures retain optional nullable ingredient text, and the fixture runner
  applies sweetener detection. Existing fixtures remain compatible; no ingredient
  values or human checks were invented.
- Approved brand bytes from `store/assets/approved-brand/` are copied into the
  target app. Native/default/adaptive icons, favicon and PWA metadata use them.
  The PWA derivatives are ordinary 192/512/180-pixel resizes of the approved icon;
  previous asset files are preserved.
- The startup artwork stays visible for at least 2500 ms and waits for fonts,
  releasing on a font initialization error. App mounting, Auth callbacks and other
  initialization are not delayed. The timer is cleared on disposal.
- Privacy and method drafts now describe the integrated scoring engine, the
  configured TokenHarbor/DeepSeek provider path and technical diagnostics.

## Local validation

Node 22.23.4 with the declared pnpm 11.25.0; isolated integration worktree.

- Frozen installation, lint and root/workspace/e2e type checks pass. Lint retains
  57 existing warnings and has no errors.
- Full workspace tests: **867 passed**, including root reference tests, 470 mobile
  tests and 231 shared tests. The startup compatibility repair was rechecked with
  its focused regressions and strict type checking.
- Data validation: **0 errors**. Generated shared output is reproducible.
- Credential-free full Deno discovery: **37 passed, 21 integration tests ignored**.
  Ignored tests are not passing tests or live provider evidence.
- Web/iOS/Android exports pass. Local Playwright browser binaries are kept in a
  separate temporary directory; final browser/database CI evidence is attached to
  the integration PR rather than inferred from these exports.

## Acceptance still requiring external evidence

- Hosted Supabase setup and actual hosted Auth/CORS/storage/recovery checks.
- AI provider secrets and real front-photo/label-pair accuracy grading. The current
  server client uses TokenHarbor and defaults to `deepseek-v4.1-flash:free`;
  provider mocks are not live service verification.
- Six score fixtures still explicitly await human verification; preserve the
  existing recorded checks and complete the remaining source/label review.
- Real iPhone/Android camera, OTP, offline/reconnect, accessibility and installed
  icon/startup checks; simulator browser profiles do not substitute for devices.
- Operator/contact/privacy/retention decisions, named moderation rota, actual
  field collection, beta participants and store materials/credentials.

No public deployment, store submission, new account, paid service, human review,
or completed field/beta session is claimed. Other contributors' worktrees and
uncommitted changes were preserved; follow-ups use additive integration commits.
