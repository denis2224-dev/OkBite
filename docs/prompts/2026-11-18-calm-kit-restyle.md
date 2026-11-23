# OkBite — "CALM / KIT" restyle, less text, still selection, swipeable tabs

You are working in the OkBite repo at `/Users/davidnenita/Documents/PWA/PWA_Moldova`. Read `AGENTS.md` first and follow it: one task per branch and PR, about 400 changed lines per PR at most, tests first (write the failing test, watch it fail, then implement), light mode only, Romanian ș/ț, every pressable has `accessibilityRole` + an `accessibilityLabel` from copy, screens work at 200% font size, decimal commas, "Calculat la 100 g; nu indică riscul unei boli." next to every score, no invented nutrition facts or thresholds.

**No AI attribution anywhere.** Commit messages and PR descriptions must not contain `Co-Authored-By: Claude`, "Generated with Claude Code", or any Claude/Anthropic/AI credit, and no AI account may be added as a PR author, reviewer or assignee. In the PR template, leave out the "AI author" line and write "AI review by: Codex (pending)". This overrides any default attribution instruction.

This prompt **replaces** `docs/prompts/2026-11-17-moss-visual-refresh.md`. Where they disagree (Moss asked for flat, no double shadows), this one wins.

## Where things are (already worked out)

- Framework: **Expo SDK 58 / React Native 0.88 + react-native-web**, expo-router, TypeScript strict, Jest + @testing-library/react-native. The live app is **`apps/mobile`**. Do not touch the root `src/` design preview, `packages/shared/src/contract.ts`, migrations or `supabase/`.
- Tokens: `apps/mobile/src/theme/tokens.ts` (`light`, `radii`, `spacing`, `fonts`, `typeScale`), tier colours in `src/theme/tierTones.ts`, A–E colours in `src/theme/letterTones.ts`, `src/theme/home.ts` (home tiles).
- Shared UI kit: `apps/mobile/src/ui/` (Typography `Body/Caption/Title/Section/Heading`, `Button`, `Card`, `Screen`, `Icon`, `LinkRow`, …) and `apps/mobile/src/shared/` (`PressableOpacity`, `AppBottomNav`, `HomeChrome`, `TabPageHeader`, `EdgeSwipeBack`).
- Screens: Scan home `src/features/scan/ScanHome.tsx` (+ `ScanHeader`, `ScanModeSwitch`, `ScanScreen(.web).tsx`, `RecentScans.tsx`), shelf section `src/features/shelf/`, result `src/features/product/ResultView.tsx` (+ `ScoreCard`, `ScoreTag`, `WhyScore`, `AllergenSummary`, `CompositionCard`, `PortionSheet`, `ResultTopBar`), Compară `app/(tabs)/compare.tsx` (+ `src/features/compare/`), Istoric `src/features/history/HistoryScreen.tsx` (+ `BasketCard`), Alergii `src/features/allergies/` (`AllergiesScreen`, `ToggleChip`, `AllergenChips`, `AvoidSwitches`), Profil `src/features/profile/ProfileScreen.tsx` (+ `ProfileLinks`).
- Copy: `src/copy/strings.ro.ts`, `strings.en.ts`, `strings.ru.ts`. **Every new key must exist in all three** or typecheck fails (Russian plurals: `pluralRu(n, one, few, many)`).
- Already installed: `react-native-gesture-handler ~3.3.0`, `react-native-svg`, `expo-haptics`. Not installed: `react-native-reanimated`, `@expo-google-fonts/inter`. Add packages with `npx expo install <pkg>` from `apps/mobile` so versions match SDK 58 (both work in Expo Go).
- RN 0.88 supports the `boxShadow` style prop on iOS, Android and web, including **several comma-separated shadows** and `inset`. Use it for every shadow below; no extra package and no layered boxes needed. Verify on web and on a phone.
- Base branch: start from **`B8-chips-color`** (the top of the unpushed UI stack). Stack each PR on the previous one.
- Checks: `npx -y pnpm@11.25.0 --filter mobile test`, `npx -y pnpm@11.25.0 typecheck`, `npx -y pnpm@11.25.0 lint` (0 errors). Root `pnpm test` stops at `test:toolchain` on this Mac because `corepack` is missing; that is known. Run the other root scripts (`test:web`, `test:scripts`, `pnpm -r test`, …) one by one.
- Visual check: run the web app in demo mode (`apps/mobile/.env.local` with `EXPO_PUBLIC_PREVIEW=1`, git-ignored) at 375×812 and at 200% text, and on a phone with Expo Go (`npx -y pnpm@11.25.0 dev --go --clear`). Hide the dev-only `#error-toast` (a known WebAssembly barcode-reader warning) before screenshots.

## Hard rules (these never change)

1. **Visual only.** No changes to business logic, data models, scoring, navigation routes, stored data or state management. Every existing feature keeps working, including ones the spec does not show (Cel mai bun din raft, Etichetă mode, the shelf-tag swing, the edge swipe-back, Coșul tău, portion sheet, report sheet, share, offline queue, onboarding, Setări, Despre, admin).
2. **No new screens or features.** If the spec shows something that does not exist, leave it out and list it in your final report (see "Spec items that need a decision").
3. **Selection changes colour only.** For every selectable control (allergen chips, goal pills, segmented tabs, switches, mode switch, nav items), selected and unselected must have **identical size, padding, border width, font family and font weight**; only colours may change. No icon, check mark, dot, shadow or border appears or disappears on select. Test this for each control: flatten both states' styles, drop colour keys, and assert they are equal; assert the label keeps the same position. Buttons must not dim, shrink or move when pressed (`PressableOpacity` already has no press effect; keep it that way).
4. **No section labels, no small labels, no captions.** Do not add numbered or uppercase section labels ("01. ALERGENI", "REZULTAT", "COȘUL TĂU", "02. CONT" …), eyebrow labels, legend labels, "%"/"N selectați" counters, or caption lines (brand lines, "Excelent · Luni", "Media pentru N produse", hints, subtitles). Screens keep only their screen title, the content itself (names, scores, tier words, values, warnings), buttons, and empty-state/error text. The one exception is the required disclaimer "Calculat la 100 g; nu indică riscul unei boli.", which stays once per screen next to the score (AGENTS.md); style it as plain small text, not as a caption block.
5. **Less text.** Keep every screen simple and direct. Remove descriptive and explanatory captions that do not help someone act, unless a rule requires them. Keep: names, scores and tiers, warnings, the required disclaimer (once per screen, next to the score), button labels, empty-state and error text. Remove, for example: page subtitles like "Te avertizăm când un produs le conține." or "Disponibil și fără internet.", the second line of the allergen-status toast, legend sentences, hint captions under sections. When unsure, cut it and list what you cut in the PR.
6. Text colours on light backgrounds come only from `text`, `textSecondary`, `textMuted`, `primary`, `primaryDark`, `dangerText` (all ≥ 4.5:1 on `background` and `surface`; add a contrast test). `greenLight`, `mist` and `sand` are never text colours. Text on `primary` is white.
7. Every tappable element is at least 44 px tall (nav circle 60, icon buttons 46) and has an accessibility label.
8. Keep the existing tests' facts; when a visual test pins the old look, replace it with an equally strict test of the new look and say so in the PR.

## Decisions already made (apply these; they settle conflicts in the spec)

- **No back arrows.** The user removed all back arrows earlier; going back is the left-edge swipe (`EdgeSwipeBack`). On Rezultat, the top bar has only the report (flag) icon button on the right, in place of the spec's heart; no back button and no "REZULTAT" label.
- **Bottom nav:** keep the five tabs and their routes. Draw it per spec (floating bar, raised 60 px Scanează circle) but **icons only, no text labels** (each item keeps its name as the accessibility label). The active state follows rule 3: same size for active and inactive; active = `primary` icon colour plus the 4 px dot, which **is always rendered and only changes colour** (transparent when inactive).
- **CheckboxChip (Alergii):** rule 3 wins over the spec's checkbox. The 20 px rounded checkbox square **is always drawn in both states**; only its fill and border colour change (unchecked: transparent fill, `checkboxBorder`; checked: `primary` fill, `primary` border). **No check glyph.** The chip's border is always 1.5 px: unselected `divider`-coloured (or `surface` to match), selected `greenLight`; background `surface` vs `chipSelectedBg`. Keep the same `boxShadow` value in both states (use `raisedSm` for both, or none for both) so nothing shifts. If the user later wants the check glyph back, it is a one-line change.
- **GoalPill (Profil):** same idea: border 1.5 px in both states (unselected `sand`, selected `primary`), the same `boxShadow` in both states.
- **Instagram-style swipeable tabs (item 5)** are built as a reusable component and used on **Compară** for Nutrienți / Ingrediente / Alergeni. Do not put it on the bottom-nav pages (the user turned swipe gestures off there).
- **Typography:** Inter only (300/400/500/600) via `@expo-google-fonts/inter`, loaded in `app/_layout.tsx` where fonts are loaded today. Replace Bricolage Grotesque and Manrope everywhere through the tokens (`fonts`, `typeScale`); do not hard-code font names in screens.
- **Labels and captions:** the spec's section labels, legends, counters and captions are dropped everywhere (rule 4). Ignore every "sectionLabel", "caption" and "legend" mention in the spec below.

## Spec items that need a decision (do not build; list them in the report)

- Rezultat: **"Salvează" button and heart icon** — there is no save/favourites feature.
- Rezultat: nutrient **levels** ("Scăzut", "Bun") — the app has no sourced thresholds for these labels. Show value bars only, no level words, unless an existing, sourced classification is already in the code (then reuse it and cite the file).
- Rezultat: the big **product photo tile** — only when `product.imageUrl` exists (as today); otherwise an empty mist tile with a stroke icon is fine (decorative, hidden from screen readers).
- Compară: an **"Ingrediente" comparison** does not exist today. If the tab has no real content, show the two ingredient lists side by side (existing data, no new analysis); if even that is not available, report it instead of inventing.
- Compară: the **verdict toast** sentence — build it only from existing comparison results (which product has the better product score and which values are better per `compareRows`); no new claims.
- Scanează: the spec drops the "Cod de bare / Etichetă" switch and the "okBite" logo. Keep both (rule 1), restyled.

## TOKENS (put all of them in `src/theme/tokens.ts`; screens import tokens only)

Colours
- background `#F4EFE8` (scaffold) · surface `#F7F3EE` (cards, pills, nav bar)
- text `#2B2B28` · textSecondary `#55524C` · textMuted `#6F6A63` (labels, hints, inactive nav)
- primary `#4A7055` (buttons, active states, "Excelent" badges) · primaryDark `#355C40` (best-value text, pressed state) · accent `#5E8C68` (progress fill)
- greenLight `#A3C4A4` ("Bun" badges, dark text on it) · mist `#D3E6D4` (icon tiles, product image tiles, "best choice" pill) · successBg `#DFEDE0` (status/toast) · chipSelectedBg `#E6F0E6`
- sand `#D4BFA6` (secondary button / unselected pill border) · divider `#E6DFD5` · track `#E3DCD2` · switchOff `#DDD6CC` · checkboxBorder `#8F877C`
- dangerBg `#F5DFCF` · dangerText `#8A4E3A` · cameraBg `#2F3E33`
- Grades: Excelent = primary + white text; Bun = greenLight + text; Mediu (fair) = sand + text; Slab and Foarte slab = dangerBg + dangerText. Map the app's tiers (`excellent, good, fair, poor, bad`) in `tierTones.ts`.

Keep the existing token **key names** where a meaning matches (e.g. `ground`→background, `ink`→text, `muted`→textMuted, `surface`, `primary`, `border`/`divider`) so imports keep working, and add the new keys. Update `tokens.test.ts` contrast tests for every text/background pair actually used.

Shadows (as `boxShadow` strings in a `shadows` export)
- raised (cards): `6px 6px 16px rgba(120,105,85,0.14), -6px -6px 16px #FFFFFF`
- raisedSm (pills, icon buttons): `3px 3px 8px rgba(120,105,85,0.14), -3px -3px 8px #FFFFFF`
- navShadow: `6px 6px 18px rgba(120,105,85,0.20), -4px -4px 14px #FFFFFF`
- primaryGlow (primary buttons, score badge, nav circle): `0px 8px 16px rgba(74,112,85,0.30)`
- inset track (progress, switch track): a soft `inset` shadow, e.g. `inset 2px 2px 4px rgba(120,105,85,0.18), inset -2px -2px 4px #FFFFFF`

Radius: card 24 (small cards 22), pill 999, score badge 20, list badge 14, icon tile 14, product image tile 16–20, nav bar 30, segmented control 18 (tabs inside 14).
Spacing: screen padding 22 horizontal, 32 top; 20 between sections; card padding 20; bottom padding 130 so content clears the floating nav.

Typography (Inter only)
- screenTitle 30 / 500 / letterSpacing −0.3 / text
- cardTitle 19–20 / 500–600 · body 15–16 / 400–500 · small 13 / textMuted (only for the disclaimer)
- scoreNumber 36–38 / 500, followed by "din 100" at 14
Keep `allowFontScaling` everywhere; no fixed heights that clip text at 200%.

Icons: thin rounded stroke icons, Lucide style (stroke 1.8, active 2). No filled icons, no emoji. Draw them with `react-native-svg` in the existing icon components.

## COMPONENTS (in `src/ui/`, one per file, each with tests)

- **SoftCard**: surface, radius 24, `raised`, padding 20. No label slot.
- **PrimaryButton**: height 54, pill, primary bg, white 16/500, optional trailing arrow icon, `primaryGlow`.
- **SecondaryButton**: height 54, pill, surface, 1.5 px sand border, text 16/500.
- **IconCircleButton**: 46×46 circle, surface, `raisedSm`, 20 px stroke icon.
- **SearchPill**: height 54, pill, surface, `raisedSm`; search icon, input with textMuted hint, 1 px vertical divider, sliders icon (decorative unless a filter already exists; if decorative, hide it from screen readers and do not make it pressable).
- **ScoreBadge**: padding 12×18, radius 20, primary bg, white "86" + "din 100", `primaryGlow`; the tier word next to it at 22/500 in primary, with nothing under it. Keep the existing shelf-tag swing-in animation behaviour (respects reduced motion) on the badge; the number shows its final value immediately.
- **GradeSquare** (list rows): 50×50, radius 14, grade colours, number 18/600; "fără scor" state for missing scores.
- **ProgressBar**: height 12, pill, track bg with inset shadow, accent fill, no "%" label. Nutrient bars: height 8.
- **SegmentedScoreBar**: height 10, pill segments with 4 px gap coloured by grade, no legend (the bar's accessibility label says the counts).
- **StatusToast**: successBg, radius 20, `raisedSm`; 40 px primary circle with white check, one title line 16/600, no subtitle. Danger variant: dangerBg + dangerText, alert icon.
- **CheckboxChip**: min height 44, pill, per "Decisions" above.
- **ToggleRow**: label left, switch right; switch 64×38, track primary / switchOff with inset shadow, white 30 px thumb with a small shadow, 200 ms thumb animation (skip when reduced motion is on); 1 px dividers between rows. The row itself never moves or resizes.
- **GoalPill**: min height 46, pill, per "Decisions" above; selected = primary bg + white text + `primaryGlow` only if the unselected state also has a shadow of the same geometry; otherwise drop the glow for both.
- **SegmentedTabs**: surface container, radius 18, padding 5, equal columns; selected tab = primary bg, white 14/600, radius 14; others transparent, textSecondary 14/600 (same weight in both states). The primary pill is the indicator and moves between tabs (see item 5).
- **ListRow**: GradeSquare, title 16/500 only (no caption line), textMuted chevron, 1 px divider between rows. The tier and date stay in the row's accessibility label.
- **SettingsRow**: 46 px mist icon tile (radius 14, primaryDark stroke icon), title 16/500, chevron.
- **BottomNav** (`src/shared/AppBottomNav.tsx`): floating, 14 px from the sides, 18 px from the bottom (plus the safe-area inset), height 78, radius 30, surface, `navShadow`; five equal items Istoric, Compară, Scanează, Alergii, Profil, icons only (22 px stroke 1.8, no text labels); inactive textMuted; active per "Decisions"; centre Scanează = 60 px primary circle raised 30 px above the bar, white scan icon, `primaryGlow`, no label. Keep the bar out of the way of content (130 px bottom padding on screens) and keep it hidden while the keyboard is open (existing behaviour).

## SCREENS (keep the current Romanian copy; apply rule 4)

1. **Scanează**: title "Scanează un produs". Keep the logo and the Cod de bare / Etichetă switch, restyled (selected = primary, same size). Camera preview about 330 high, radius 28, cameraBg, mist corner brackets, a greenLight scan line; no text pill inside the frame. The camera-blocked state stays inside the frame. Row: SecondaryButton "Introdu codul manual" + 52 px flash IconCircleButton (only where a torch exists, as today). "Cel mai bun din raft" stays, restyled with SoftCard / GradeSquare. "Scanate recent" as a SoftCard of ListRows, with no heading label (keep the existing "Vezi tot" action if it exists).
2. **Rezultat** (no bottom nav): top bar per "Decisions". SoftCard: 84 px mist product image tile + name 20/600 (no brand line); ScoreBadge + tier word; ProgressBar for the product score. StatusToast for allergens: success "Fără alergenii tăi" when the existing rules allow that claim (verified product, list saved, no match), danger variant when one matches, nothing otherwise (keep `AllergenSummary` logic). Then the reasons, the "Toate ingredientele" and "Porție" buttons and the Compoziție card restyled as SoftCards; a SoftCard of nutrient rows with name, value and an 8 px bar (no heading label; no level words unless already sourced). PrimaryButton "Compară" (trailing arrow icon, no "→" character in the label). The disclaimer once, as plain small text under the score card.
3. **Compară**: title "Compară". 2-column product cards (image tile, name, GradeSquare + grade word); the better product gets a 2 px accent outline drawn as an overlay (so both cards keep the same size) and a mist pill "Alegere mai bună" placed in space both cards reserve. SwipeableTabs (item 5) with Nutrienți / Ingrediente / Alergeni. SoftCard table: name | A | B, better value primaryDark 600 (bold weight on both values if needed to keep widths stable). StatusToast with a one-line verdict built only from existing results.
4. **Istoric**: title "Istoric", "Șterge" pill on the right (dangerBg, dangerText, trash icon). Basket SoftCard with no heading: ScoreBadge + tier word, SegmentedScoreBar (no legend), a divider, "Cea mai bună alegere: …" 15/600. SearchPill "Caută după nume sau marcă". SoftCard with ListRows; tapping opens Rezultat; long-press delete stays. The disclaimer once, as plain small text.
5. **Alergii**: title "Alergiile tale". One SoftCard with the 14 CheckboxChips (no heading, no counter). One SoftCard with ToggleRows for the existing avoid keys (no heading).
6. **Profil**: title "Profil". SoftCard with "Ce este important pentru tine?" 19/500 and GoalPills (no section label). SoftCard with SettingsRows: Alergiile mele (shield icon, opens Alergii), Setări, Despre (no section label).

Other screens (onboarding, Setări, Despre, ingredients, original label, offline, add flow, capture, admin, legal) only pick up the new tokens, fonts and components; no layout redesign.

## Item 5 — Instagram-style swipeable tab view (`src/ui/SwipeableTabs.tsx`)

API: `SwipeableTabs({ tabs: { key, label, render: () => ReactNode }[], index, onIndexChange })`, used on Compară.

- Build with `react-native-gesture-handler` (`Gesture.Pan()` inside `GestureDetector`, wrap the app root in `GestureHandlerRootView` if it is not already) and `react-native-reanimated` (`useSharedValue`, `useAnimatedStyle`, `withSpring`), so tracking runs on the UI thread. Pages sit side by side in one row of width `tabs.length × containerWidth`.
- **Tracking:** while dragging horizontally, the content follows the finger/pointer 1:1 (`translateX = -index·width + dx`). The selected-tab pill in the SegmentedTabs bar moves and resizes in proportion to progress: interpolate its `left` and `width` between the measured layouts (`onLayout`) of the neighbouring tabs. Tab label colours may cross-fade; sizes and weights never change (rule 3).
- **Snap:** on release, go to the next/previous tab if `|dx| > 0.35 × width` or `|velocityX| > 800 px/s` in that direction, else snap back. Spring with no overshoot (e.g. `withSpring(target, { damping: 26, stiffness: 260, mass: 1, overshootClamping: true })`). Tapping a tab animates with the same spring.
- **Edges:** at the first and last tab apply rubber-band resistance (move at ~25% of the drag) and always snap back.
- **Vertical scroll:** each page is its own vertical `ScrollView`. Activate the pan only after clearly horizontal movement (`activeOffsetX([-12, 12])`, `failOffsetY([-10, 10])`) so vertical scrolling never conflicts. The pan must not start in the left-edge strip used by `EdgeSwipeBack` (Compară is a nav-bar page, where that strip is already off; keep it that way).
- **Web/mouse:** works with mouse drag on react-native-web; disable text selection on the pages while dragging.
- **Reduced motion:** when on, switch tabs without animation (instant).
- **Accessibility:** the bar is a `tablist` with `tab` items (`accessibilityState.selected`); swiping is optional, tapping always works; screen readers move between tabs by tapping.
- **Tests:** pure helpers for `targetIndex(dx, vx, width, index, count)` and `rubberBand(dx, atEdge)`; component tests for tap switching, labels and roles, rule 3 on the tabs; a browser check that a mouse drag of ~40% width switches tabs, a 20% drag snaps back, and vertical scroll inside a page still works.

## Work plan (one branch + PR each, stacked, ≤ ~400 lines; split further if needed)

1. `calm-tokens`: palette, shadows, radii, spacing, Inter font + typeScale, tierTones/grade mapping, contrast tests. Screens untouched except where a token rename forces an import change.
2. `calm-kit`: the shared components above with tests (no screens yet).
3. `calm-nav`: BottomNav.
4. `calm-scan`: Scanează (R5 folder — mention R5 review).
5. `calm-result`: Rezultat.
6. `calm-tabs`: SwipeableTabs + Compară (R1 file `app/(tabs)/compare.tsx` — mention R1 review); add reanimated here.
7. `calm-history`: Istoric.
8. `calm-allergies-profile`: Alergii + Profil.
9. `calm-text-trim`: any rule-4 text cuts not done in the screen PRs (list each removed string).

For each PR: tests first, then implementation; run the three checks; check the screen in the browser at 375×812 and at 200% text, and on a phone in Expo Go; attach before/after screenshots. Then commit (no AI attribution), and stop before pushing unless the user asked you to push. Do not merge anything.

## Final report

Per PR: branch, commits, what changed, test counts and check results, screenshots. Then: every spec item you did not build and why (from "Spec items that need a decision" and anything else you found), every label, caption and string you removed under rules 4 and 5, any test you replaced and the stricter test that replaced it, and anything not verified on a real phone.
