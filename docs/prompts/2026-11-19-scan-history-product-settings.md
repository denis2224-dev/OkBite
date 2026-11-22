# OkBite — full-screen scan, simple history, product "In short", preferences in Settings, no bullets, smaller captions

You are working in the OkBite repo at `/Users/davidnenita/Documents/PWA/PWA_Moldova`. Read `AGENTS.md` first and follow it: one task per branch and PR, about 400 changed lines per PR at most, tests first (write the failing test, watch it fail, then implement), light mode only, Romanian ș/ț, every pressable has `accessibilityRole` + an `accessibilityLabel` from copy, screens work at 200% font size, decimal commas, "Calculat la 100 g; nu indică riscul unei boli." next to every score, no invented nutrition facts or thresholds.

**No AI attribution anywhere.** Commit messages and PR descriptions must not contain `Co-Authored-By: Claude`, "Generated with Claude Code", or any Claude/Anthropic/AI credit. In the PR template write "AI review by: Codex (pending)" and leave out the "AI author" line.

**Visual direction: Option A**, exactly as drawn in `docs/design-options/2026-11-19-option-a-final.html` (open it in a browser; it is the final mockup; build it exactly, and where it differs visually from the text below, the mockup wins). Exception: parts this prompt says stay "as they are today" (the product header and score, the allergen alert, the nav icons, the photo placeholder) are not restyled, even if the mockup draws them roughly. Build what it shows, using only the colours already in `apps/mobile/src/theme/tokens.ts` (`light`) and the fonts already in `fonts`. Do not add tokens, fonts or packages. If the mockup needs a colour that is not in `light`, use the closest existing one and list it in the report.

**This request is only what is written below. Do not add, rename or "improve" anything that is not named here.** Where something is not named, leave it exactly as it is today.

## Where things are

- Live app: `apps/mobile` (Expo / React Native + react-native-web, expo-router). Do not touch the root `src/`, `packages/shared/src/contract.ts`, `supabase/`.
- Tabs: `apps/mobile/app/(tabs)/_layout.tsx`, bottom bar `src/shared/AppBottomNav.tsx` (items: history, compare, index, allergies, profile).
- Scan: `src/features/scan/` (`ScanHome.tsx`, `ScanScreen.tsx`, `ScanScreen.web.tsx`, `ScanHeader.tsx`, `ScanModeSwitch.tsx`, `ScanReticle.tsx`, `RecentScans.tsx`, `ManualCode.tsx`, `torchSupport`).
- History: `src/features/history/HistoryScreen.tsx`, `BasketCard.tsx`.
- Product: `src/features/product/ResultView.tsx` and the cards it renders (`ScoreCard`, `WhyScore`, `AllergenSummary`, `ProfileAllergenAlert`, `CompositionCard`, `AdditivesCard`, `PortionSheet`, `SourceCard`).
- Allergies tab: `src/features/allergies/` (`AllergiesScreen`, `AllergenChips`, `AvoidSwitches`, `ToggleChip`), route `app/(tabs)/allergies.tsx`.
- Profile: `src/features/profile/ProfileScreen.tsx`, `ProfileLinks.tsx`, `useProfileEditor`. Settings: `src/features/settings/SettingsScreen.tsx`, route `app/(tabs)/settings.tsx`.
- Copy: `src/copy/strings.ro.ts`, `strings.en.ts`, `strings.ru.ts`. Every new key must exist in all three.
- Checks: `npx -y pnpm@11.25.0 --filter mobile test`, `npx -y pnpm@11.25.0 typecheck`, `npx -y pnpm@11.25.0 lint` (0 errors). Check visually on web in demo mode at 375×812 and at 200% text, and on a phone.
- Base branch: `main`. One PR per part below, in this order. Each part works on its own.

## Part 1 — Remove Alergii from the bottom bar, and move its content to Settings

1. `AppBottomNav.tsx`: remove the `allergies` item. The bar keeps History, Compare, Scan, Profile, in that order, with their routes and icons unchanged.
2. The Allergies screen is not deleted as content; it is split into two pages that open from Settings (Part 5):
   - **Allergen preferences** page: the allergen chips (`AllergenChips`) and nothing else from the old screen.
   - **Dietary preferences** page: the "I want to avoid" switches (`AvoidSwitches`: added sugar, sweeteners, ultra-processed, colourings, palm oil) and nothing else. These five switches are the app's existing dietary preferences; do not add new ones.
   - Both pages keep using `useProfileEditor` so saving, errors and retry behave as today. They have the screen title only (no extra text).
   - Keep the old `/allergies` route working by redirecting it to the allergen page, so existing links and tests do not break. `grep -rn "allergies" apps/mobile --include=*.ts --include=*.tsx` and fix every link, test and Maestro flow that points at the tab.
3. Settings and About keep opening from Profile as they do today.

Tests: nav shows four items; no item named Alergii; both new pages save a toggle to the profile; `/allergies` redirects.

## Part 2 — Scan page: camera only, full screen

The Scan tab shows **only the camera, scanning, a light button, a close-up button and the hint**. It looks like the label camera (`/capture`): the camera fills the whole screen, behind the status bar and the bottom bar.

1. `ScanHome.tsx`: remove everything except the camera. Remove from this page: the header/logo (`ScanHeader`), the Barcode/Label switch (`ScanModeSwitch`), the manual-code entry (`ManualCode`) and the recent-scans sheet (`RecentScans`). Do not delete those files or the `/capture` route; they just are not on this page. List them in the report as "no longer reachable from Scan".
2. The camera preview fills the screen (no rounded frame, no dark panel, no scrolling). Keep the scan reticle corners (`ScanReticle`) and the existing barcode types and haptics. Keep the existing permission-denied, error, offline and "working" states, drawn full screen.
3. Two round buttons, top left, stacked: **light** (torch, uses the existing torch state and `torchSupported`) and **close-up** (camera zoom, `CameraView` `zoom` prop, toggles between no zoom and one fixed zoom that clearly magnifies on a real phone; say the value in the report). Style: 46 px circles, dark translucent when off, white fill with dark icon when on (see the first reference image and the mockup). Same size on and off; only colours change. Light turns off when leaving the tab (as today). Close-up resets to off when leaving the tab. On web, hide a button when the browser cannot do it (as `torchSupported` does today).
4. Hint pill near the bottom, above the bar: the existing hint copy for scanning a barcode. Reuse the existing key; if there is none, add one in ro/en/ru.
5. Bottom bar on the Scan tab only: no cream background band; the bar floats over the camera (same four items, same shape, translucent as in the mockup). On every other tab it is unchanged.
6. Light status bar text on this page (already done today); keep it.

New copy (all three languages): accessibility labels for the light button and the close-up button, including on/off state. Nothing else.

Tests: Scan renders the camera, two buttons and the hint, and none of the removed parts; toggling each button changes only colours (flatten both states' styles, drop colour keys, assert equal); light and close-up reset on blur.

## Part 3 — History: photo, rating, verdict

Each row of History shows **only**: the product photo on the left, and to its right the rating (the existing score number) with the verdict under it (the existing tier word: Excelent, Bun, …). No dot or other marker before the verdict.

- Photo: `product.imageUrl` when it exists (the same source the product page uses); otherwise the existing neutral tile. Fixed size, so rows do not jump while images load.
- Rating and verdict come from the existing `productScoreFor` / `ro.tiers`, coloured with the existing tier colours. Rows without a score keep the existing "no score" text in the rating position.
- Remove from History: the product name and the saved-time line from the row, the basket summary card (`BasketCard`), the search field and its "no matches" text, and the printed disclaimer caption under the list. Keep the screen title, the empty state, the loading and error states, the clear-history button with its confirmation, long-press to remove with undo, and the link to the offline queue. Keep tapping a row opening the product.
- The accessibility label of each row still contains the product name, score, tier, source and dates (screen readers still get everything), because rule 4 in `AGENTS.md` and the disclaimer requirement still apply to them.

Tests: a row shows photo + rating + verdict and no name; tap opens the product; remove/undo and clear still work.

## Part 4 — Product page: In short, What's inside, Additives, Ingredients

Order of the page, top to bottom. The section headings **In short**, **What's inside** and **Additives** are small uppercase green labels with a thin line after them, as in the mockup (Additives also shows its count in a small pale badge, as today); these headings are required by this request. Ingredients has no such heading, only the card title.

1. Top bar and the product header/score (`ScoreCard`), the profile-allergen alert and the allergen summary stay exactly as they are today.
2. **In short** (replaces `WhyScore`): one card with
   - each line starts with a small existing icon from the app's `Icon` set (an alert triangle for the verdict; for the components, the closest existing icons), never a dot or bullet;
   - one verdict line saying whether the product is recommended, taken from the existing score tier. Do not invent a new rule;
   - up to three lines naming the most impactful components, chosen from the reasons `WhyScore` already computes (for example high sugar, high salt, additives), each with its value from product data.
   Every statement must come from data and rules already in the code. If there is no score, show only what exists (as `PartialNutritionCard` does today).
3. **What's inside** (restyles `CompositionCard`): one white card, one row per nutrient the product has. Each row: name on the left, value on the right, **a thin horizontal line bar** under them (6 px tall, rounded, light track, dark green fill, a warm red fill when the existing code rates the nutrient as high), and under the bar one **small caption** with the existing level word. **No dots anywhere.** If the code has no sourced classification for a nutrient, show name and value only, with no bar and no caption. The bar length must come from an existing sourced rule; if there is none, omit the bar. No new thresholds, no teaspoon or "% of the day" figures unless they already exist in the code.
4. **Additives**: the existing additives content (`AdditivesCard`), restyled as in the mockup (a small leaf icon with the group name "Risk-free" above the additive chips, each chip with its code and name separated by a space, not a dot, and a small chevron); tapping an additive opens the existing sheet.
5. **Ingredients**: a white card with the title "Ingredients" on the left and, on the right, a **chevron button that points down** (the same chevron the app uses for "next", turned to point down; it turns to point up when open). Tapping the card header (the whole row, at least 44 px tall) opens or closes the text. Open by default. Inside: the full ingredient list as one **block of running text like the label on the package**, in the label's own order and wording, starting with the word "Ingredients:" in bold, inside a pale cream box with a thin border and small rounded corners (see the mockup). It is plain text separated by commas, not a list, with no markers. Use the same data the ingredients page uses today. The button has `accessibilityRole="button"`, an `accessibilityLabel` from copy, and `accessibilityState={{ expanded }}`. The existing "Ingredients" link row to `/product/[id]/ingredients` is removed from this page because the text is now here; the route itself stays. If the product has no ingredient text, show nothing (as today).
6. Everything else that is on the page today stays below, unchanged and in its current order: portion link and sheet, add-nutrition button, original label photo link, source card, report sheet.

Tests: each section renders from a product fixture, with and without score, with no additives, with no ingredients; In short contains only strings derived from fixture data.

## Part 5 — Settings and Profile

**Settings** is a grouped list like the third reference image: small grey group labels, white rounded groups, rows with a green icon tile on the left, the label and a chevron (only the Language row also shows its value on the right, in green). Group labels here are required by this request (this overrides rule 4 of `docs/prompts/2026-11-18-calm-kit-restyle.md` for Settings only). Groups and rows, only these, all existing features:

- **Profile**: Dietary preferences → opens the page from Part 1; Allergen preferences → opens the page from Part 1. **No value and no count** on these two rows (no "N selected"); just the icon, the label and the chevron.
- **Language**: Language (value on the right: the current language name, not a count) → opens a simple list of the existing choices (Română, Русский, English) and sets the language with the existing logic.
- **App**: Install app, and Clear history (keeps its confirmation dialog). Keep "reset onboarding" where it exists today.
- **Information**: Method, Privacy, Terms, then the version line as today.

**Every row label stays on one line.** No wrapping and no ellipsis: rows are laid out so the longest label ("Allergen preferences", in Romanian "Preferințe alergeni", and the Russian equivalents) fits at normal text size on a 375 px wide screen; use `numberOfLines={1}` with `adjustsFontSizeToFit` and a minimum scale of 0.85 as the safety net. At 200% text size the label is allowed to wrap, because rule "screens work at 200% font size" wins there.

Do not add rows that do not exist today (no Region, Weight unit, Notifications, Subscription or free trial: the app has none of these and AGENTS.md says no payment code).

**Profile** keeps its goals and the Settings/About links, and now also shows two white cards, one for the user's chosen **dietary preferences** and one for **allergen preferences**, as in the mockup. Each card has a header row: the title on the left, and on the right a small **Edit** link: plain text only, 12.5 px, semibold, in `primary`-family green (`good` colour), with **no background, no border, no pill and no chevron**. It must stay clearly visible. Make the tap area at least 44 px tall with `hitSlop` while the drawn text stays small. The title and the Edit text must be far apart and never touch: put them in a row with `justifyContent: 'space-between'` and a gap of at least 24 px, the title may not wrap into the Edit text, and the Edit text never shrinks. Under the header, 12 px of space, then the chosen items as chips, wrapping onto more lines as needed. Selected state follows the app's selection rule: same size, only colours change. If nothing is chosen, show the header row only. No counts anywhere.

New copy (all three languages): group labels, Edit, the two page titles, and the label for the ingredients toggle. Nothing else.

Tests: Settings shows exactly these groups and rows, with no "selected" text; the language value updates after changing the language; each label renders with `numberOfLines` 1; Profile shows selected chips and an Edit text link with no background that opens the pages.

## Part 6 — Whole app: no bullets, smaller captions

1. **Remove every bullet point from everything the user can see.** This means list markers and decorative dots: "•", "·" used as a separator in visible text (for example "Very sugary · 6 teaspoons", "E101 · Riboflavin", "Risk-free · 3", "Excelent · Luni"), coloured dots next to a verdict or tier word, and small round `View`s used as markers. Do it everywhere: History, product page, Compare, Profile, Settings, onboarding, sheets, toasts. Replace a separator dot with a comma, a new line, or just the spacing, whichever reads best, and never with another symbol. Do **not** remove real icons (the alert triangle, leaf, chevrons, camera, and so on) or the dots used by the nav/pager indicators. Method: search `apps/mobile/src` and `apps/mobile/app` for the characters • and · (and the escapes \u2022 and \u00b7), and look for small circular `borderRadius` Views. Text read only by screen readers (the `accessibilityLabel` strings) may keep its separators. List each place you changed in the report.
2. **Smaller captions and detail text.** In `src/theme/tokens.ts` set `typeScale.caption` to `{ fontSize: 12, lineHeight: 17 }` (from 13/19). Text that is a detail line under a row or a value (for example the level word under a nutrient bar, the saved-time lines, the disclaimer line) uses a new `typeScale.detail` of `{ fontSize: 11, lineHeight: 15 }`, and nothing visible goes below 11. Apply it through the tokens and the `Caption` component, not screen by screen. Colour stays `textSecondary`/`muted` (contrast at least 4.5:1). Body, titles, buttons and row labels do not change size.
3. Tests: no visible string contains "•" or " · " (render the main screens and assert); caption and detail styles use the new token values; the 200% text layouts still do not clip.

## Hard rules

1. Visual and navigation changes only. No changes to scoring, data models, the API, storage format, onboarding logic, or the offline queue.
2. Light mode only. No new dependencies.
3. Selection changes colour only (size, padding, border width, font weight identical when selected and unselected).
4. Every tappable element is at least 44 px and has an accessibility label.
5. If something in this prompt cannot be done without adding something it does not mention, stop that part and ask.

## Report at the end of each PR

- What changed, per file.
- What was removed from a screen but still exists in the code (Scan's header, mode switch, manual code, recent scans; History's basket card and search).
- The close-up zoom value you chose.
- Any colour you had to substitute.
- Any existing test you replaced, and why.
