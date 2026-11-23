# Remove filler text from page headers and screens

Read `AGENTS.md` first and follow it (TDD, one branch and one PR, Romanian copy with ș/ț, light mode only, no dark styles).

## Goal

Every line of text in the app must tell the shopper something they need, or help them act. Remove taglines, reassurances and "where your data lives" notes that sit under page titles and add nothing. The title alone is enough.

Branch: `B9-remove-filler-text` from the latest `main`. Work in your own git worktree.

## Rule to apply

Keep text only if it does one of these:
- names the content (a title or section name);
- tells the shopper what to do next when they could not guess it (an empty state, an error, a permission step);
- gives a fact the shopper needs for a decision (score disclaimer "Calculat la 100 g; nu indică riscul unei boli.", allergen safety notes, OFF/unverified source notes, the category being compared).

Remove it if it is a slogan, repeats the title, describes how the app works internally, or reassures about storage or offline use without the shopper having asked.

Do NOT remove: the score disclaimer, `missingAllergenNote`, the "Verifică ambalajul" safety text, `offNote` / `unverifiedNote` in the source card, error and permission texts, confirmation dialogs (e.g. "Ștergi tot istoricul?"), empty-state text, legal pages.

## Known items to remove (found in the code; confirm each on screen)

1. **Istoric**: the subtitle `history.design.note` "Disponibil și fără internet." (`src/features/history/HistoryScreen.tsx`, `TabPageHeader subtitle={copy.note}`).
2. **Istoric**: the dismissible banner `history.design.storageNotice` "Istoricul e salvat doar în acest browser.", along with its dismiss state and storage key if nothing else uses them.
3. **Alergii**: the subtitle `allergies.lead` "Te avertizăm când un produs le conține." (`src/features/allergies/AllergiesScreen.tsx`).
4. **Profil**: the line `profile.savedLocally` "Preferințele sunt salvate doar pe acest telefon." under the title (`src/features/profile/ProfileScreen.tsx`).
5. Any other `savedLocally` "Salvat doar pe acest telefon" or `history.saved` "Salvat pe acest telefon" line shown as decoration. Check onboarding (`OnboardingScreen.tsx` uses one of these) and remove it only where it is filler, not where it answers a choice the shopper just made.
6. **Comparație**: keep `compare.subtitle(category, unit)` because it names the category being compared. Remove `compare.hint` "Alege două produse din aceeași categorie." only if the empty state already explains this. If the hint is the only explanation, keep it.

Then audit every other screen yourself for the same pattern: Scanează home, the result sheet, Ingrediente, Porție, Setări, Despre, onboarding, the add-product flow and offline screens. List each extra item you remove in the PR description with a one-line reason. If you are unsure about an item, leave it and list it under "Kept, needs a decision".

## Implementation notes

- `src/shared/TabPageHeader.tsx` always renders the subtitle `<Text>` with `minHeight: 18.85`, so an empty subtitle still leaves a gap. Render the subtitle only when it is given, and adjust the header's bottom padding so pages without a subtitle still look balanced (check against `docs/prototype/Main.dc.html`).
- Delete removed keys from `strings.ro.ts`, `strings.en.ts` and `strings.ru.ts` together. Do not leave unused copy. Update `src/copy/redesign.test.ts`, `ro.test.ts` and other copy tests that list these keys.
- Update unit tests that assert the removed text (`HistoryScreen`, `AllergiesScreen.test.tsx`, `ProfileScreen.test.tsx`, `OnboardingScreen.test.tsx`, and any others grep finds). Assert the text is now absent; never delete a test just to make it pass.
- Search `e2e-web/` for the removed strings and update those specs too.
- Keep each changed file under ~200 lines and the PR under ~400 changed lines; split into two PRs (tab headers / other screens) if needed.

## Done when

- `pnpm lint && pnpm typecheck && pnpm test` is green.
- `EXPO_PUBLIC_NUTRITION_ENRICHMENT=1 pnpm e2e:web:build && EXPO_PUBLIC_NUTRITION_ENRICHMENT=1 pnpm e2e:web` passes.
- Screenshots of Istoric, Comparație, Alergii and Profil (before and after, phone width, Romanian) are attached to the PR, taken in the browser preview.
- The PR description lists every removed string, every extra one found in the audit, and anything kept for a decision.
