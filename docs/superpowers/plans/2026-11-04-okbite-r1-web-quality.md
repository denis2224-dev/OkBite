# OkBite R1 · Web, Quality and Product Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-04-okbite-overall.md` (Global Constraints, Review Focus, who owns what, dependencies) and the spec before your first task. Steps marked **(human)** are done or checked by the person, not the agent. Task IDs keep their original letters (A = content, B = app, C = backend, D = platform/AI) so cross-references stay stable.

**Goal:** A coding role from day one: the monorepo, CI and phone/browser previews (days 1–2), then the ingredients, original-label and compare screens, the installable web app, error reporting, and end-to-end tests on phone and browser. Launch work is not yours: it is a whole-team phase after the app is finished (`2026-11-04-okbite-launch.md`).

**Owns (only this role edits these paths):** repo root config, `.github/`, `AGENTS.md`, `CLAUDE.md`, `apps/mobile/app.config.ts`, `apps/mobile/eas.json`, `apps/mobile/public/`, `apps/mobile/app/+html.tsx`, `apps/mobile/app/product/[id]/ingredients.tsx`, `apps/mobile/app/product/[id]/label.tsx`, `apps/mobile/app/(tabs)/compare.tsx`, `apps/mobile/src/features/compare/`, `apps/mobile/src/lib/errorReporter.ts`, `supabase/functions/client-error/`, `.maestro/`, `e2e-web/`

**Tasks in order:** D1 → D2 → D7 → B5 → D9 → D6

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Role-specific: D1 and D2 block every other role, so do them first on 4 Nov. Day 1 also: Expo and Supabase accounts (D2 step 4). The Apple developer account comes from the professor; ask for access to its App Store Connect team when the launch phase starts. You are the only role that changes native permissions, plugins and build profiles: other roles ask you. B5 builds on R4's B4 (`useProduct`, UI kit): use them, do not edit them.

## Review Focus (owned here)

- In iOS Safari there is no on-device barcode reading: the web build must still complete the photo flow through `identify` (D9 Playwright).
- Ingredients missing from the knowledge base show "Explicație în curând", never an empty row (B5).
- Comparing products of different categories shows a message, never a misleading table (B5).

---

### Task D1: Expo monorepo scaffold (fully specified)

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.nvmrc`
- Create: `apps/mobile/` (from the Expo template), `apps/mobile/app.config.ts`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`, `apps/mobile/jest.config.js`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/vitest.config.ts`
- Test: `apps/mobile/app/__tests__/index.test.tsx`, `packages/shared/src/index.test.ts`
- Keep unchanged: `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/`

**Interfaces:**
- Produces: root scripts `pnpm dev` (`expo start` in apps/mobile), `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm e2e` (filled in by D6), `pnpm sync-shared` (filled in by C3); package names `mobile` and `@okbite/shared`; the app imports shared code as `import { … } from '@okbite/shared'`.

- [ ] **Step 1: Root workspace files**

`package.json`:
```json
{
  "name": "okbite",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "pnpm --filter mobile start",
    "test": "pnpm -r test",
    "lint": "eslint .",
    "typecheck": "pnpm -r typecheck",
    "e2e": "echo \"set up in D6\" && exit 1",
    "sync-shared": "echo \"set up in C3\" && exit 1",
    "format": "prettier --write ."
  }
}
```
`pnpm-workspace.yaml`: `packages: ["apps/*", "packages/*"]`. `.npmrc`: `node-linker=hoisted` (React Native needs a flat `node_modules`). `.nvmrc`: `22`. `.gitignore`: `node_modules`, `.expo`, `dist`, `ios`, `android`, `.env*` except `.env.example`, `supabase/.temp`, `*.jks`, `*.p8`, `*.p12`, `*.mobileprovision`. `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `target ES2022`, `moduleResolution Bundler`, `skipLibCheck`.

- [ ] **Step 2: `packages/shared` with a failing test**

`package.json`: name `@okbite/shared`, `"main": "src/index.ts"`, scripts `test: vitest run`, `typecheck: tsc --noEmit`; dependency `zod@^3.23`.
```ts
// packages/shared/src/index.test.ts
import { it, expect } from 'vitest';
import { APP_NAME } from './index';
it('exports the app name', () => { expect(APP_NAME).toBe('OkBite'); });
```
Run: `pnpm install && pnpm --filter @okbite/shared test` → Expected: FAIL. Add `export const APP_NAME = 'OkBite';` → Expected: PASS.

- [ ] **Step 3: Expo app with a failing test**

Run `pnpm create expo-app@latest apps/mobile --template default` and delete the template's example screens and components. Package name `mobile`; add `@okbite/shared: workspace:*`, scripts `start: expo start`, `test: jest`, `typecheck: tsc --noEmit`; dev dependencies `jest-expo`, `@testing-library/react-native`.
```tsx
// apps/mobile/app/__tests__/index.test.tsx
import { renderRouter, screen } from 'expo-router/testing-library';
it('shows the app name on the home route', async () => {
  renderRouter({ index: require('../index').default });
  expect(await screen.findByRole('header', { name: 'OkBite' })).toBeTruthy();
});
```
Run: `pnpm --filter mobile test` → Expected: FAIL.

- [ ] **Step 4: Minimal screen and app config**

`app/index.tsx` renders `<Text accessibilityRole="header">OkBite</Text>` (B1 replaces it). `app.config.ts`: `name: 'OkBite'`, `slug: 'okbite'`, `scheme: 'okbite'`, `version: '1.0.0'`, `userInterfaceStyle: 'automatic'`, `ios: { bundleIdentifier: 'md.okbite.app', supportsTablet: false }`, `android: { package: 'md.okbite.app' }`, `plugins: ['expo-router', ['expo-camera', { cameraPermission: 'OkBite folosește camera ca să fotografieze produsul și eticheta lui.', recordAudioAndroid: false }], ['expo-image-picker', { photosPermission: 'OkBite deschide galeria ca să alegi o poză a produsului sau a etichetei.' }], 'expo-sqlite', 'expo-secure-store']`, `extra: { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL, supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY }`. Install the native modules with `npx expo install expo-camera expo-image-picker expo-image-manipulator expo-sqlite expo-secure-store`, and web support with `npx expo install react-native-web react-dom @expo/metro-runtime`; set `web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png' }` and add the script `web: expo export -p web` (output `apps/mobile/dist`). Placeholder icon and splash: brand green `#1F4A35` with a white check mark (A replaces them in A5).
Run: `pnpm --filter mobile test` → Expected: PASS. Run `pnpm dev`, open in Expo Go on an iPhone and an Android phone → Expected: "OkBite" on screen. Run `pnpm --filter mobile web` → Expected: `apps/mobile/dist/index.html` exists; `npx serve apps/mobile/dist` shows "OkBite" in a phone-sized browser window.

- [ ] **Step 5: Lint and format**

`eslint.config.js`: `eslint-config-expo/flat` + `typescript-eslint` recommended, ignoring `.expo`, `supabase/functions/_shared`. `.prettierrc`: `{ "singleQuote": true, "semi": true, "printWidth": 100 }`.
Run: `pnpm lint && pnpm typecheck && pnpm test` → Expected: exit 0.

- [ ] **Step 6: Commit and PR** — `chore: scaffold Expo monorepo with shared package`. PR `D1: Expo monorepo scaffold`; after merge tell the team the other P0 tasks can start.

---

### Task D2: CI, EAS profiles and phone previews (fully specified)

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/preview.yml`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, `apps/mobile/eas.json`, `apps/mobile/.env.example`

**Interfaces:**
- Produces: required check `ci`; a QR code comment on each PR that opens that PR's JS bundle; EAS profiles `development`, `preview`, `production`; env names `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 1: `ci.yml`** — on `pull_request` and `push` to `main`: checkout, `pnpm/action-setup@v4`, `actions/setup-node@v4` (`node-version-file: .nvmrc`, `cache: pnpm`), `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`; also `denoland/setup-deno@v2` and `deno test --allow-all supabase/functions/ --ignore=supabase/functions/_shared` once functions exist. Job name `ci`.
- [ ] **Step 2: `eas.json`** — `development` (`developmentClient: true`, `distribution: internal`, channel `development`), `preview` (`distribution: internal`, channel `preview`, staging env), `production` (`autoIncrement: true`, channel `production`, prod env). `preview.yml`: on `pull_request`, `expo/expo-github-action@v8` with `EXPO_TOKEN`, then `expo/expo-github-action/preview@v8` with `command: eas update --auto --branch pr-${{ github.event.number }}`, which comments a QR code.
- [ ] **Step 2b: Web previews** — `ci.yml` also runs `pnpm --filter mobile web`. Cloudflare Pages (human connects the repo): build command `pnpm install && pnpm --filter mobile web`, output `apps/mobile/dist`, env `NODE_VERSION=22` plus the `EXPO_PUBLIC_*` staging values for previews and prod values for `main`; add a `_redirects` file in `apps/mobile/public/` with `/* /index.html 200` so deep links like `/product/<id>` load. Each PR then shows a browser preview link next to the QR code.
- [ ] **Step 3: Development build** — `eas build --profile development --platform all`; share the install links in the team chat so everyone can test camera features on their own phone.
- [ ] **Step 4: Human setup (R1, 4 Nov)** — 1) Expo account + `EXPO_TOKEN` GitHub secret. 2) Google Play Console registration can wait for the launch phase; the Apple account is the professor's (request App Store Connect access before 2 Dec). 3) Supabase projects `okbite-staging` and `okbite-prod`; staging keys into the EAS `preview` env and prod keys into `production`. 4) Protect `main`: PR required, 1 approval, `ci` passing, CODEOWNERS review.
- [ ] **Step 5: `CODEOWNERS` and PR template** — role paths from the overall plan mapped to placeholder handles `@role-r1` … `@role-r5` (the team replaces them). Template: task ID, acceptance checklist, "AI review by: Claude / Codex", "Tested on: iPhone / Android".
- [ ] **Step 6: Verify and commit** — this PR shows the `ci` check and a preview QR code that opens on both phones. `ci: checks, EAS profiles and PR previews`

---

### Task D7: Error reporting and usage stats

**Files:**
- Create: `supabase/functions/client-error/index.ts`, `apps/mobile/src/lib/errorReporter.ts`, `docs/ops/stats.sql`
- Test: `apps/mobile/src/lib/errorReporter.test.ts`

**Interfaces:**
- Consumes: table `client_errors`, view `daily_stats` (C2). Produces: `installErrorReporter(): void`. `app/_layout.tsx` belongs to R4: add the one-line call there in this PR and ask R4 to review that line.

- [ ] **Step 1: Failing test** — an uncaught JS error (ErrorUtils global handler) sends one POST with message, stack (≤ 2000 chars), screen, app version, platform; the same error within 60 s is sent once.
- [ ] **Step 2: Implement** reporter and function (validate, 50/day/device, insert). Run → PASS.
- [ ] **Step 3:** `docs/ops/stats.sql` — daily photos, identified, not found, added, read-label calls, top errors.
- [ ] **Step 4: Commit** — `feat: client error reporting and usage stats queries`

---

### Task B5: Ingredients, label and compare screens

**Files:**
- Create: `apps/mobile/app/product/[id]/ingredients.tsx`, `apps/mobile/app/product/[id]/label.tsx`, `apps/mobile/app/(tabs)/compare.tsx` (replace placeholder), `apps/mobile/src/features/compare/compare.ts`, `ProductPicker.tsx`
- Test: `apps/mobile/src/features/product/ingredients.test.tsx`, `apps/mobile/src/features/compare/compare.test.ts`

**Interfaces:**
- Produces: `compareRows(a: Product, b: Product): { key: NutrientKey; a: number|null; b: number|null; better: 'a'|'b'|null }[]` — lower is better for kcal, fat, sat, sugar, salt; higher for protein, fiber; `null` if either side is missing or equal.

- [ ] **Step 1: Failing tests** — ingredients grouped base, fat, taste, add, cult (names from `ro`), each row expands to role, explanation and "Sursa explicației"; ingredients with `slug: null` show `ro.ingredients.explanationSoon`; `compareRows` for yogurts 014 vs 021: sugar → `a`, protein → `a`; different categories → `ro.compare.otherCategory` and no table.
- [ ] **Step 2: Implement** — ingredients and label screens per the prototype; compare tab: pick A and B from history (same category first) or "Fotografiază alt produs".
- [ ] **Step 3: Verify and commit** — tests PASS; `feat(mobile): ingredients explained, original label and compare`

---

### Task D9: Web app — PWA install, offline shell, browser tests, okbite.md

**Files:**
- Create: `apps/mobile/public/manifest.webmanifest`, `apps/mobile/public/_redirects` (if not done in D2), `apps/mobile/workbox-config.cjs`, `apps/mobile/app/+html.tsx`, `e2e-web/playwright.config.ts`, `e2e-web/flows.spec.ts`
- Modify: `apps/mobile/package.json` (`"web": "expo export -p web && workbox generateSW workbox-config.cjs"`), root `package.json` (`"e2e:web": "playwright test -c e2e-web"`), `.github/workflows/ci.yml` (web e2e job)

**Interfaces:**
- Consumes: the web variants from B1, B2, B6, B8; seeded products (C2).
- Produces: an installable web app at `https://okbite.md` that opens offline to the shell and history.

- [ ] **Step 1: Failing Playwright specs** (device profiles "iPhone 13" and "Pixel 7", against `npx serve apps/mobile/dist` + staging): manual code `4840001000014` → result shows "Lapte"; gallery upload of the test front photo → identify flow; unknown product → add flow with two uploaded label photos → result with "Neverificat"; offline (`context.setOffline(true)`) → history still opens; the manifest is linked and has name "OkBite", `display: standalone`, 192 and 512 icons.
- [ ] **Step 2: Implement** — `+html.tsx` adds the manifest link, theme colour, `apple-mobile-web-app-capable`, and the apple-touch-icon; Workbox precaches the exported bundle and fonts and uses NetworkFirst for function calls (never caching POSTs); the service worker is registered only on web.
- [ ] **Step 3: Verify** — Playwright PASS; Lighthouse (mobile) on the preview URL: PWA installable, accessibility ≥ 95; on a real iPhone (Safari) and Android (Chrome): add to home screen, photo flow works, history opens in airplane mode.
- [ ] **Step 4 (human):** point `okbite.md` DNS to Cloudflare Pages (production branch `main`), HTTPS on.
- [ ] **Step 5: Commit** — `feat(web): installable web app with offline shell and browser tests`

---

### Task D6: Maestro end-to-end flows

**Files:**
- Create: `.maestro/known-by-photo.yaml`, `.maestro/known-by-code.yaml`, `.maestro/add-unknown.yaml`, `.maestro/offline-history.yaml`, `.maestro/media/` (test photos), `scripts/push-test-media.sh`
- Modify: root `package.json` (`"e2e": "maestro test .maestro"`)

**Interfaces:**
- Consumes: seeded products (C2), the gallery entry on the capture screen (B2), the copy in `ro.ts` (A1) for selectors.

- [ ] **Step 1: Test media** — photos of a seeded product's barcode side and front, and of an unknown product's label; `push-test-media.sh` adds them to the iOS simulator (`xcrun simctl addmedia`) or Android emulator (`adb push` + media scan).
- [ ] **Step 2: Flows** — known by photo (gallery → barcode side → result shows "Lapte"); known by code (manual `4840001000014`); unknown (gallery → front → "Nu avem încă acest produs" → two label photos → review → save → result with "Neverificat"); offline history (airplane mode → history still opens the yogurt).
- [ ] **Step 3: Run** on a development build against staging → all pass once B4, B6, B7 are merged. Document the run command in the PR.
- [ ] **Step 4: Commit** — `test(e2e): Maestro flows for photo, code, add and offline`
