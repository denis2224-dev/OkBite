# OkBite — UI and copy polish

You are working in the OkBite repo. Read `AGENTS.md` first and follow it (branches, tests first, ≤400 changed lines per PR, light mode only, Romanian diacritics ș/ț, accessibility labels, decimal commas). The live app is `apps/mobile`. All UI text lives in `apps/mobile/src/copy/strings.ro.ts` and `strings.en.ts`; every copy change goes into **both** files with the same meaning.

## Goal

Make the app calmer and faster to read at the shelf. A shopper should understand each screen in about three seconds. Cut text that explains the obvious, repeats something said elsewhere, or describes how the system works. Keep only what helps someone decide or act.

Do not redesign the brand. Keep the existing tokens in `src/theme/tokens.ts` (green `#173A2A`, lime `#C8E07A`, warm ground, Bricolage Grotesque headings, Manrope body), the five-tab nav and the screen structure. This is a polish pass, not a new design.

## Rules that must not change

- Keep `"Calculat la 100 g; nu indică riscul unei boli."` / `"Calculated per 100 g; does not indicate disease risk."` next to every score, once.
- Keep exactly one allergen safety line on the result screen telling people to check the package. Shorten it; do not remove it.
- Keep the "Unverified" badge on user-added products.
- Do not change the meaning of the legal pages (Privacy, Terms, Method). Only fix formatting there (see section 6). A human reviews legal text.
- Do not touch `packages/shared/src/contract.ts` or migrations.
- When a test asserts on old copy, update the expected string to the new copy. Do not delete or weaken the assertion.

## Copy rules (apply everywhere)

1. One idea per text element. Hints and subtitles are one sentence, ideally under 70 characters.
2. If the heading or button already says it, delete the helper text.
3. Say each fact once per screen. "Saved only on this phone" appears at most once per screen.
4. Buttons start with a verb and say what happens: "Scanează un produs", "Adaugă produsul". The toast that follows uses the same verb ("Produs adăugat").
5. Sentence case. No ALL-CAPS labels (the Settings "LIMBĂ" label becomes "Limbă").
6. No middle-dot meta strings (`A · B`) in visible copy. Pick the one part that matters or use two lines.
7. Errors say what happened and what to do, in one or two short sentences. No apologies.
8. Use one name per action: "Scanează" for barcode, "Fotografiază eticheta" for the label path. Do not mix "Fotografiază produsul" and "Fotografiază eticheta" for the same action.
9. Name things in shopper language, not system language: no "bază de cunoștințe", "serviciu configurat", "procesare server", "SQLite", "IndexedDB" outside the legal pages.

## Changes by screen

Work in this order. Each numbered section is one branch and one PR (`UX1-…` to `UX7-…`).

### 1. Scan home (`features/scan/*`, `ui/InstallPrompt.tsx`)

- **Install prompt:** do not show it on first launch over the scanner. Show it only after the shopper has opened at least two product results, as a small dismissible bottom banner, never as a top sheet covering the screen. Once dismissed, do not show it again for 30 days. Shorten to title "Instalează OkBite" and button "Instalează"; drop the description.
- **Camera blocked state:** one short line plus one primary button. Replace the card's paragraph with "Permite accesul la cameră ca să scanezi." and the primary button "Încearcă din nou". The browser-specific instruction (iOS/Android) appears only after the shopper taps "Încearcă din nou" and it fails again.
- **Manual code:** collapse the always-open "Introdu codul manual" card into a single row/button ("Introdu codul") that expands the field in place. Remove the hint line "Cifrele de sub codul de bare: 8 sau 13." and keep it as the input placeholder "8 sau 13 cifre". Validation error stays: "Codul are 8 sau 13 cifre."
- **Hierarchy:** the scanner (or the blocked state) is the one dominant element. Secondary actions (manual code, label photo) are visually quieter: secondary buttons, not separate full cards. Avoid stacking three cards above the "Scanate recent" sheet.

### 2. Product result (`features/product/*`)

Target reading order: profile allergen alert (if any) → score card → why the score → allergens → ingredients → portion → source → report/original label.

- **Allergens card:** merge `missingAllergenNote` and `allergyNote` into one line: RO "Verifică mereu ambalajul: lista poate fi incompletă." / EN "Always check the package: this list may be incomplete." Remove the other string and its usage.
- **Unverified:** keep the badge; shorten `unverifiedNote` to RO "Adăugat de un utilizator; încă neverificat." / EN "Added by a shopper; not yet checked." Place it as the badge's caption, not a separate paragraph.
- **Ingredients card:** rename heading `transcribedLabel` to RO "Ingrediente" / EN "Ingredients". Replace `explainedWithSource` with RO "Explicate" / EN "Explained". Each explained ingredient shows name in bold and one line of explanation; the role line only if it adds something the name does not.
- **Partial data:** `insufficientNutrition`, `missing`, `categoryUnconfirmed` become one short line each, e.g. RO "Nu avem destule date pentru scor." / EN "Not enough data for a score." Remove "We do not estimate undeclared data." from the visible text (the Method page covers it).
- **Link tiles** (Ingredients, Portion): make them look tappable (chevron, full-width rows inside one card) instead of two half-width cards.
- Keep the score disclaimer once, directly under the score.

### 3. History (`features/history/*`)

- Remove the always-visible browser storage warning card (`pwa.storageWarning`). Show it once, as a dismissible one-line notice, only on web and only when history has at least one product: RO "Istoricul e salvat doar în acest browser." / EN "History is saved only in this browser."
- Subtitle `history.design.note`: RO "Disponibil și fără internet." / EN "Available offline." (drop the middle dot and the "saved on this phone" half).
- Empty state: title "Istoricul este gol" stays; body RO "Produsele scanate apar aici." / EN "Scanned products appear here."; button "Scanează un produs".
- Hide the search field while history is empty.
- `clearBody`: RO "Produsele vor fi șterse de pe acest telefon." / EN "Products will be removed from this phone."

### 4. Profile, Allergies, Onboarding (`features/profile/*`, `features/allergies/*`, `features/onboarding/*`)

- Onboarding subtitle per step: one line maximum. Remove `savedLocally` from steps 1 and 2; show it once, small, on the last step above "Gata, începem".
- Allergies `lead`: RO "Te avertizăm când un produs le conține." / EN "We warn you when a product contains them." Remove "Salvat doar pe acest telefon" from this screen (Profile already says it).
- Allergen chips: selected chips must be unmistakable without colour alone (filled green `#173A2A` with white text plus a check icon). Unselected chips stay soft. Keep the 14 allergens; sort them in the order shoppers most often need (Lapte, Gluten, Ouă, Arahide, Fructe cu coajă lemnoasă, Soia, Pește, Crustacee, Susan, Țelină, Muștar, Moluște, Lupin, Dioxid de sulf și sulfiți) only if no test or shared code depends on the current order; otherwise leave order as is.
- Add a section heading "Alergeni" above the chips so the screen mirrors "Vreau să evit".
- Profile: subtitle "Salvat doar pe acest telefon" stays as the single place for that fact.

### 5. Compare (`features/compare/*`)

- The empty screen shows two identical "Alege din istoricul tău" buttons with no context. Label the slots "Produsul A" and "Produsul B", each with the pick button inside, and add one line under the title: RO "Alege două produse din aceeași categorie." / EN "Pick two products from the same category."
- "Fotografiază alt produs" becomes a quieter secondary text button below the slots.
- Remove `compare.design.footnote` ("Scores are illustrative…") from the live (non-demo) view; keep it only in demo mode.

### 6. Settings, About, legal pages (`features/settings/*`, `features/about/*`, `features/legal/*`)

- Settings: "LIMBĂ" → "Limbă" in sentence case, same style as other group headings. Group rows: Language | App (Install, Restart profile setup, Clear history last, in red) | Info (How we calculate the score, Privacy, Terms, Version).
- About: today it has six blocks and repeats "Sursele noastre" twice and the method explanation that also lives on the Method page. Reduce to three short blocks:
  1. "Ce face OkBite" — RO "Scanezi un produs și vezi scorul, alergenii și ce înseamnă ingredientele." / EN "Scan a product to see its score, allergens and what the ingredients mean."
  2. "Scorul" — the five tier swatches, the required disclaimer, and a link "Cum calculăm scorul". No paragraph.
  3. "Gratuit, fără cont" — RO "Fără reclame și fără urmărire publicitară." / EN "No ads and no ad tracking."
  Then link rows: Surse, Confidențialitate, Termeni. Remove the duplicate "Sursele noastre" heading.
- Legal pages (Privacy, Terms, Method): do not reword. Improve formatting only: section titles as headings, body at a comfortable measure (max ~65 characters per line on wide screens), 1.5 line-height, more space between sections, and the "Text under review" draft notice as one small line at the top.

### 7. Add-product flow and offline (`features/add/*`, `features/offline/*`, `features/identify/*`)

Shorten the hints to one sentence each; examples:

| Key | New RO | New EN |
|---|---|---|
| `identify.confirmHint` | Verifică numele și cantitatea. | Check the name and quantity. |
| `identify.codeNotFound` | Codul ${code} nu e încă în bază. | Code ${code} isn't in our database yet. |
| `identify.nextTitle` + `nextSteps` | keep the three steps; drop the "What happens next" title if the steps are already numbered | same |
| `review.hint` | Corectează greșelile înainte de analiză. | Fix any mistakes before the analysis. |
| `review.unclearText` | Completează câmpurile marcate sau refă poza. | Fill in the marked fields or retake the photo. |
| `review.allergensHint` | Alergenii apar îngroșat pe etichetă. | Allergens are in bold on the label. |
| `add.draftInterrupted` | Citirea anterioară nu s-a terminat. Pozele nu au fost retrimise. | The last reading didn't finish. Photos weren't resent. |
| `offline.description` | Istoricul rămâne disponibil. Căutările se trimit când revine internetul. | History stays available. Searches are sent when you're back online. |
| `pwa.analysis.unknown` | Durează prea mult. Rezultatul nu e încă confirmat. | This is taking too long. The result isn't confirmed yet. |
| `pwa.analysis.retry` | Remove; the retry button is enough. | Remove. |

Apply the copy rules to the remaining strings in these features the same way. Romanian text must be natural Romanian, not a word-for-word translation of the English.

## Visual consistency (apply while touching each screen)

- One card per group of related content. No card inside a card. A screen should rarely have more than three cards above the fold.
- Radii: `radii.card` (20) for cards, `radii.small` (12) for inputs and rows, `radii.pill` for chips and segmented controls. Do not invent new values.
- Spacing: use only the `spacing` scale. 16 between items in a card, 24 between cards, 32 before a new section heading.
- Type: one screen title (Bricolage, existing size), section headings 18, body Manrope 15–16 with 1.45 line-height, captions 13 in `muted`. Helper text never uses the same weight as headings.
- Primary button: one per screen area. Everything else secondary or text.
- Tap targets at least 44×44. Visible focus ring using `focus` colour on web.
- Check every changed screen at 200% font size: no clipped text, buttons wrap rather than truncate.
- No new animations except feedback to a tap (expand manual code, chip selection).

## Process for each section

1. Branch `UX<n>-<short-name>` in its own worktree.
2. Update or add tests first for any behaviour change (install prompt timing, storage notice once, manual code collapse, search hidden when empty, compare footnote only in demo). See them fail.
3. Make the changes. Update both copy files.
4. Run `pnpm lint && pnpm typecheck && pnpm test`.
5. Start the web preview and screenshot the changed screens at 375×812 in Romanian and English; compare before/after and attach both to the PR.
6. PR description: list removed strings, changed strings (old → new) and why. End with the attribution lines required by the repo.

## Done when

- Every screen listed above follows the copy rules and the visual rules.
- No string in `strings.ro.ts` / `strings.en.ts` is unused after the change (remove dead keys and their types in the same PR as the last usage).
- Lint, typecheck and tests are green; screenshots are in each PR.
