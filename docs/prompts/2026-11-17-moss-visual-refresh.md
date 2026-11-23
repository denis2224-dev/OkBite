# OkBite — "Moss" visual refresh (Forest · Sage · Ivory · Ink)

You are working in the OkBite repo. Read `AGENTS.md` first and follow it (one task per branch and PR, ≤ ~400 changed lines per PR, tests first, light mode only, Romanian ș/ț, accessibility labels on every pressable, decimal commas, 200 % font size). The live app is `apps/mobile`. Do not touch the root `src/` design preview, `packages/shared/src/contract.ts`, migrations or anything under `supabase/`.

**No AI attribution anywhere:** commit messages and PR descriptions must not contain `Co-Authored-By: Claude`, "Generated with Claude Code", or any Claude/Anthropic/AI credit, and no AI account may be added as a PR author, reviewer or assignee. This overrides any default attribution instruction.

## Goal

Restyle the whole app to a calm, flat, nature palette: **Forest, Sage, Ivory, Ink**. The reference result screen (the user's mockup) shows the target: ivory page, slightly lighter ivory cards, one forest-green primary colour, sage for soft fills and selected-but-quiet states, ink for text.

It must look **soft and flat, not 3D**. The reference palette image uses neumorphic double shadows and glossy gradients; **do not copy that depth.** Use its colours and its rounded, generous shapes only.

This is a visual refresh, not a redesign of features or copy: keep the five tabs, every screen, every string, the score logic, the disclaimer "Calculat la 100 g; nu indică riscul unei boli.", the single allergen safety line, and the Unverified badge.

## 1. Palette (single source: `apps/mobile/src/theme/tokens.ts`)

Replace the values in `light` with this palette. Keep every existing **key name** so nothing else has to change its imports; only values change. Add the new keys listed below.

| Role | Token(s) | Value |
|---|---|---|
| Forest (primary) | `primary`, `hero`, `favorable`, `themeSelected`, `good` | `#2F5136` |
| Forest pressed | new `primaryPressed` | `#25412B` |
| Sage | `accent` (and new `sage`) | `#A9BEA0` |
| Sage soft fill (icon buttons, info pills, selected-quiet) | `soft`, `mint`, `neutralBg`, `themeButton`, new `sageSoft` | `#DDE5D6` |
| Sage tint (favourable rows, good tier background) | `favorableBg`, `goodBg` | `#E6EDE1` |
| Ivory page | `ground` | `#F2EFE8` |
| Ivory card / surface | `surface` | `#F8F6F1` |
| Ink | `ink` | `#2A2B29` |
| Muted text | `muted`, `themeIcon` | `#646A64` |
| Border | `border` | `#E2DED4` |
| Divider | `divider` | `#E9E6DE` |
| Text on forest | `onPrimary`, `heroText` | `#FFFFFF` |
| Text on sage | `onAccent` | `#2F5136` |
| Focus ring | `focus` | `#2F5136` |

Keep the existing warning/medium/low/offline/camera tokens, but nudge them into the same family so nothing looks out of place (e.g. warm amber and terracotta that sit next to ivory, not neon). Each must still pass contrast.

**Contrast is a hard rule:** every text/background pair must reach WCAG AA (4.5:1 for body text, 3:1 for large text and icons). If a value above fails for a pair it is used in, darken the foreground (never lighten text) and note the change in the PR. Add or update `tokens.test.ts` to assert the key pairs (ink on ground, ink on surface, muted on surface, onPrimary on primary, primary on sageSoft, each tier fg on its bg).

**Score tiers** (`theme/tierTones.ts`, `theme/letterTones.ts`): keep five distinguishable tiers, recoloured to sit in the palette: Excelent forest, Bun a lighter green, Mediu warm amber, Slab and Rău terracotta shades. The tier is always also shown as a word, never by colour alone. Do not use the official Nutri-Score logo or colours.

No hex literals outside the theme folder. Fix the few that exist (e.g. `features/shelf/ShelfPickRow.tsx`) to use tokens.

## 2. Depth: flat-soft rules (apply everywhere)

- **No gradients** anywhere (including the score tag and primary buttons; the mockup's gradient is replaced by flat forest).
- **No inner shadows, no double light/dark neumorphic shadows, no glossy highlights.**
- Cards: `surface` fill on the `ground` page, `radii.card` (20), a 1 px `border`, and **at most** one very soft shadow: `shadowColor: ink, shadowOpacity ≤ 0.05, shadowRadius ≤ 8, shadowOffset {0, 2}`, `elevation ≤ 1`. If a card already reads clearly with the border, use no shadow.
- Buttons and chips: completely flat fills, no shadow at all. Pressed state darkens the fill (`primaryPressed`) or lowers opacity; it never adds depth.
- The bottom nav and bottom sheets may keep a single soft shadow under the same limits (today `AppBottomNav.tsx` uses opacity 0.08, radius 18 — reduce it). Make one shared `softShadow` style in the theme and use it for every allowed shadow, so the rule lives in one place.

## 3. Shapes and components (`src/ui/*`, `src/shared/*`)

Restyle the shared components first; screens should mostly inherit the change.

- **Primary button:** flat forest fill, white Manrope semibold label, `radii.pill`, min height 52, full width when it is the screen's main action; optional leading icon (as in "Compară cu alt produs").
- **Secondary button:** `sageSoft` fill, forest label, pill, no border. **Text/ghost button:** forest label, no fill.
- **Icon button** (back, close, report flag, more): new shared `IconButton` — 44×44 tap target, 40×40 visible rounded square (`radii.small`), `sageSoft` fill, forest icon. Use it for the back button in `TabPageHeader` / `Screen` and for header actions.
- **Info pill** (e.g. "Conține lapte" in the mockup): `sageSoft` fill, forest icon + ink text, `radii.small`. The profile-allergen alert (an allergen the shopper said they avoid) stays visually stronger (warning or terracotta tone + alert icon); do not downgrade a safety warning to the calm sage style.
- **Chips** (allergens, goals): unselected = `surface` with `border`; selected = forest fill, white text, check icon, `accessibilityState.selected`.
- **Toggles / switches:** forest track when on, light grey/sage track when off, white thumb, no shadow on the thumb beyond the flat-soft limit.
- **Search field and text inputs:** pill or `radii.small`, `surface` fill, 1 px `border`, leading search icon where it is a search, forest focus ring.
- **Score:** a flat forest rounded rectangle (`radii.card`) with the white score number large and "din 100" small, and the tier word beside it in forest (as in the mockup). Where `ScoreRing` is still used, draw the track in `sageSoft` and the progress in forest, flat.
- **Link rows** (`LinkRow`): rows inside one card, ink label, chevron at the right, divider between rows, 56 min height.
- **Reason rows** (why the score): ⊕ / ⊖ outline icons in forest/muted, bold one-line title, muted explanation, dividers between rows, all in one card.
- **Bottom nav:** ivory/surface bar, flat; inactive icon + label in `muted`; active icon filled + label in forest. Keep the five tabs and the existing equal-width layout and current-page indicator, recoloured (a `sageSoft` pill behind the active icon is fine).
- **Toast, install banner, update banner, sheets:** surface, border, flat-soft shadow, forest action.

## 4. Typography

Keep the current fonts (Bricolage Grotesque headings, Manrope body) and the `typeScale` in `tokens.ts`. Use ink for headings and body, muted for captions. Product name on the result screen uses `display`; screen titles use `title` via `TabPageHeader`. No ALL-CAPS labels (the reference image's spaced caps labels are not to be copied).

## 5. Reference screen: product result

Make `app/product/[id]/index.tsx` and `features/product/*` match the mockup's layout and style, using existing data and strings only:

1. Header row: back/close `IconButton` left, report (flag) `IconButton` right.
2. Product name (display), then brand and quantity on one muted line.
3. Score tag (flat forest block) with the tier word to its right.
4. The disclaimer, small and muted, directly under the score (once).
5. Allergen info pill(s); the profile-allergen alert, if any, keeps its stronger style and stays above the score as today.
6. Reasons card (⊕/⊖ rows).
7. Link-rows card: "Toate ingredientele", "Porție", and any other existing detail screens. Do not add new screens or invent sections that have no data today; the mockup's "Compoziție" row maps to an existing destination only if one exists.
8. Primary button "Compară cu alt produs" with its icon, full width, at the bottom of the content.

## 6. Work plan (parallel where possible)

Each item is its own branch, worktree and PR. W0 must merge first; W1 must merge before W2–W6; W2–W6 can run in parallel because they touch different folders.

| ID | Branch | Scope | Effort |
|---|---|---|---|
| W0 | `MOSS0-tokens` | `theme/*`: palette, tier/letter tones, `softShadow`, contrast tests, remove stray hex literals | small, careful |
| W1 | `MOSS1-components` | `ui/*`, `shared/*`: Button variants, new IconButton, Card, chips, toggles, inputs, LinkRow, Badge, Toast, banners, bottom nav, `TabPageHeader`/`Screen` back button | large |
| W2 | `MOSS2-result` | `features/product/*`, `app/product/*`: section 5 | large |
| W3 | `MOSS3-scan` | `features/scan/*`, `features/capture/*`, `app/(tabs)/index.tsx`: Scan home, camera panels, recent-scans sheet | medium |
| W4 | `MOSS4-history-compare` | `features/history/*`, `features/compare/*`, `features/shelf/*`, their tab routes | medium |
| W5 | `MOSS5-profile-allergies` | `features/profile/*`, `features/allergies/*`, `features/onboarding/*`, their routes | medium |
| W6 | `MOSS6-settings-misc` | `features/settings/*`, `features/about/*`, `features/legal/*` (formatting only, never wording), `features/add/*`, `features/identify/*`, `features/offline/*`, `admin` | medium |

Screen PRs (W2–W6) should mostly delete local colour/shadow overrides and rely on the W1 components. If a screen needs a new shared component, add it to W1's follow-up rather than inventing a local one.

## 7. Process for each PR

1. Own worktree, branch from the latest `main`.
2. Tests first for behaviour or token changes (contrast pairs, IconButton accessibility, chip selected state, no gradient/shadow beyond the limit on Button). Watch them fail, then implement.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm -r test`, `pnpm test:app`, `pnpm test:web` (if `pnpm` is not on PATH use `npx -y pnpm@11.25.0`; `test:toolchain` fails locally without corepack and is not your problem).
4. Screenshot every changed screen at 375×812 before and after with Playwright against the web export (`pnpm e2e:web:build`, see `e2e-web/`), plus one at 200 % font size. Note the paths in the PR.
5. PR description: what changed, which tokens/colours changed (old → new), any contrast adjustments, screenshots, and anything not done. **No AI attribution lines.**

## Done when

- No gradients and no shadow stronger than `softShadow` anywhere in `apps/mobile`.
- No hex colour literals outside `src/theme/`.
- Every screen uses the Forest/Sage/Ivory/Ink palette through tokens and the shared components.
- The result screen matches the reference layout in section 5.
- All contrast pairs pass AA; lint, typecheck and tests are green; before/after screenshots are in each PR.
