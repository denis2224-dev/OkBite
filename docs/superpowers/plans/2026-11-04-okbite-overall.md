# OkBite Overall Implementation Plan (5 people)

> **For agentic workers:** This file coordinates five role plans. Do not implement from this file. Open your role's plan and run it with superpowers:executing-plans (or superpowers:subagent-driven-development). Read this file first for the global rules, who owns which folders, and which other roles' tasks yours waits on.

**Goal:** Ship OkBite by 2026-12-08 as a native iPhone and Android app (App Store + Google Play) and as a web app for phone browsers (`https://okbite.md`, same code via Expo web): photograph a product, get its analysis if it is known, otherwise photograph the label, get the analysis and add the product to the database.

**Team:** 5 people. Everyone uses both Claude Code and Codex (see "How each person works").

**Architecture:** One pnpm monorepo: `apps/mobile` (Expo + Expo Router, also built for web), `packages/shared` (contract + pure logic), `supabase/` (Postgres with `pg_trgm`, Storage, Edge Functions, two of which call Claude for images), `data/` (hand-checked content). Roles own folders, so agents running in parallel do not edit the same files. The contract in `packages/shared/src/contract.ts` is written first and changes only through R2.

**Tech Stack:** Node 22, pnpm 9, TypeScript 5, Expo SDK (latest stable) with Expo Router and react-native-web, expo-camera, expo-image-manipulator, expo-sqlite, expo-secure-store, Zod 3, jest-expo, React Native Testing Library, Maestro and Playwright (end-to-end), EAS Build / Submit / Update, Cloudflare Pages, Supabase (Postgres 15, Deno Edge Functions, Storage, Auth), Anthropic API (`claude-haiku-5-5`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## How the work was split

The split comes from a knowledge graph of the spec and the previous plans, built with graphify (`graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.html`: 147 nodes, 427 edges, 8 communities). What it showed and what we did with it:

- **The most connected tasks gate everyone:** C1 contract (23 links), C2 schema (20), B1 app shell and API client (19). They are first in their owners' queues and due by 6–8 Nov.
- **The communities became roles.** Backend functions + moderation → R2. Reference data + score + the AI functions → R3. Copy, UI kit, results and history → R4. Photo capture and add flow → R5. Platform and CI → R1, which also takes the ingredients/label/compare screens off R4 (the busiest role) and builds the web app, so all five people write code from day one.
- **Launch is not a role.** Store listing, builds, submission and launch posts are a whole-team phase after the "App complete" checkpoint (`2026-11-04-okbite-launch.md`). The Apple developer account comes from the professor, so no store step is needed early.
- **Shared-file conflicts the graph found were removed.** B6 and B2 both edited `useCaptureFlow` (now R5 wires the queue in B2 step 2c). D7 and B1 both touched `_layout.tsx` (R1 adds one line with R4's review). C3 and C4 both write `score/index.ts` (C3 creates a stub, C4 replaces it). D2 and D9 both edit `ci.yml` (same person, R1).
- **The least cohesive area (photo capture and add flow, 0.12)** depends on R2, R3 and R4 at once, so R5 has fewer coding tasks and leads the field work (shop photo runs, beta).

## Roles

| Role | Person | Plan file | Tasks | Owns these paths | Reviews |
|---|---|---|---|---|---|
| R1 · Web, Quality and Product Details | [name] | `2026-11-04-okbite-r1-web-quality.md` | D1, D2, D7, B5, D9, D6 | root config, `.github/`, `AGENTS.md`, `CLAUDE.md`, `app.config.ts`, `eas.json`, `apps/mobile/public/`, `app/+html.tsx`, `app/product/[id]/{ingredients,label}.tsx`, `app/(tabs)/compare.tsx`, `src/features/compare/`, `src/lib/errorReporter.ts`, `functions/client-error/`, `.maestro/`, `e2e-web/` | R2 |
| R2 · Backend and Contract | [name] | `2026-11-04-okbite-r2-backend.md` | C1, C2, C3, C6, C7, C8 | `packages/shared/src/contract.ts`, `supabase/` (migrations, seed, `_lib` except `claude.ts`, lookup, add-product, report, moderate), `scripts/sync-shared.mjs`, admin screens, `docs/ops/moderation.md` | R3 |
| R3 · AI and Data | [name] | `2026-11-04-okbite-r3-ai-data.md` | D3, A3, C4, A2, C5, D4, D5 | `packages/shared/src/{score,ean,allergens}/`, `functions/{identify,read-label}/`, `functions/_lib/claude.ts`, `data/`, `scripts/{check-data,load-data,import-off}.ts` | R4 |
| R4 · App Foundation and Product Screens | [name] | `2026-11-04-okbite-r4-app-screens.md` | A1, B1, B4, B6, A4, B8 | app shell, tabs (except compare), `app/product/[id]/index.tsx`, info and offline routes; `src/{theme,ui,copy,lib}/` (except `errorReporter.ts`); `src/features/{product,history,offline,share,legal}/` | R5 |
| Launch (whole team) | all | `2026-11-04-okbite-launch.md` | A5 (R4), D8 (R1), A8 (R5) | `store/`, `docs/ops/release.md` | — |
| R5 · Capture, Contribution and Field Testing | [name] | `2026-11-04-okbite-r5-capture-field.md` | B2, B3, B7, A6, A7 | `app/{capture,scan,identify}.tsx`, `app/add/`, `src/features/{capture,scan,identify,add}/` | R1 |

Task IDs keep their original letters (A content, B app, C backend, D platform/AI) so every cross-reference in the plans stays valid.

**Shared human work (all five):** the 150 ingredient checks in A2 (30 each, 10–13 Nov), the shop photo runs in A6 (60 products each, 12–29 Nov), and real-phone testing at every checkpoint.

## How each person works (Claude Code + Codex)

1. `git pull` on `main`, then `git worktree add ../okbite-<task-id> -b <task-id>-<short-name>`.
2. **Build with one tool:** in that worktree tell Claude Code (or Codex) "Use superpowers:executing-plans to implement Task <ID> from docs/superpowers/plans/<your role file>. Read AGENTS.md and the spec first."
3. **Review with the other tool:** open the PR, then ask the other tool to review the diff (Codex reviews what Claude wrote and Claude reviews what Codex wrote, e.g. Claude's `/code-review` or Codex's review command). Fix what it finds.
4. **Run two agents in parallel when tasks allow it:** use a second worktree for an independent task of your own role (e.g. R3 runs D3 in Claude and A3's data prep in Codex). Never two agents in one worktree.
5. Test UI changes on a real phone (PR QR code) and in the phone's browser (PR web preview), then ask your reviewer role (table above) for approval. Merge, delete the worktree, and tick the task in your role file.

## Global Constraints

- All user-facing text is Romanian and comes from `apps/mobile/src/copy/ro.ts`; never hard-code copy in components.
- Every function request and response is validated with the Zod schemas in `packages/shared/src/contract.ts`.
- `supabase/functions/_shared/` is generated by `pnpm sync-shared`; never edit it by hand.
- Only R2 changes `contract.ts` and `supabase/migrations/`; others open an issue tagged `contract` and wait.
- Only R1 changes `app.config.ts`, `eas.json` and CI (permissions, bundle ids, build profiles, workflows).
- Never edit a path another role owns; ask that role, or open a PR they review.
- Platform differences go in `*.web.ts(x)` files with the same exports as the native file.
- No PR over about 400 changed lines (generated files and data JSON excepted).
- Tests first: every task starts with a failing test. CI (`pnpm lint && pnpm typecheck && pnpm test`) must pass before review.
- No fact without a source: ingredient explanations, allergen synonyms and score rules are drafted by agents but checked by a human against a cited source before merge.
- Secrets only in Supabase function secrets, EAS and Cloudflare environment settings; `.env*` is git-ignored except `.env.example`. Anthropic key name: `ANTHROPIC_API_KEY`. The app holds only the Supabase URL and anon key.
- Never show the Nutri-Score logo; always show "Calculat la 100 g; nu indică riscul unei boli." beside a score.
- Bundle id / package name: `md.okbite.app`. Device id header: `x-device-id`. Rate limits per spec §6.
- No payment or subscription code: pricing is not decided.

## Review Focus

Inputs the spec implies but feature tests could miss. Each has a test in the owning task.

- A blurred or angled barcode the phone cannot read: the photo still goes to `identify`, which may read the digits (B2, D4).
- In iOS Safari there is no on-device barcode reading: the photo goes straight to `identify`, live scan shows manual entry (B2 web, D9).
- A 12-digit UPC-A code from any source becomes the EAN-13 with a leading `0` (D3).
- Decimal commas ("0,3") parse as 0.3; blank stays `null`, never `0` (B7, D5).
- Any of kcal, sugar, sat or salt missing → "Date insuficiente", never a score of 0 (C4, B4).
- Two shoppers adding the same new barcode at once → one product (C6).

## Phases and dependencies

A task may start as soon as everything it waits on is merged to `main`.

### P0 · Foundation (4–8 Nov) — gate: the empty app opens in Expo Go on both phones and in the browser preview; CI green; contract, schema, copy and shell merged

| Order | Task | Role | Waits on |
|---|---|---|---|
| 1 | D1 Expo monorepo scaffold (4 Nov morning) | R1 | — |
| 1 | D2 step 4 (human): Expo and Supabase accounts (4 Nov) | R1 | — |
| 2 | D2 CI, EAS profiles, phone and web previews | R1 | D1 |
| 2 | C1 Contract (by 5 Nov) | R2 | D1 |
| 2 | A1 Romanian copy file | R4 | D1 |
| 2 | A3 Score test fixtures (human data, can start 4 Nov) | R3 | — |
| 3 | C2 Schema, RLS, search, seed (by 6 Nov) | R2 | C1 |
| 3 | D3 EAN normaliser and allergen matcher | R3 | C1 |
| 3 | B1 App shell, theme, UI kit, API client (by 8 Nov) | R4 | C1, A1 |
| 4 | C3 sync-shared, function helpers, `lookup` | R2 | C2 |

### P1 · Known products (9–15 Nov) — gate: a photo of a seeded product (barcode side or front) shows its result, ingredients and a comparison, in the app and in the browser

| Task | Role | Waits on |
|---|---|---|
| C4 Score engine | R3 | C1, A3 |
| A2 Categories and ingredient knowledge base (all five check 30 each) | R3 | C1 |
| C5 Data loaders and Open Food Facts import | R3 | C2, A2 |
| D4 `identify` function | R3 | C2, C3, D3 |
| B2 Capture, barcode in photo, live scan, manual entry | R5 | B1, D3 |
| B3 Identify flow screens | R5 | B2, D4 |
| B4 Result screen | R4 | B1, C3, C4 |
| B5 Ingredients, label and compare | R1 | B4 |
| B6 History and offline queue | R4 | B4 |
| D7 Error reporting and usage stats | R1 | C2, B1 |

### P2 · Unknown products (16–22 Nov) — gate: an unknown product is photographed, analysed and added; a second phone finds it by photo; a moderator verifies it

| Task | Role | Waits on |
|---|---|---|
| D5 `read-label` function | R3 | C3, D4 (`askClaude`) |
| C6 `add-product` and `report` | R2 | C3, C4, D3 |
| B7 Add flow (two shots, review, save, result) | R5 | B3, D5, C6 |
| B2 step 2c Offline photo queue | R5 | B6 |
| C7 Moderation function and admin screens | R2 | C6, B1 |
| A4 Legal and method screens | R4 | B1 |
| D6 Maestro end-to-end flows | R1 | B4, B6, B7 |
| A6 Shop photo runs (12–29 Nov, all five; R5 leads) | R5 | B7 for the second run |

### P3 · Hardening and beta (23 Nov–1 Dec) — gate "App complete": every task above merged, 25 testers used it (EAS preview builds + web preview, no store needed), zero open P1 bugs

| Task | Role | Waits on |
|---|---|---|
| D9 Web app: PWA, offline shell, Playwright, okbite.md | R1 | B7, B6 |
| B8 Accessibility, dark mode, sharing, polish | R4 | P2 gate |
| A7 Beta testers and feedback triage | R5 | P2 gate, D2 (preview builds) |
| C8 Backups and moderation routine | R2 | C7 |
| Bug fixes from the beta, each owner on their own paths | all | A7 issues |

### Launch phase (2–8 Dec, whole team, only after "App complete") — see `2026-11-04-okbite-launch.md`

| Task | Who | Waits on |
|---|---|---|
| Get access to the professor's Apple developer account; register Google Play (25 USD) | R1 | App complete |
| A5 Store listing texts, screenshots, privacy answers | R4 | App complete |
| D8 Production builds, store submission (2–3 Dec), release on 8 Dec | R1 | App complete, A5 |
| A8 Launch posts | R5 | D8 |

## Workload (coding tasks · human-heavy tasks)

| Role | Coding | Human-heavy | Busiest weeks |
|---|---|---|---|
| R1 | D1, D2, D7, B5, D9, D6 | store accounts (day 1) | 4 Nov–1 Dec |
| R2 | C1, C2, C3, C6, C7 | C8 moderation | 4–22 Nov |
| R3 | D3, C4, C5, D4, D5 | A2 drafts, A3 fixtures | 4–22 Nov |
| R4 | A1, B1, B4, B6, A4, B8 | — | 5 Nov–1 Dec |
| R5 | B2, B3, B7 | A6 lead, A7 lead | 9 Nov–1 Dec |

In the launch phase (2–8 Dec) R1 does the builds and submission, R4 the listing, R5 the posts; R2 and R3 watch moderation and AI costs.

## Checkpoints (whole team; at least one iPhone and one Android, in the app and in the browser)

- [ ] **8 Nov · P0:** empty app on both phones and in Safari/Chrome; `pnpm test` green on `main`; `lookup?code=4840001000014` returns the seeded yogurt; store enrolment submitted.
- [ ] **15 Nov · P1:** photo of a seeded product's barcode side and of its front both lead to the right result; ingredients, compare and history work; at least 50 imported products findable.
- [ ] **22 Nov · P2:** an unknown product is added from label photos, shown as "Neverificat", found by a second phone, verified by a moderator.
- [ ] **1 Dec · App complete:** all tasks merged, 300 products, 25 testers, zero open P1 bugs. Only now does the launch phase start.
- [ ] **3 Dec:** both store builds submitted for review.
- [ ] **8 Dec · Launch:** both stores and okbite.md public (or okbite.md first, stores when approved).

## Open decisions (owner: the team)

- App price / business model: not decided. Build free with no payment code; revisit after launch.
- Who pays Google Play registration (25 USD once), the okbite.md domain and the Anthropic API monthly cap (the Apple account comes from the professor).
- Whose name appears as the seller in the stores.
