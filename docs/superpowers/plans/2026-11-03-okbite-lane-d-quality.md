# OkBite Lane D (Labels, Quality, Release) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md` and `docs/superpowers/plans/2026-11-03-okbite-overall.md` (Global Constraints, Review Focus, dependencies) before Task 1.

**Goal:** Give the team a working monorepo with CI and preview deploys on day one, then build the allergen matcher, the label-reading function, the end-to-end tests and the release.

**Architecture:** pnpm workspace with `apps/web` and `packages/shared`; GitHub Actions for checks; Cloudflare Pages for hosting with one preview per PR; two Supabase projects (`okbite-staging` for previews, `okbite-prod` for production). `read-label` is a Deno Edge Function that stores the photos and asks Claude Haiku for structured JSON.

**Tech Stack:** Node 22, pnpm 9, TypeScript 5, Vite 6, React 18, vite-plugin-pwa, Vitest, ESLint 9 (flat config, typescript-eslint), Prettier, Playwright, Supabase CLI, Deno, Anthropic Messages API.

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Lane-specific: D1 and D2 block every other lane, so do them first on 4 Nov. After D1 merges, `apps/web/**` belongs to Lane B (except `apps/web/src/lib/errorReporter.ts`, which stays with D).

## Review Focus (owned here)

- Decimal commas ("0,3") from the model become numbers; blank or unreadable values become `null` and are listed in `unclear` (D4).
- Bodies over 2 MB are rejected with `bad_request` before any upload or API call (D4).
- "unt de cacao" must not be detected as milk; "poate conține" traces go to `mayContain`, not `allergens` (D3).

---

### Task D1: Repo scaffold (fully specified)

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.nvmrc`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/public/icon.svg`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/test/setup.ts`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/vitest.config.ts`
- Test: `apps/web/src/App.test.tsx`, `packages/shared/src/index.test.ts`
- Keep unchanged: `AGENTS.md`, `CLAUDE.md`, `docs/` (already in the repo)

**Interfaces:**
- Produces: root scripts `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm e2e`, `pnpm sync-shared` (the last two are filled in by D5 and C3); workspace package names `web` and `@okbite/shared`; web imports shared as `import { … } from '@okbite/shared'`.

- [ ] **Step 1: Root workspace files**

`package.json`:
```json
{
  "name": "okbite",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "eslint .",
    "typecheck": "pnpm -r typecheck",
    "e2e": "echo \"set up in D5\" && exit 1",
    "sync-shared": "echo \"set up in C3\" && exit 1",
    "format": "prettier --write ."
  }
}
```
`pnpm-workspace.yaml`: `packages: ["apps/*", "packages/*"]`. `.nvmrc`: `22`. `.gitignore`: `node_modules`, `dist`, `.env*` except `.env.example`, `playwright-report`, `test-results`, `supabase/.temp`, `.DS_Store`. `tsconfig.base.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`, `jsx: react-jsx`, `skipLibCheck: true`.

- [ ] **Step 2: `packages/shared` with a failing test**

`packages/shared/package.json`: name `@okbite/shared`, `"type": "module"`, `"main": "src/index.ts"`, scripts `test: vitest run`, `typecheck: tsc --noEmit`, `build: tsc --noEmit`; dependency `zod@^3.23`; devDependencies `vitest`, `typescript`.

`packages/shared/src/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { APP_NAME } from './index';
describe('shared', () => { it('exports the app name', () => { expect(APP_NAME).toBe('OkBite'); }); });
```
Run: `pnpm install && pnpm --filter @okbite/shared test` → Expected: FAIL (`APP_NAME` not exported). Then add `export const APP_NAME = 'OkBite';` to `src/index.ts` → Expected: PASS.

- [ ] **Step 3: `apps/web` with a failing test**

`apps/web/package.json`: name `web`, scripts `dev: vite`, `build: tsc -b && vite build`, `preview: vite preview`, `test: vitest run`, `typecheck: tsc --noEmit`; dependencies `react@^18.3`, `react-dom@^18.3`, `react-router-dom@^6.28`, `@okbite/shared: workspace:*`; devDependencies `vite@^6`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/react`, `@types/react-dom`, `typescript`.

`apps/web/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';
it('shows the app name', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'OkBite' })).toBeInTheDocument();
});
```
Run: `pnpm --filter web test` → Expected: FAIL (no `App`).

- [ ] **Step 4: Minimal app and PWA config**

`App.tsx` exports `App` rendering `<h1>OkBite</h1>` (B1 replaces it). `main.tsx` mounts it into `#root`. `vite.config.ts`: plugins `react()` and `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'OkBite', short_name: 'OkBite', lang: 'ro', start_url: '/', display: 'standalone', background_color: '#F7F3EA', theme_color: '#1F4A35', icons: [192, 512 PNG + maskable] } })`; `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }` (setup imports `@testing-library/jest-dom/vitest`). `index.html` has `<html lang="ro">`, viewport meta, title `OkBite`. Draw a simple `public/icon.svg` (a check mark inside a bite-shaped circle, brand green `#1F4A35`) and generate PNGs: `pnpm dlx @vite-pwa/assets-generator --preset minimal-2023 apps/web/public/icon.svg`.

Run: `pnpm --filter web test` → Expected: PASS. Run: `pnpm build` → Expected: `apps/web/dist/manifest.webmanifest` exists.

- [ ] **Step 5: Lint and format**

`eslint.config.js`: `typescript-eslint` recommended + `eslint-plugin-react-hooks` recommended, ignoring `dist`, `supabase/functions/_shared`, `playwright-report`. `.prettierrc`: `{ "singleQuote": true, "semi": true, "printWidth": 100 }`.

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → Expected: all exit 0.

- [ ] **Step 6: Commit and open the PR**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo with web app and shared package"
```
PR title: `D1: Repo scaffold`. After merge, tell the team in the chat that P0 lanes can start.

---

### Task D2: CI and preview deploys (fully specified)

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, `apps/web/.env.example`

**Interfaces:**
- Produces: required check named `ci`; preview URL per PR from Cloudflare Pages; env var names `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FUNCTIONS_URL`.

- [ ] **Step 1: Workflow**

`ci.yml` runs on `pull_request` and `push` to `main`: checkout, `pnpm/action-setup@v4`, `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: pnpm`, `pnpm install --frozen-lockfile`, then `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Job name `ci`.

- [ ] **Step 2: Ownership and PR template**

`CODEOWNERS` maps the lane paths from the overall plan's table to placeholder GitHub handles `@lane-a`, `@lane-b`, `@lane-c`, `@lane-d` (the team replaces them with real logins). The PR template has: task ID, acceptance criteria checklist copied from the plan, "AI review by: Claude / Codex", "Tested on phone: yes/no".

- [ ] **Step 3: Verify CI on this PR**

Push the branch, open PR `D2: CI and previews`. Expected: the `ci` check runs and passes.

- [ ] **Step 4: Human setup (done by the Lane D person, not the agent)**

1. Cloudflare Pages → connect the GitHub repo; build command `pnpm --filter web build`; output `apps/web/dist`; env `NODE_VERSION=22`; previews on for all branches.
2. Create Supabase projects `okbite-staging` and `okbite-prod`; put staging URL/keys into Cloudflare preview env and prod into production env; copy names into `.env.example` (values empty).
3. GitHub → Settings → Branches → protect `main`: require PR, 1 approval, `ci` passing, CODEOWNERS review.

Expected: the D2 PR shows a Cloudflare preview link.

- [ ] **Step 5: Commit**

```bash
git add .github apps/web/.env.example
git commit -m "ci: add checks, code owners and PR template"
```

---

### Task D3: Allergen matcher

**Files:**
- Create: `packages/shared/src/allergens/index.ts`, `packages/shared/src/allergens/synonyms.ts`
- Test: `packages/shared/src/allergens/index.test.ts`
- Modify: `packages/shared/src/index.ts` (re-export)

**Interfaces:**
- Consumes: `Allergen`, `ALLERGENS` from `contract.ts` (C1).
- Produces: `detectAllergens(text: string): { allergens: Allergen[]; mayContain: Allergen[] }` — results in `ALLERGENS` order, no duplicates.

- [ ] **Step 1: Write the failing tests** (the human owner writes or checks every case)

```ts
it.each([
  ['lapte normalizat, culturi lactice vii', ['Lapte'], []],
  ['făină de grâu, zahăr, lecitină din soia', ['Gluten', 'Soia'], []],
  ['ciocolată (zahăr, unt de cacao, masă de cacao)', [], []],
  ['FAINA DE GRAU, OUA', ['Gluten', 'Ouă'], []],
  ['zahăr. Poate conține urme de arahide și susan.', [], ['Arahide', 'Susan']],
  ['ovăz 32%, lapte praf. Poate conține: ouă.', ['Gluten', 'Lapte'], ['Ouă']],
])('%s', (text, allergens, may) => {
  expect(detectAllergens(text)).toEqual({ allergens, mayContain: may });
});
```
Run: `pnpm --filter @okbite/shared test allergens` → Expected: FAIL.

- [ ] **Step 2: Implement**

Normalize to lower case and strip Romanian diacritics before matching. Split the text at the first "poate conține" / "poate contine" / "urme de" phrase: before → `allergens`, after → `mayContain`. `synonyms.ts` maps each allergen to Romanian keywords (grâu, ovăz, orz, secară, gluten → Gluten; lapte, lactoză, smântână, unt (but not "unt de cacao"), brânză, zer, cazeină → Lapte; …) and each list carries a comment naming its source, Reg. (UE) nr. 1169/2011, Anexa II.

- [ ] **Step 3: Verify** — Run the same command → Expected: PASS. Human owner reviews `synonyms.ts` against the regulation before the PR.

- [ ] **Step 4: Commit** — `feat(shared): detect allergens and may-contain traces in Romanian text`

---

### Task D4: `read-label` function

**Files:**
- Create: `supabase/functions/read-label/index.ts`, `supabase/functions/read-label/extract.ts`, `supabase/functions/read-label/prompt.ts`
- Test: `supabase/functions/read-label/extract.test.ts`, `supabase/functions/read-label/index.test.ts`

**Interfaces:**
- Consumes: `ReadLabelRequest`, `ReadLabelResponse`, `Nutrients` from `_shared/contract.ts`; from C3's `supabase/functions/_lib/http.ts`: `json(body, status?)`, `fail(error: ErrorCode, message, status)`, `readDeviceId(req): string`, `checkRateLimit(deviceId, kind: 'read_label', max: number): Promise<boolean>`, `logEvent(kind, deviceId, code?)`, `adminClient()`.
- Produces: `POST /functions/v1/read-label` returning `ReadLabelResponse`; `parseModelOutput(raw: string): Omit<ReadLabelResponse, 'ingredientsPhotoPath' | 'nutritionPhotoPath'>` in `extract.ts`.

- [ ] **Step 1: Failing tests for `parseModelOutput`** (Deno test): valid JSON → nutrients as numbers; `"salt": "0,3"` → `0.3`; `"sugar": ""` → `null` and `'sugar'` in `unclear`; text around the JSON (```json fences) still parses; non-JSON → throws `UpstreamError`.
Run: `deno test supabase/functions/read-label/` → Expected: FAIL.

- [ ] **Step 2: Implement `parseModelOutput`**, then run → Expected: PASS.

- [ ] **Step 3: Failing tests for the handler** (mock `fetch` and storage): body > 2 MB → 400 `bad_request` with no upload; invalid body → 400; 21st call in 24 h from one device → 429 `rate_limited`; model failure → 502 `upstream_failed`; success → 200 with both photo paths under `uploads/<deviceId>/`.

- [ ] **Step 4: Implement the handler**

Order: size check → validate with `ReadLabelRequest` → rate limit (20/24 h) → upload both JPEGs to the private `uploads` bucket as `<deviceId>/<uuid>-ingredients.jpg` and `-nutrition.jpg` → call `POST https://api.anthropic.com/v1/messages` with headers `x-api-key: ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, body `model: "claude-haiku-5-5"`, `max_tokens: 1500`, one user message with both images (base64 JPEG) and the prompt from `prompt.ts` → `parseModelOutput` → `logEvent('read_label')` → respond. The prompt asks for Romanian ingredients text exactly as printed and nutrition per 100 g/ml as JSON with keys `ingredientsText, unit, kcal, fat, sat, sugar, salt, protein, fiber, fruitVegPct`, empty string when unreadable, nothing else.

Run: `deno test supabase/functions/read-label/` → Expected: PASS.

- [ ] **Step 5: Grade on real photos (human + agent)** — Serve locally (`supabase functions serve read-label`), run it on 30 real label photo pairs from the shop runs, and record per field: correct / wrong / null. Put the table in the PR. Target: ≥ 90% of fields correct or correctly null.

- [ ] **Step 6: Spend cap** — Lane D person sets a monthly limit on the Anthropic key in the console and adds `ANTHROPIC_API_KEY` to both Supabase projects' function secrets.

- [ ] **Step 7: Commit** — `feat(functions): read label photos with Claude into structured JSON`

---

### Task D5: End-to-end tests

**Files:**
- Create: `playwright.config.ts`, `e2e/scan-flow.spec.ts`, `e2e/offline.spec.ts`
- Modify: root `package.json` (`"e2e": "playwright test"`), `.github/workflows/ci.yml` (e2e job against local Supabase)

**Interfaces:**
- Consumes: seeded codes from C2 (`4840001000014` natural yogurt, `4840001000052` juice with missing data); `data-testid`-free selectors by role and the Romanian copy in `ro.ts`.

- [ ] **Step 1: Failing specs**: manual code `4840001000014` → confirm → result shows allergen "Lapte" and a score; `4840001000052` → "Scor indisponibil"; `4840001009995` → "Nu avem încă acest produs"; history lists the yogurt; offline (`context.setOffline(true)`) → history still renders.
- [ ] **Step 2:** Run `pnpm e2e` against `supabase start` + `pnpm dev` → Expected: pass once B3 and B6 are merged.
- [ ] **Step 3:** CI job `e2e` (Docker Supabase, `supabase db reset`, then Playwright), uploading the HTML report on failure.
- [ ] **Step 4: Commit** — `test(e2e): cover scan, not-found, insufficient data and offline history`

---

### Task D6: Usage events and error logging

**Files:**
- Create: `supabase/functions/client-error/index.ts`, `apps/web/src/lib/errorReporter.ts`, `docs/ops/stats.sql`
- Test: `apps/web/src/lib/errorReporter.test.ts`

**Interfaces:**
- Consumes: table `client_errors` and view `daily_stats` from C2.
- Produces: `installErrorReporter(): void` (B calls it once in `main.tsx`).

- [ ] **Step 1: Failing test**: an uncaught error triggers one POST to `client-error` with message, stack (first 2000 chars), route and app version; the same error within 60 s is not sent twice.
- [ ] **Step 2: Implement** reporter and function (validates, rate-limits 50/day/device, inserts). Run → Expected: PASS.
- [ ] **Step 3:** `docs/ops/stats.sql`: queries for daily scans, not-found rate, submissions, read-label calls and top errors.
- [ ] **Step 4: Commit** — `feat: report client errors and add usage stats queries`

---

### Task D7: Production release and launch-day watch

**Files:**
- Create: `docs/ops/release.md`

- [ ] **Step 1:** Write `release.md`: pre-flight checklist (all checkpoints ticked, migrations applied to prod with `supabase db push`, function secrets set, data loaders run against prod, Lighthouse run on the prod URL), rollback (Cloudflare "rollback to previous deployment", `supabase` migration down script), and who watches what on launch day.
- [ ] **Step 2 (human):** Point `okbite.md` DNS at Cloudflare Pages, enable HTTPS, set it as the production domain.
- [ ] **Step 3:** Run the checklist on 7 Dec; tag `v1.0.0` on 8 Dec.
- [ ] **Step 4: Commit** — `docs(ops): add release checklist and rollback plan`
