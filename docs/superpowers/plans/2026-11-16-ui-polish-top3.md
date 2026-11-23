# UI Polish: Type Scale, Score Hero, Camera-Blocked State — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the result screen and Scan home read more clearly by adding a shared type scale, a score "hero" with the product photo and a one-line allergen summary, and a camera-blocked state that sits inside the dark camera frame instead of a white error card.

**Architecture:** Four small PRs. Task 1 adds `Title`/`Section`/`Caption` to the UI kit and moves R4 screens onto them. Tasks 2 and 3 rework the top of the result screen (`ScoreCard` with a new shelf-tag `ScoreTag`, and a new `AllergenSummary`) and consume Task 1's components. Task 4 adds a dark-frame `CameraBlocked` panel to both Scan screens (native and web) and does not depend on Tasks 2–3.

**Tech Stack:** Expo / React Native + react-native-web, TypeScript strict, Jest + @testing-library/react-native, `@okbite/shared`.

**Spec:** The UI review of 2026-11-16 (top three items: score hero with photo and allergen line, camera-denied state, type scale). Product rules: `docs/superpowers/specs/2026-11-03-okbite-design.md`. Project rules: `AGENTS.md`.

## Global Constraints

- One task, one branch, one PR, at most about 400 changed lines; branch `<task-id>-<short-name>`; own git worktree.
- Tests first; never weaken or delete a test to make it pass. Where a test below is *changed*, the replacement asserts the same fact at least as strictly.
- Light mode only; no dark-mode styles. Colours only from `src/theme/tokens.ts` (`light`) or `letterTones`.
- Every pressable has `accessibilityRole` and an `accessibilityLabel` from `ro`; screens work at 200% font size (`allowFontScaling`, no fixed heights that clip text).
- All copy through `ro` (`src/copy/strings.ro.ts` and `strings.en.ts`, same keys); comma-below diacritics (ș, ț).
- Keep "Calculat la 100 g; nu indică riscul unei boli." (`ro.score.disclaimer`) directly under the score, exactly once.
- Never use the official Nutri-Score artwork; our own A–E scale only.
- No allergen claim without the label: never show a "safe" line for an unverified product.
- Folder ownership: Tasks 1–3 are R4 folders (`src/{ui,theme,copy}`, `src/features/{product,allergies}`). Task 4 is R5's folder (`src/features/scan`): R5 implements it or approves the PR. `src/features/scan/RecentScans.tsx` and `src/features/onboarding/` are **not** migrated in Task 1.
- Commits, pushes and PRs never show Claude as a contributor: no `Co-Authored-By: Claude` trailer, no "Generated with Claude Code" line, and no Claude account as a PR member, reviewer or assignee. Pass this rule to every subagent brief.
- Done = `pnpm lint && pnpm typecheck && pnpm test` green at the repo root, plus a browser-preview check at 375×812 and at 200% text.

## Review Focus

1. **200% font size:** the hero row (shelf tag + tier word) wraps instead of clipping, and the camera-blocked frame grows instead of cutting off its button → tests in Task 2 (Step 1c) and Task 4 (Step 1c).
2. **Product without `imageUrl`:** no empty grey box and no gap before the name → Task 2 (Step 1b).
3. **Unverified product, profile has allergens, no match:** no "none of your allergens" line → Task 3 (Step 1, case `unverified`).
4. **Score unavailable (`score.score === null`):** no tag, the existing insufficient-data copy shows, and the allergen summary still renders under the name → Task 2 (existing "never shows a zero score" test kept) and Task 3 (Step 1, case `no score`).
5. **Web browser without camera support (`unsupported`):** the manual-only message shows inside the frame with no buttons, and manual entry stays reachable → Task 4 (Step 1b).

---

### Task 1: Type scale in the UI kit (`B8-type-scale`)

**Files:**
- Modify: `apps/mobile/src/theme/tokens.ts` (add `typeScale` and `fonts.headingExtra`)
- Modify: `apps/mobile/src/ui/Typography.tsx` (add `Title`, `Section`, `Caption`; `Heading` moves from 25/30 to the 26/32 display step)
- Test: `apps/mobile/src/ui/Typography.test.tsx` (create)
- Migrate: `apps/mobile/src/ui/LinkRow.tsx`, `src/features/product/{ScoreCard,WhyScore,ExplainedIngredient,ResultView,AdditiveSheet}.tsx`, `src/features/allergies/AllergiesScreen.tsx`, plus every other R4-folder file that `grep` below finds

**Interfaces:**
- Produces: `typeScale = { score:{fontSize:40,lineHeight:44}, display:{fontSize:26,lineHeight:32}, title:{fontSize:22,lineHeight:28}, section:{fontSize:18,lineHeight:24}, body:{fontSize:15,lineHeight:23}, caption:{fontSize:13,lineHeight:19} }` in `tokens.ts`. From caption to display, each step is about 1.2× the one below. `score` is reserved for the score tag (Task 2).
- Produces: `fonts.headingExtra = 'BricolageGrotesque_800ExtraBold'` in `tokens.ts`. The font is already loaded in `app/_layout.tsx`.
- Changes: `Heading` uses `typeScale.display` (26/32) instead of 25/30.
- Produces: `Title(props: TextProps)`, `Section(props: TextProps)`, `Caption(props: TextProps)` exported from `src/ui` (via `ui/index.ts`, which already re-exports `Typography`). `Title`/`Section` use `fonts.heading`, `colors.ink`, `accessibilityRole="header"`. `Caption` uses `fonts.body`, `colors.muted`, no role. All set `allowFontScaling`, and a caller's `style` merges last.

- [ ] **Step 1: Write the failing test** `src/ui/Typography.test.tsx`

```tsx
it('Section is a header at 18/24 in the heading font', async () => {
  await render(<Section>Alergeni</Section>);
  const el = screen.getByRole('header', { name: 'Alergeni' });
  expect(StyleSheet.flatten(el.props.style)).toMatchObject({ fontSize: 18, lineHeight: 24, fontFamily: fonts.heading, color: light.ink });
  expect(el.props.allowFontScaling).toBe(true);
});
it('Title is a header at 22/28', /* same shape: fontSize 22, lineHeight 28 */);
it('Heading is the 26/32 display step', /* same shape: fontSize 26, lineHeight 32 */);
it('Caption is muted 13/19 body text and not a header', async () => {
  await render(<Caption>Notă</Caption>);
  expect(screen.queryByRole('header')).toBeNull();
  expect(StyleSheet.flatten(screen.getByText('Notă').props.style)).toMatchObject({ fontSize: 13, lineHeight: 19, fontFamily: fonts.body, color: light.muted });
});
it('lets a caller override colour', async () => {
  await render(<Caption style={{ color: light.low }}>x</Caption>);
  expect(StyleSheet.flatten(screen.getByText('x').props.style).color).toBe(light.low);
});
```

- [ ] **Step 2: Run** `cd apps/mobile && pnpm test -- src/ui/Typography.test.tsx` → FAIL (`Section` is not exported).
- [ ] **Step 3: Add `typeScale` and `fonts.headingExtra` to `tokens.ts`; add `Title`/`Section`/`Caption` to `Typography.tsx`** (shaped like the existing `Heading`/`Body`), and point `Heading` at `typeScale.display`.
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Migrate R4 files.** Replace `<Heading style={{ fontSize: 18 …}}>` with `<Section>`, the 22/28-size `Heading`s with `<Title>`, and `<Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>` with `<Caption>`. Keep any extra style keys as `style` overrides. Drop `useTheme`/`fonts` imports that become unused.
- [ ] **Step 6: Verify the migration.** Run:
  `grep -rnE "fontSize: *13, lineHeight: *19|<Heading style=\{\{ fontSize: (18|22)" apps/mobile/src --include='*.tsx' | grep -v test | grep -vE "features/(scan|onboarding|capture|add|identify)/"`
  Expected: no output. Then `cd apps/mobile && pnpm test` → all pass. Headers are unchanged in role and order (`AboutScreen.test.tsx` covers this).
- [ ] **Step 7: Commit** `feat(ui): add Title, Section and Caption type scale (B8)`

---

### Task 2: Score hero — product photo and shelf-tag score (`B8-score-hero`)

The look is drawn in the mockup reviewed on 2026-11-16 (*Score as a shelf tag*). The okBite logo is a tag, and shelf tags are what shoppers read in the aisle, so the product score is a tag, not a ring.

**Files:**
- Create: `apps/mobile/src/theme/tierTones.ts`
- Create: `apps/mobile/src/features/product/ScoreTag.tsx`
- Modify: `apps/mobile/src/features/product/NutriScoreScale.tsx` (optional `showLetter`)
- Modify: `apps/mobile/src/features/product/ScoreCard.tsx` (new layout for a product with a tier)
- Modify: `apps/mobile/src/features/product/ResultView.tsx` (remove the 180px `<Image>` from the middle of the page)
- Test: `src/theme/tierTones.test.ts` (create), `src/theme/tokens.test.ts`, `src/features/product/ScoreTag.test.tsx` (create), `src/features/product/NutriScoreScale.test.tsx`, `src/features/product/ResultView.test.tsx`

**Interfaces:**
- Consumes: `Title`, `Caption`, `typeScale.score`, `fonts.headingExtra` (Task 1).
- Produces: `tierTone(tier: NonNullable<ProductScore['tier']>): { fg: string; bg: string }` mapping `excellent|good → light.good/goodBg`, `fair → light.medium/mediumBg`, `poor|bad → light.low/lowBg`.
- Produces: `ScoreTag({ score, tier, label, testID }: { score: number; tier: NonNullable<ProductScore['tier']>; label: string; testID?: string })`. It has `accessible`, `accessibilityRole="image"` and `accessibilityLabel={label}`, and its children are hidden from accessibility.
- Produces: `NutriScoreScale({ letter, showLetter = false })`. With `showLetter`, the selected segment is 22 high with `borderRadius: 8`, `borderWidth: 0`, and shows the letter (`fonts.bold`, 13/22, `letterTones.onSelected`, centred, hidden from accessibility). Without it, the bar is unchanged, so the Compare picker and the existing tests keep their behaviour.

**ScoreTag drawing:**
- A row with two parts. On the left, an SVG point 22 wide that stretches to the body's height (`preserveAspectRatio="none"`). Its path is `M22 0H14L0 30l14 30h8z` plus a circle of radius 3.4 at (13, 30), drawn with `fillRule="evenodd"` so the hole is a real cut-out on any background.
- On the right, the body in `tierTone(tier).fg`, with right corners of radius 14 and padding 8 / 16 / 9 / 6. Inside it, on one baseline: the number (`fonts.headingExtra`, `typeScale.score` 40/44, `light.onPrimary`) and "din 100" (`ro.score.outOf`, `fonts.medium`, 13/19, `onPrimary`).
- No fixed width or height: the tag grows with the text.
- **Motion:** this is the screen's one motion moment, a 500 ms "hang" in from opacity 0, rotation −6° and x −6. The tag renders in its final state first. The animation runs only after `AccessibilityInfo.isReduceMotionEnabled()` resolves `false`, using `Animated` with `useNativeDriver`.

**Layout (only when `product` is given and `productScore(...).tier` is non-null; every other `ScoreCard` path, including the Compare picker, is unchanged):**
- Row 1: a 64×64 thumbnail (`testID="product-thumb"`, `radii.small`, `backgroundColor: colors.soft`, `resizeMode="contain"`, `accessible={false}`), only when `product.imageUrl` is set. Then the name (`Title`, 2 lines max) and brand/quantity (muted `Body`).
- Row 2 (`flexWrap: 'wrap'`, gap 14 vertical / 18 horizontal, `alignItems: 'center'`): `ScoreTag` (`testID="product-score"`, `label = productLine`), then the tier word `ro.tiers[tier]` in `Title` with colour `tierTone(tier).fg`, hidden from accessibility.
- Then `NutriScoreScale letter={score.letter} showLetter`, then `Caption` with `ro.score.disclaimer`.
- There's no Nutri-Score chip and no `Calitate nutrițională: …` line in this layout.

- [ ] **Step 1a: Write failing tests** in `ResultView.test.tsx`:

```tsx
it('shows the product photo once, as a thumbnail before the name', async () => {
  const product = { ...foundYogurt.product, imageUrl: 'https://example.test/y.jpg' };
  await render(<ResultView product={product} score={foundYogurt.score} />);
  expect(screen.getAllByTestId('product-thumb')).toHaveLength(1);
  expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
  expect(inOrder().indexOf('product-thumb')).toBeLessThan(inOrder().indexOf(product.name));
});
it('reads the product score once, from the tag', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.getAllByLabelText('86 din 100 · Excelent')).toHaveLength(1);
  expect(screen.getByTestId('product-score')).toHaveProp('accessibilityLabel', '86 din 100 · Excelent');
  expect(screen.queryByText(`${ro.score.title}:`, { exact: false })).toBeNull();
  expect(screen.queryByText(`${ro.tiers.nutriScore} B`)).toBeNull(); // no chip
});
```

- [ ] **Step 1b: Write a failing test** for a product without a photo: with `imageUrl: null`, `queryByTestId('product-thumb')` is null and the name still renders.
- [ ] **Step 1c: Write a failing test** for 200% text in `ScoreTag.test.tsx`. Mock `useWindowDimensions` with `fontScale: 2`. The tag and its body have no `width` or `height` in their flattened styles, the number has `allowFontScaling` true, and the parent row in `ScoreCard` has `flexWrap: 'wrap'`.
- [ ] **Step 1d: Write failing tests**, one per file:
  - **ScoreTag motion** (`ScoreTag.test.tsx`): with `isReduceMotionEnabled` mocked to resolve `true`, `Animated.timing` is never called and the tag's opacity is 1. When it resolves `false`, `Animated.timing` is called once.
  - **Tier colours** (`tierTones.test.ts`): each of the five tiers maps as listed above.
  - **Contrast** (`tokens.test.ts`, which already has the `contrast` helper): `onPrimary` on every `tierTone(...).fg`, and `letterTones.onSelected` on every `letterTones[x].fg`, are each at least 4.5:1.
  - **Letter in the bar** (`NutriScoreScale.test.tsx`): with `showLetter`, only the selected segment shows its letter, at height 22. Without it, the existing tests pass unchanged.
- [ ] **Step 1e: Update existing assertions.** Same facts, read from the tag's label instead of a text line:
  - `ResultView.test.tsx:53` → replaced by Step 1a's second test.
  - `:86`, `:163`, `:177`, `:191` `getByText(productLine(...))` → `getByLabelText(productLine(...))`.
  - `:197` and `:268` order checks stay as they are (`inOrder()` already includes accessibility labels).
- [ ] **Step 2: Run** `cd apps/mobile && pnpm test -- src/features/product src/theme` → the new tests FAIL.
- [ ] **Step 3: Implement** `tierTone`, `ScoreTag`, `showLetter`, the new `ScoreCard` branch, and remove the `{product.imageUrl && <Image …/>}` block from `ResultView.tsx`.
- [ ] **Step 4: Run** the same command, then `pnpm test` in `apps/mobile` → PASS (including `partialResults.test.tsx` and the "never shows a zero score" test).
- [ ] **Step 5: Check in the browser preview.** `EXPO_PUBLIC_PREVIEW=1`, open a demo product at 375×812, then again at 200% text and with reduced motion on. Compare against the mockup and take screenshots for the PR.
- [ ] **Step 6: Commit** `feat(product): score hero with photo thumbnail and shelf-tag score (B8)`

---

### Task 3: One-line allergen summary under the score (`B8-allergen-summary`)

**Files:**
- Create: `apps/mobile/src/features/product/AllergenSummary.tsx`
- Modify: `apps/mobile/src/features/product/ResultView.tsx` (render it right after `ScoreCard`, or after the name/brand in the no-score branch)
- Modify: `apps/mobile/src/copy/strings.ro.ts`, `strings.en.ts` (one new key in `result`)
- Test: `apps/mobile/src/features/product/AllergenSummary.test.tsx` (create)

**Interfaces:**
- Consumes: `matchProfile(product, profile)` from `@okbite/shared`; `useProfile()` from `../profile`; `ro.result.containsAllergen(names: string)` (already exists); `Icon` names `check` and `info`.
- Produces: `AllergenSummary({ product }: { product: Product }): JSX.Element | null`, with `testID="allergen-summary"` and `accessibilityRole="text"`.
- Copy: `result.noProfileAllergens` = ro `'Niciun alergen din lista ta pe etichetă'`, en `'None of your allergens on the label'`.

**Rules (first match wins):**
1. `match.allergens.length || match.mayContain.length` → `null` (`ProfileAllergenAlert` already warns at the top).
2. `profile.allergens.length > 0 && product.status === 'verified'` → a `goodBg` row with the `check` icon and `ro.result.noProfileAllergens`.
3. `profile.allergens.length === 0 && product.allergens.length > 0` → a `neutralBg` row with the `info` icon and `ro.result.containsAllergen(names)`, where `names` are `ro.allergens[a].toLocaleLowerCase()` joined with `', '` in label order.
4. Otherwise → `null`.

- [ ] **Step 1: Write failing tests** with `it.each`, mocking `../profile/useProfile` as `ResultView.test.tsx` does:

| case | profile.allergens | product | expect |
|---|---|---|---|
| `match` | `['Lapte']` | yogurt, `allergens:['Lapte']` | `queryByTestId('allergen-summary')` null |
| `verified clear` | `['Arahide']` | yogurt, `status:'verified'`, `allergens:['Lapte']` | text `ro.result.noProfileAllergens` |
| `unverified` | `['Arahide']` | yogurt, `status:'unverified'` | null |
| `no profile` | `[]` | yogurt, `allergens:['Lapte','Soia']` | text `ro.result.containsAllergen('lapte, soia')` |
| `nothing declared` | `[]` | yogurt, `allergens:[]` | null |
| `no score` | `['Arahide']` | verified yogurt, rendered via `ResultView` with `score:{...score, score:null, grade:'unavailable'}` | summary present, after `product.name` in `inOrder()` |

Also add one `ResultView` test: with a verified, clear product, `allergen-summary` appears after `product-score` and before `ro.result.whyLetter('B')` in `inOrder()`, and `ro.result.missingAllergenNote` still appears exactly once.
- [ ] **Step 2: Run** `cd apps/mobile && pnpm test -- src/features/product/AllergenSummary src/features/product/ResultView` → FAIL.
- [ ] **Step 3: Implement** the component, the copy key in both string files, and the `ResultView` placement.
- [ ] **Step 4: Run** the same command, then `pnpm typecheck` at the repo root (this catches a key missing from `en`) → PASS.
- [ ] **Step 5: Commit** `feat(product): one-line allergen summary under the score (B8)`

---

### Task 4: Camera-blocked state inside the camera frame (`B2-camera-blocked`, R5 folder)

**Files:**
- Create: `apps/mobile/src/features/scan/CameraBlocked.tsx`
- Modify: `apps/mobile/src/features/scan/ScanScreen.tsx` (use `CameraBlocked` for the permission-denied and mount-failed previews; add `testID="scan-preview"` to the frame)
- Modify: `apps/mobile/src/features/scan/ScanScreen.web.tsx` (always render the frame while focused and not `found`; inside it, the `<video>` when `cameraOn`, otherwise `CameraBlocked` with today's title, message and actions)
- Test: `src/features/scan/ScanScreen.test.tsx`, `src/features/scan/ScanScreen.web.test.tsx`

**Interfaces:**
- Consumes: `PanelAction` from `../capture/StatusPanel` (unchanged); `Section` (Task 1, optional — use `Text` with `fonts.heading` 18/24 if Task 1 has not merged).
- Produces: `CameraBlocked({ title?, message, actions }: { title?: string; message: string; actions: PanelAction[] })`, `testID="camera-blocked"`, `accessibilityLiveRegion="polite"`. Centred column: a 56px `cameraOverlay` circle with the `camera` icon in `cameraInk`, then the title and message in `cameraInk`, then the buttons — the first `variant="accent"`, the rest `"secondary"`. No `surface` background and no border.
- Frame rule: when blocked, the frame keeps `minHeight` but drops `maxHeight` and `aspectRatio`, so text at 200% grows the frame instead of being cut off.

Copy and button labels **do not change** in this task. Existing tests pin "one line and one retry" with `ro.errors.retry`. Renaming the button (for example to `ro.capture.permission`) is a separate decision for the owner.

- [ ] **Step 1a: Write failing tests** (native, `embedded`, permission `denied`):

```tsx
const frame = screen.getByTestId('scan-preview');
const blocked = within(frame).getByTestId('camera-blocked');
expect(within(blocked).getByText(ro.scan.deniedText)).toHaveStyle({ color: light.cameraInk });
expect(StyleSheet.flatten(blocked.props.style).backgroundColor).not.toBe(light.surface);
expect(within(blocked).getByRole('button', { name: ro.errors.retry })).toBeTruthy();
```

Add the same test for web (`mockLive.status = 'denied'`, `embedded`), plus web `busy` and `unavailable` (message from `cameraMessage`, one retry button inside the frame).
- [ ] **Step 1b: Write a failing web test** for `mockLive.status = 'unsupported'`: `ro.scan.webManualOnly` is inside `scan-preview`, the frame has no buttons, and `ro.scan.manual` is still pressable outside the frame.
- [ ] **Step 1c: Write a failing test** for 200% text: in the denied state, the flattened `scan-preview` style has `maxHeight` undefined and `minHeight` 240 when embedded (280 when not embedded).
- [ ] **Step 1d: Update** `ScanScreen.test.tsx:77`. It currently finds the frame via `getByText(deniedText).parent!.parent!`; switch to `getByTestId('scan-preview')` with the same `minHeight: 280` and `height: undefined` assertions. All other denied-state tests (one retry, settings only after retry fails, browser-specific help after a second denial) stay unchanged and must pass.
- [ ] **Step 2: Run** `cd apps/mobile && pnpm test -- src/features/scan` → the new tests FAIL.
- [ ] **Step 3: Implement** `CameraBlocked` and wire it into both screens. The offline and lookup-error `StatusPanel`s stay as they are (they are not camera states).
- [ ] **Step 4: Run** the same command, then `pnpm test` in `apps/mobile` → PASS.
- [ ] **Step 5: Check in the browser preview.** Open Scan home at 375×812 with the camera blocked (the browser pane blocks the camera by default), then at 200% text. Take screenshots for the PR. Also check native on a real phone with camera permission denied (Definition of Done).
- [ ] **Step 6: Commit** `feat(scan): show the camera-blocked state inside the dark camera frame (B2)`
