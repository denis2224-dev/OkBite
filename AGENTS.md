# OkBite — instructions for AI agents (Claude Code and Codex)

OkBite is a Romanian-language mobile app for iPhone and Android (Expo / React Native, published in the App Store and Google Play) for shoppers in Moldova: photograph a product, and if it is in the database see its allergens, a 0–100 nutrition score with reasons, ingredients explained and comparisons; if it is not, photograph the label, get the analysis, and the product is added to the database. Barcode scanning is an alternative entry.

## Read first, in this order

1. `docs/superpowers/specs/2026-11-03-okbite-design.md` — what we build.
2. `docs/superpowers/plans/2026-11-03-okbite-overall.md` — lanes, folder owners, global constraints, dependencies.
3. Your lane plan in `docs/superpowers/plans/` — the tasks you implement, with superpowers:executing-plans.
4. `docs/prototype/Main.dc.html` — the clickable prototype: exact screens, copy, colours and demo data.

## Working rules

1. One task, one branch, one PR, at most about 400 changed lines. Branch name: `<task-id>-<short-name>` (e.g. `B3-result-screen`).
2. Work in your own git worktree; never share a working folder with another agent session.
3. Tests first: write the failing test from the task, see it fail, then implement. Do not weaken or delete a test to make it pass.
4. Cross-review: work written with Claude gets a Codex review, work written with Codex gets a Claude review, then one human approves.
5. Only Lane C edits `packages/shared/src/contract.ts` and `supabase/migrations/`. If your task needs a contract change, stop and ask.
6. No fact without a source: allergens, ingredient explanations and score rules must cite a source a human has opened. Never invent nutrition values, products or sources.
7. Stay inside your lane's folders (see the overall plan). If a task needs a file another lane owns, stop and ask.

## Commands

- `pnpm install` · `pnpm dev` (Expo dev server; open in Expo Go or the development build) · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm e2e` (Maestro)
- `eas build --profile development|preview|production` · `eas update` (Lane D owns `app.config.ts` and `eas.json`)
- `pnpm sync-shared` after any change in `packages/shared/src/` (regenerates `supabase/functions/_shared/`, never edit that folder)
- `supabase start` · `supabase db reset` · `supabase test db` · `deno test supabase/functions/<name>/`

## Conventions

- TypeScript strict; named exports; one component per file; files under ~200 lines.
- All UI text comes from `apps/mobile/src/copy/ro.ts`; Romanian diacritics with comma-below (ș, ț).
- Every pressable has `accessibilityRole` and a Romanian `accessibilityLabel`; screens work in dark mode and at 200% font size.
- No payment or subscription code: pricing is not decided.
- Validate every API request and response with the Zod schemas from `@okbite/shared`.
- Numbers shown to users use a decimal comma (`13,2 g`); stored values are per 100 g or 100 ml.
- Never display the Nutri-Score logo. Always show "Calculat la 100 g; nu indică riscul unei boli." next to a score.
- Secrets only in environment settings; never commit `.env*` except `.env.example`.

## Definition of done

The task's acceptance steps pass, `pnpm lint && pnpm typecheck && pnpm test` is green, the other tool's AI review is addressed, the change was checked on a real iPhone and a real Android phone if it touches the UI, and the task box is ticked in the lane plan.
