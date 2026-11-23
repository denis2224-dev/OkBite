# OkBite — "Cele mai bune produse" page (top 3 per product type)

You are working in the OkBite repo at `/Users/davidnenita/Documents/PWA/PWA_Moldova`. Read `AGENTS.md` first and follow it: one task per branch and PR (branch from current `main`, e.g. `top-products-page`), about 400 changed lines at most, tests first (write the failing test, watch it fail, then implement), light mode only, Romanian ș/ț, every pressable has `accessibilityRole` + an `accessibilityLabel` from copy, screens work at 200% font size, decimal commas, no invented facts, thresholds or sources.

**No AI attribution anywhere.** Commit messages and PR descriptions must not contain `Co-Authored-By: Claude`, "Generated with Claude Code", or any Claude/Anthropic/AI credit. In the PR template write "AI review by: Codex (pending)" and leave out the "AI author" line.

**This request is only what is written below. Do not add, rename or "improve" anything that is not named here.** Where something is not named, leave it exactly as it is today.

## What to build

1. **History stays exactly as it is.** The only change is one new text button: **"Cele mai bune produse"** followed by a chevron (`>`), plain text with no box, border or background, in the dark green text colour (`primary`), bold, 15 px, at least 44 px tall to tap. Put it on its own line right under the History title and above the list, left aligned. It is shown always: with an empty history, with 1 product and with 100. It does not depend on what is in History. It opens the new page. (A shorter label is fine if the longer one does not fit one line at 200% text: "Cele mai bune".)
2. **A new page "Cele mai bune produse"** (a normal pushed route, e.g. `apps/mobile/app/top-products.tsx`, not a tab, not on the bottom bar):
   - Title "Cele mai bune produse".
   - A row of type chips under the title, horizontally scrollable, one chip per product type (industry). The chosen chip is dark green with white text; the others are the soft grey chip. Selection changes colour only: same size, padding, border and font weight for every chip, no icon.
   - Under the chips, the **3 best products of the chosen type**, as numbered rows 1, 2, 3 (a ranking, so numbers are right here). Each row: the rank number, the product photo (existing neutral tile when there is no photo), the product name with its brand under it in small text, and on the right the score number with its tier word under it (existing tier colours). The first row has a 2 px dark green outline; the others have none (the outline is the only difference besides content).
   - Tapping a row opens the product page (`/product/[id]`).
   - Types offered: the existing shelves in `apps/mobile/src/features/shelf/shelves.ts`, in their order, **except fruits and vegetables** (`fructe-legume`): all of those are good, so a top for them says nothing. `necunoscut` stays out as today. The first type is chosen when the page opens.
   - Data: reuse what "Cel mai bun din raft" already uses: `useTopProducts(slug)`, `rankTop(…, 3)` (verified products only, best score first, ties by name), `ShelfPickRow` styling where it fits, and the same type names from `ro.scan.shelf.names`. Do not call a new backend function and do not change the shared contract.
   - States: loading (existing loading pattern), error with a retry button (reuse the existing copy and behaviour from `ShelfPicks`), empty (reuse `ro.scan.shelf.empty`), and fewer than 3 products (show only those, no empty slots).
   - No other text on the page: no description, no disclaimer line, no counts, no captions, no bullets or middle dots.
3. **Swipe-back must work on this page like on the other pushed pages**, and the History page keeps its current (no swipe-back) behaviour as a bottom-bar page. Do not touch `EdgeSwipeBack`, `swipeBack.ts` or `_layout.tsx` unless a test shows this page does not get the same swipe-back as `/preferences/dietary`. Add a test that `swipeBackEnabled('/top-products')` is true and that `usesCustomSwipe` treats it like the other pushed pages (native stack swipe on phones, custom drag on the web). Verify on web that dragging from the left edge goes back to History.

## Where things are

- Live app: `apps/mobile` (Expo / React Native + react-native-web, expo-router). Do not touch the root `src/`, `packages/shared/src/contract.ts`, `supabase/`.
- History: `src/features/history/HistoryScreen.tsx`. Shelf code: `src/features/shelf/` (`shelves.ts`, `topProducts.ts`, `useTopProducts.ts`, `ShelfPicks.tsx`, `ShelfPickRow.tsx`, `ShelfIcon.tsx`). The `top-products` API call is `api.topProducts(category)` in `src/lib/api.ts` (it also has a demo mode).
- Existing chips and selection style to match: `src/features/compare/CategoryFilter.tsx` and `src/features/allergies/ToggleChip.tsx`. Tokens in `src/theme/tokens.ts`; use only existing colours and fonts.
- Copy: `src/copy/strings.ro.ts`, `strings.en.ts`, `strings.ru.ts`. Every new key must exist in all three: the button/page title ("Cele mai bune produse" / "Best products" / "Лучшие продукты"), the accessibility label of the History button, and the accessibility label of a chip and of a row (rank, name, score, tier). Nothing else.
- Checks: `npx -y pnpm@11.25.0 --filter mobile test`, `npx -y pnpm@11.25.0 typecheck`, `npx -y pnpm@11.25.0 lint` (0 errors). Check visually on web in demo mode (set `EXPO_PUBLIC_PREVIEW=1` and blank the Supabase variables on the command line, do not edit `.env.local`) at 375×812 and at 200% text.
- The Playwright specs in `e2e-web/` run in CI. If a spec looks at History, keep it passing; add a short spec only if it is cheap. Run `pnpm e2e:web:build` with `EXPO_PUBLIC_NUTRITION_ENRICHMENT=1` before running them locally, as CI does.

## Tests (write first)

- History shows the button with an empty history, with 1 product and with many; it opens `/top-products`; the History rows, header, clear button, offline link and everything else are unchanged.
- The page lists the types from `shelves` without `fructe-legume` and without `necunoscut`, the first one chosen; choosing another chip loads its top 3; chips differ only by colour when chosen (flatten styles, drop colour keys, assert equal).
- Ranking: rows are 1 to 3, best score first, only verified products with a score, fewer than 3 shows fewer rows; the first row has the outline and the others do not.
- A row opens `/product/[id]`; loading, error + retry, and empty states render; no text on the page besides the title, chips, rows and the state messages; no "·" or "•" anywhere.
- Copy exists in ro, en and ru (the existing copy tests must pass).
- Swipe-back tests as described above.

## Hard rules

1. Visual and navigation changes only. No changes to scoring, data models, the API, storage format or the offline queue.
2. Light mode only. No new dependencies.
3. Every tappable element is at least 44 px tall and has an accessibility label.
4. If something in this prompt cannot be done without adding something it does not mention, stop that part and ask.

## Report at the end

- What changed, per file.
- Which types are offered and which are left out.
- Any colour or component you had to substitute.
- Any existing test you changed, and why.
- What you checked on web, and what still needs a real phone (the native swipe-back).
