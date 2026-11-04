# OkBite Lane D (AI, Quality, Release) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md` and `docs/superpowers/plans/2026-11-03-okbite-overall.md` (Global Constraints, Review Focus, dependencies) before Task D1.

**Goal:** Give the team a working Expo monorepo (iOS, Android and web) with CI and phone and browser previews on day one, then build the allergen matcher and barcode normaliser, the two AI functions (`identify`, `read-label`), end-to-end tests, error reporting, and the App Store and Google Play release.

**Architecture:** pnpm workspace with `apps/mobile` (Expo Router) and `packages/shared`; GitHub Actions for checks and EAS Update previews per PR; EAS Build and Submit for store builds; two Supabase projects (`okbite-staging`, `okbite-prod`). The AI functions are Deno Edge Functions that store the photo, ask Claude Haiku for strict JSON, and validate it against the contract.

**Tech Stack:** Node 22, pnpm 9, TypeScript 5, Expo SDK (latest stable), Expo Router, jest-expo, ESLint 9 (flat config) + Prettier, EAS CLI, Maestro, Supabase CLI, Deno, Anthropic Messages API.

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Lane-specific: D1 and D2 block every other lane, so do them first on 4 Nov. After D1 merges, `apps/mobile/**` belongs to Lane B, except `app.config.ts`, `eas.json` and `src/lib/errorReporter.ts`, which stay with D. You also own `packages/shared/src/ean/` and `packages/shared/src/allergens/` (D3) and `supabase/functions/{identify,read-label,client-error}/`.

## Review Focus (owned here)

- A barcode the on-device scan missed but Claude read (angled, blurred) must still lead to lookup by code when its checksum is valid; invalid digits are ignored, never trusted (D4).
- Decimal commas ("0,3") from the model become numbers; blank or unreadable values become `null` and are listed in `unclear` (D5).
- Bodies over 2 MB are rejected with `bad_request` before any upload or API call (D4, D5).
- "unt de cacao" is not milk; "poate conține" traces go to `mayContain` (D3).

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

- [ ] **Step 6: Commit and PR** — `chore: scaffold Expo monorepo with shared package`. PR `D1: Expo monorepo scaffold`; after merge tell the team P0 lanes can start.

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
- [ ] **Step 4: Human setup (Lane D person, 4 Nov)** — 1) Expo account + `EXPO_TOKEN` GitHub secret. 2) Enrol in the Apple Developer Program and register on Google Play Console (decide whose name is the seller; Apple can take several days). 3) Supabase projects `okbite-staging` and `okbite-prod`; staging keys into the EAS `preview` env and prod keys into `production`. 4) Protect `main`: PR required, 1 approval, `ci` passing, CODEOWNERS review.
- [ ] **Step 5: `CODEOWNERS` and PR template** — lane paths from the overall plan mapped to placeholder handles `@lane-a` … `@lane-d` (the team replaces them). Template: task ID, acceptance checklist, "AI review by: Claude / Codex", "Tested on: iPhone / Android".
- [ ] **Step 6: Verify and commit** — this PR shows the `ci` check and a preview QR code that opens on both phones. `ci: checks, EAS profiles and PR previews`

---

### Task D3: EAN normaliser and allergen matcher

**Files:**
- Create: `packages/shared/src/ean/index.ts`, `packages/shared/src/allergens/index.ts`, `packages/shared/src/allergens/synonyms.ts`
- Modify: `packages/shared/src/index.ts` (re-exports)
- Test: `packages/shared/src/ean/index.test.ts`, `packages/shared/src/allergens/index.test.ts`

**Interfaces:**
- Consumes: `Allergen`, `ALLERGENS` (C1).
- Produces: `normalizeCode(raw: string): string | null` (digits only; UPC-A 12 digits → EAN-13 with leading `0`; valid EAN-8/13 checksum or `null`); `detectAllergens(text: string): { allergens: Allergen[]; mayContain: Allergen[] }` (in `ALLERGENS` order, no duplicates).

- [ ] **Step 1: Failing tests**
```ts
it.each([
  ['4840001000014', '4840001000014'], ['036000291452', '0036000291452'], ['4840001000017', null],
  ['96385074', '96385074'], [' 4840001 000014 ', '4840001000014'], ['abc', null],
])('normalizeCode(%s)', (raw, out) => expect(normalizeCode(raw)).toBe(out));

it.each([
  ['lapte normalizat, culturi lactice vii', ['Lapte'], []],
  ['făină de grâu, zahăr, lecitină din soia', ['Gluten', 'Soia'], []],
  ['ciocolată (zahăr, unt de cacao, masă de cacao)', [], []],
  ['FAINA DE GRAU, OUA', ['Gluten', 'Ouă'], []],
  ['zahăr. Poate conține urme de arahide și susan.', [], ['Arahide', 'Susan']],
  ['ovăz 32%, lapte praf. Poate conține: ouă.', ['Gluten', 'Lapte'], ['Ouă']],
])('detectAllergens(%s)', (text, allergens, may) => expect(detectAllergens(text)).toEqual({ allergens, mayContain: may }));
```
Run: `pnpm --filter @okbite/shared test` → Expected: FAIL.
- [ ] **Step 2: Implement** — allergens: lower-case and strip diacritics, split at the first "poate conține / poate contine / urme de" (before → `allergens`, after → `mayContain`); `synonyms.ts` lists Romanian keywords per allergen with a comment citing Reg. (UE) nr. 1169/2011, Anexa II ("unt" counts as milk except in "unt de cacao").
- [ ] **Step 3: Verify** — PASS; the human owner checks `synonyms.ts` against the regulation.
- [ ] **Step 4: Commit** — `feat(shared): barcode normaliser and Romanian allergen matcher`

---

### Task D4: `identify` function

**Files:**
- Create: `supabase/functions/identify/index.ts`, `supabase/functions/identify/parseFront.ts`, `supabase/functions/identify/prompt.ts`, `supabase/functions/_lib/claude.ts`
- Test: `supabase/functions/identify/parseFront.test.ts`, `supabase/functions/identify/index.test.ts`

**Interfaces:**
- Consumes: `IdentifyRequest`, `IdentifyResponse`, `FrontRead` (C1); `normalizeCode` (D3); `_lib/http.ts`, `_lib/storage.ts`, `_lib/db.ts` (C3); SQL `search_products` (C2).
- Produces: `POST /functions/v1/identify` → `IdentifyResponse`; `askClaude(images: string[], prompt: string): Promise<string>` in `_lib/claude.ts` (D5 reuses it); `parseFront(raw: string): FrontRead`.

- [ ] **Step 1: Failing tests for `parseFront`** — JSON with brand/name/quantity → same values; `barcodeDigits: "4840001000014"` → `code: '4840001000014'`; digits failing the checksum → `code: null`; JSON inside ``` fences parses; non-JSON → throws `UpstreamError`.
- [ ] **Step 2: Implement `askClaude` and `parseFront`** — `POST https://api.anthropic.com/v1/messages`, headers `x-api-key: ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, body `model: "claude-haiku-5-5"`, `max_tokens: 800`, one user message with the image blocks (base64 JPEG) and the prompt. The front prompt asks for `{"brand","name","quantity","barcodeDigits"}` exactly as printed, empty string when not visible, nothing else.
- [ ] **Step 3: Failing handler tests** (mock `fetch`; local Supabase with seed) — body > 2 MB → 400 before any upload; 41st call in 24 h → 429; Claude reads a valid seeded code → `found` with that product; Claude reads "Zorel" + "Iaurt cu căpșuni" and no code → `candidates` with the strawberry yogurt first; unknown brand/name → `not_found` with `read` filled; Claude failure → 502 `upstream_failed`; every success includes `photoPath` under `uploads/<deviceId>/`.
- [ ] **Step 4: Implement the handler** — `readJsonBody` → rate limit (40) → `saveJpeg(front)` → `askClaude` → `parseFront` → code? `loadProduct({ code })` → found : `search_products(brand + ' ' + name)` → candidates or not_found → `logEvent('photo' | 'identified' | 'not_found')`.
- [ ] **Step 5: Grade on real photos** — 30 front photos of products already in the database (20 with barcode hidden): record found / right candidate / wrong in the PR. Target ≥ 80% right on the first screen.
- [ ] **Step 6: Commit** — `feat(functions): identify products from a photo with Claude and trigram search`

---

### Task D5: `read-label` function

**Files:**
- Create: `supabase/functions/read-label/index.ts`, `supabase/functions/read-label/parseLabel.ts`, `supabase/functions/read-label/prompt.ts`
- Test: `supabase/functions/read-label/parseLabel.test.ts`, `supabase/functions/read-label/index.test.ts`

**Interfaces:**
- Consumes: `ReadLabelRequest`, `ReadLabelResponse` (C1); `askClaude` (D4); `_lib/*` (C3).
- Produces: `POST /functions/v1/read-label` → `ReadLabelResponse`; `parseLabel(raw: string): Omit<ReadLabelResponse, 'ingredientsPhotoPath' | 'nutritionPhotoPath'>`.

- [ ] **Step 1: Failing tests for `parseLabel`** — valid JSON → numbers; `"salt": "0,3"` → `0.3`; `"sugar": ""` → `null` and `'sugar'` in `unclear`; `"ingredientsText": ""` → `null` and `'ingredientsText'` in `unclear`; fenced JSON parses; non-JSON → `UpstreamError`.
- [ ] **Step 2: Implement `parseLabel`**, run → PASS.
- [ ] **Step 3: Failing handler tests** — > 2 MB → 400; 21st call → 429; `nutritionImage: null` sends one image and returns `nutritionPhotoPath: null`; success → both paths under `uploads/<deviceId>/`; Claude failure → 502.
- [ ] **Step 4: Implement** — prompt asks for Romanian ingredients text exactly as printed and nutrition per 100 g/ml as JSON keys `ingredientsText, unit, kcal, fat, sat, sugar, salt, protein, fiber, fruitVegPct`, empty string when unreadable. Run → PASS.
- [ ] **Step 5: Grade on 30 real label photo pairs** — per field: correct / wrong / null; target ≥ 90% correct or correctly null; table in the PR.
- [ ] **Step 6: Spend cap (human)** — monthly limit on the Anthropic key; `ANTHROPIC_API_KEY` set in both Supabase projects' function secrets.
- [ ] **Step 7: Commit** — `feat(functions): read ingredients and nutrition tables from label photos`

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

---

### Task D7: Error reporting and usage stats

**Files:**
- Create: `supabase/functions/client-error/index.ts`, `apps/mobile/src/lib/errorReporter.ts`, `docs/ops/stats.sql`
- Test: `apps/mobile/src/lib/errorReporter.test.ts`

**Interfaces:**
- Consumes: table `client_errors`, view `daily_stats` (C2). Produces: `installErrorReporter(): void` (B calls it once in `app/_layout.tsx`).

- [ ] **Step 1: Failing test** — an uncaught JS error (ErrorUtils global handler) sends one POST with message, stack (≤ 2000 chars), screen, app version, platform; the same error within 60 s is sent once.
- [ ] **Step 2: Implement** reporter and function (validate, 50/day/device, insert). Run → PASS.
- [ ] **Step 3:** `docs/ops/stats.sql` — daily photos, identified, not found, added, read-label calls, top errors.
- [ ] **Step 4: Commit** — `feat: client error reporting and usage stats queries`

---

### Task D8: Store builds, beta tracks, submission and release

**Files:**
- Create: `docs/ops/release.md`
- Modify: `apps/mobile/app.config.ts` (final icon, splash, version), `apps/mobile/eas.json` (submit profiles)

- [ ] **Step 1: Beta (by 24 Nov)** — `eas build --profile production --platform all`, then `eas submit` to TestFlight and Google Play internal testing; add the A7 testers (TestFlight external testing needs a short Beta App Review).
- [ ] **Step 2: Store records** — App Store Connect and Play Console apps for `md.okbite.app`; fill in A5's texts, screenshots, privacy labels / data-safety answers, age rating, support email and privacy policy URL; price set to free (pricing undecided — see overall plan).
- [ ] **Step 3: Submit for review by 1 Dec** — release mode "manual" on both stores so the launch happens on 8 Dec together. If Apple rejects, fix and resubmit the same day.
- [ ] **Step 4: `release.md`** — pre-flight checklist (checkpoints ticked, migrations on prod with `supabase db push`, function secrets set, data loaded, Maestro green on prod build), hotfix path (`eas update --channel production` for JS-only fixes), rollback (republish the previous update; for native issues, halt the Play rollout and remove the iOS build from sale).
- [ ] **Step 5: Launch 8 Dec** — release both approved builds, tag `v1.0.0`, watch `daily_stats` and `client_errors` for the first 48 h.
- [ ] **Step 6: Commit** — `docs(ops): release checklist, hotfix and rollback`

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
