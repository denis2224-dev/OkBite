# OkBite — instructions for AI agents (Claude Code and Codex)

OkBite is a Romanian- and English-language mobile app for iPhone and Android (Expo / React Native, published in the App Store and Google Play) for shoppers in Moldova: photograph a product, and if it is in the database see its allergens, a 0–100 nutrition score with reasons, ingredients explained and comparisons; if it is not, photograph the label, get the analysis, and the product is added to the database. Barcode scanning is an alternative entry.

## Read first, in this order

1. `docs/superpowers/specs/2026-11-03-okbite-design.md` — what we build.
2. `docs/superpowers/plans/2026-11-04-okbite-overall.md` — the 5 roles, folder owners, global constraints, dependencies, how to use Claude Code and Codex together.
3. Your role plan (`docs/superpowers/plans/2026-11-04-okbite-r<N>-*.md`) — the tasks you implement, with superpowers:executing-plans.
4. `docs/prototype/Main.dc.html` — the clickable prototype: exact screens, copy, colours and demo data.

## Working rules

1. One task, one branch, one PR, at most about 400 changed lines. Branch name: `<task-id>-<short-name>` (e.g. `B3-result-screen`).
2. Work in your own git worktree; never share a working folder with another agent session.
3. Tests first: write the failing test from the task, see it fail, then implement. Do not weaken or delete a test to make it pass.
4. Cross-review: work written with Claude gets a Codex review, work written with Codex gets a Claude review, then one human approves.
5. Only R2 (Backend) edits `packages/shared/src/contract.ts` and `supabase/migrations/`. If your task needs a contract change, stop and ask.
6. No fact without a source: allergens, ingredient explanations and score rules must cite a source a human has opened. Never invent nutrition values, products or sources.
7. Stay inside your role's folders (see the overall plan). If a task needs a file another role owns, stop and ask.

## Commands

- `pnpm install` · `pnpm dev` (Expo dev server; open in Expo Go or the development build) · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm e2e` (Maestro)
- `eas build --profile development|preview|production` · `eas update` (R1 owns `app.config.ts` and `eas.json`)
- `pnpm sync-shared` after any change in `packages/shared/src/` (regenerates `supabase/functions/_shared/`, never edit that folder)
- `supabase start` · `supabase db reset` · `supabase test db` · `deno test supabase/functions/<name>/`

## Conventions

- TypeScript strict; named exports; one component per file; files under ~200 lines.
- UI text is Romanian and English via `apps/mobile/src/copy/ro.ts`, selected by the language module; catalogues live in `strings.ro.ts` and `strings.en.ts`. Use comma-below Romanian diacritics (ș, ț). Ingredient knowledge-base explanations stay Romanian for this release.
- The same app runs on iOS, Android and the web (Expo web at okbite.md). Put platform differences in `*.web.ts(x)` files with the same exports as the native file; no scattered `Platform.OS` checks.
- Every pressable has `accessibilityRole` and an `accessibilityLabel` from the selected-language copy; screens work in dark mode and at 200% font size.
- No payment or subscription code: pricing is not decided.
- Validate every API request and response with the Zod schemas from `@okbite/shared`.
- Numbers shown to users use a decimal comma (`13,2 g`); stored values are per 100 g or 100 ml.
- Never use the official Nutri-Score logo artwork; our own A to E letter scale is allowed. Always show "Calculat la 100 g; nu indică riscul unei boli." next to a score.
- Secrets only in environment settings; never commit `.env*` except `.env.example`.

## Definition of done

The task's acceptance steps pass, `pnpm lint && pnpm typecheck && pnpm test` is green, the other tool's AI review is addressed, the change was checked on a real iPhone and a real Android phone, in the app and in the browser preview, if it touches the UI, and the task box is ticked in the role plan.


# Root design-preview guidance

Design skills are installed locally in `.agents/skills/`. Read the relevant
`SKILL.md` before design or UI work; load supporting references only as needed.

- Visual direction, typography, palettes, layout, and UX: `ui-ux-pro-max`.
- Distinctive visual composition and avoiding generic generated UI: `hallmark`.
- Component polish and interaction details: `emil-design-eng`.
- Purposeful web motion: `animate`; diagnosing dropped frames: `animation-performance`.
- shadcn component selection and implementation: `shadcn`, when using shadcn/ui.
- React performance: `react-best-practices`, when using React or Next.js.
- React component APIs: `composition-patterns`, when component complexity warrants it.
- UI and accessibility review: `web-design-guidelines`.

User requirements and the project's approved design take precedence over skill
suggestions. Preserve existing design tokens and components. Apply only skills
relevant to the task and stack; installing these skills does not select a framework
or require adding dependencies. Accessibility, reduced-motion preferences, and
mobile usability take precedence over decorative effects.

For UI/UX Pro Max, use the actual project-local script path instead of upstream
Claude plugin paths:

```sh
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "food label mobile" --domain ux
```

See `docs/design-resources.md` for sources, pinned versions, and usage.

## Application source layout

The separate Expo design preview lives directly at the project root. Use `src/core` for
platform services, constants, theme and utilities; `src/data` for models,
repositories and demonstration records; `src/features` for feature screens;
and `src/shared` for shared widgets and state. Route files in `src/app` delegate
to feature screens. Keep tests under root `test`, local fonts in `assets/fonts`,
and icon data in `assets/icons`. The `design` folder is reference-only and must
never be imported by application code. Keep platform variants in `.web.ts(x)`.

## Team integration

Read the specification and role plans in docs/superpowers/ before changing
shared behavior or connecting services. The root-level layout and reference in design/ describe this preview. The
team role plans and apps/mobile service-integration workspace remain intact.
The prototype in docs/prototype/ is retained from main for context.

The team plans and other contributors' branches use apps/mobile,
packages/shared, and supabase. This branch uses src, assets, and
server/supabase. Reconcile these paths when integrating that work; do not
create a second application or move the approved frontend silently.

Backend contract and migration changes remain owned by the backend role.
Keep service schemas synchronized before connecting a real repository.
Do not alter a teammate's branch as part of frontend work. Keep feature
changes in their own branches and obtain review before merging into main.

Keep Romanian copy in src/core/constants/strings_ro.ts, preserve strict
TypeScript and runtime response validation, and use decimal commas for
display values. Keep scoring explanations beside the score, and do not add
payment or subscription functionality.

Run npm run check and the required platform bundle checks before publishing
a review branch. Physical-device testing and a human-reviewed main merge
remain separate acceptance steps. Keep secrets out of Git; only
.env.example is permitted as an environment template.
