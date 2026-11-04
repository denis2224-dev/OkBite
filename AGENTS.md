# Project design guidance

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

The Expo application lives directly at the project root. Use `src/core` for
platform services, constants, theme and utilities; `src/data` for models,
repositories and demonstration records; `src/features` for feature screens;
and `src/shared` for shared widgets and state. Route files in `src/app` delegate
to feature screens. Keep tests under root `test`, local fonts in `assets/fonts`,
and icon data in `assets/icons`. The `design` folder is reference-only and must
never be imported by application code. Keep platform variants in `.web.ts(x)`.

## Team integration

Read the specification and role plans in docs/superpowers/ before changing
shared behavior or connecting services. The user's approved root-level Expo
layout and the reference in design/ remain authoritative for this preview.
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
