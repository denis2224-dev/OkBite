# OkBite R4 · App Foundation and Product Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-04-okbite-overall.md` (Global Constraints, Review Focus, who owns what, dependencies) and the spec before your first task. Steps marked **(human)** are done or checked by the person, not the agent. Task IDs keep their original letters (A = content, B = app, C = backend, D = platform/AI) so cross-references stay stable.

**Goal:** The app shell, theme, UI kit, typed API client and Romanian copy, then the screens a shopper reads: result, ingredients, label, compare, history (offline), legal pages, and the final accessibility and polish pass — on iOS, Android and web.

**Owns (only this role edits these paths):** `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/`, `apps/mobile/app/product/`, `apps/mobile/app/(info)/`, `apps/mobile/app/offline.tsx`, `apps/mobile/src/{theme,ui,copy}/`, `apps/mobile/src/lib/` except `errorReporter.ts`, `apps/mobile/src/features/{product,compare,history,offline,share,legal}/`

**Tasks in order:** A1 → B1 → B4 → B5 → B6 → A4 → B8

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Role-specific: A1 (copy) and B1 (shell, UI kit, API client) are the app-side foundation — the graph shows B1 bridges five areas of the project. Merge both by 8 Nov, because R5 builds on them. Put platform differences in `*.web.ts(x)` files.

## Review Focus (owned here)

- Missing kcal/sugar/sat/salt → "Scor indisponibil", never "0 din 100" (B4).
- Offline: history opens and results fall back to history (B6).
- Every key other roles use exists in `ro.ts` with the agreed name (A1).

---

### Task A1: Romanian copy file (fully specified structure)

**Files:**
- Create: `apps/mobile/src/copy/ro.ts`
- Test: `apps/mobile/src/copy/ro.test.ts`

**Interfaces:**
- Produces: `export const ro = { … } as const;`, `export type Copy = typeof ro;`, and `plural(n: number, one: string, many: string): string` ("1 produs", "2 produse", "20 de produse" — "de" when `n % 100` is 0 or ≥ 20 and `n ≥ 20`).
- Top-level sections, exactly: `app, nav, home, capture, identify, scan, result, score, ingredients, compare, add, review, history, offline, errors, share, legal`.
- Keys other roles already reference (must exist with these names): `home.title`, `home.photoButton`, `home.scanLink`, `capture.working`, `scan.manualInvalid`, `result.scoreUnavailable`, `result.unverifiedNote`, `result.teaspoons` (object with `underHalf`, `half`, `one`, `many: (n: string) => string`), `score.ringLabel: (score: number, grade: string) => string`, `score.disclaimer`, `ingredients.explanationSoon`, `compare.otherCategory`, `review.unclearField`, `scan.webManualOnly` (browser without barcode reading: "În acest browser introdu codul de mână sau fotografiază produsul.").

- [ ] **Step 1: Failing tests**

```ts
import { ro, plural } from './ro';
it('has every section in order', () => {
  expect(Object.keys(ro)).toEqual(['app','nav','home','capture','identify','scan','result','score','ingredients','compare','add','review','history','offline','errors','share','legal']);
});
it('uses comma-below diacritics only', () => { expect(JSON.stringify(ro)).not.toMatch(/[şţŞŢ]/); });
it.each([[1, '1 produs'], [2, '2 produse'], [19, '19 produse'], [20, '20 de produse'], [101, '101 produse'], [120, '120 de produse']])(
  'plural %i', (n, s) => expect(plural(n, 'produs', 'produse')).toBe(s));
it('has the score disclaimer verbatim', () => {
  expect(ro.score.disclaimer).toBe('Calculat la 100 g; nu indică riscul unei boli.');
});
```
Run: `pnpm --filter mobile test src/copy` → Expected: FAIL.

- [ ] **Step 2: Fill `ro.ts`** — every visible string from `docs/prototype/Main.dc.html`, plus the new photo-first strings: home "Fotografiază produsul", capture working state ("Caut produsul…"), identify ("Este acesta?", "Alege produsul", "Nu e niciunul"), add ("Fotografiază lista de ingrediente", "Acum tabelul nutrițional", "Sunt pe aceeași poză"), the "Neverificat" badge and its note ("Adăugat de un utilizator. Echipa îl verifică în curând."). One key per string, camelCase names describing purpose; strings with numbers are functions.
- [ ] **Step 3: Verify** — tests PASS; **(human)** read every string in the context of its screen.
- [ ] **Step 4: Commit** — `feat(copy): Romanian copy for all screens`. Tell R5 the keys are merged.

---

### Task B1: App shell, theme, UI kit and API client (fully specified)

**Files:**
- Create: `apps/mobile/app/_layout.tsx` (replace D1's), `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/(tabs)/compare.tsx`, `apps/mobile/app/(tabs)/history.tsx` (placeholders for B5/B6)
- Create: `apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/theme/useTheme.ts`
- Create: `apps/mobile/src/ui/Button.tsx`, `Card.tsx`, `ScoreRing.tsx`, `AllergenChip.tsx`, `Badge.tsx`, `Screen.tsx`, `Toast.tsx`, `index.ts`
- Create: `apps/mobile/src/lib/device.ts`, `apps/mobile/src/lib/device.web.ts` (same API, `localStorage`), `apps/mobile/src/lib/api.ts`, `apps/mobile/src/lib/supabase.ts`, `apps/mobile/src/lib/format.ts`, `apps/mobile/src/test/fixtures.ts`
- Test: `apps/mobile/src/lib/api.test.ts`, `device.test.ts`, `format.test.ts`, `apps/mobile/src/ui/ScoreRing.test.tsx`, `apps/mobile/app/__tests__/index.test.tsx` (update)

**Interfaces:**
- Consumes: contract from `@okbite/shared` (C1); `ro` from `src/copy/ro.ts` (A1).
- Produces (all later tasks and C7, D7 use these names):
  - `getDeviceId(): Promise<string>` — UUID created once, kept in secure store key `okbite.deviceId`.
  - `api.lookup(by: { code: string } | { id: string }): Promise<LookupResponse>`, `api.identify(photoBase64: string): Promise<IdentifyResponse>`, `api.readLabel(req: ReadLabelRequest): Promise<ReadLabelResponse>`, `api.addProduct(req: AddProductRequest): Promise<LookupResponse>`, `api.report(req: ReportRequest): Promise<void>`.
  - `class ApiError extends Error { code: ErrorCode | 'offline' | 'invalid_response' }`.
  - `formatAmount(n: number): string` — Romanian decimal comma: 0 decimals ≥ 100, 1 decimal ≥ 1, else 2, trailing zeros dropped.
  - UI: `<Button variant="primary|secondary|ghost">`, `<Card>`, `<ScoreRing score={number|null} grade={Grade} />`, `<AllergenChip name={Allergen} />`, `<Badge tone="unverified|info">`, `<Screen title back?>`, `useToast()`, `useTheme()` (light/dark from the system).

- [ ] **Step 1: Failing tests**

```ts
// src/lib/api.test.ts
it('sends the device id and validates a found product', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(foundYogurt)));
  const r = await api.lookup({ code: '4840001000014' });
  expect(fetchMock.mock.calls[0][1].headers['x-device-id']).toMatch(/^[0-9a-f-]{36}$/);
  expect(r.status).toBe('found');
});
it('throws invalid_response when the body breaks the contract', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'found' })));
  await expect(api.lookup({ code: '4840001000014' })).rejects.toMatchObject({ code: 'invalid_response' });
});
it('throws offline when the network fails', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(api.identify('aGVsbG8=')).rejects.toMatchObject({ code: 'offline' });
});
it('maps error bodies to codes', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'rate_limited', message: 'x' }), { status: 429 }));
  await expect(api.addProduct(validAdd)).rejects.toMatchObject({ code: 'rate_limited' });
});
// src/lib/format.test.ts
it.each([[13.2, '13,2'], [0.1, '0,1'], [478, '478'], [2.56, '2,6'], [4, '4']])('formatAmount(%s)', (n, s) => expect(formatAmount(n)).toBe(s));
// src/ui/ScoreRing.test.tsx
it('labels the score for screen readers', () => {
  render(<ScoreRing score={78} grade="good" />);
  expect(screen.getByLabelText('78 din 100, calitate nutrițională bună')).toBeTruthy();
});
```
(`foundYogurt` and `validAdd` live in `src/test/fixtures.ts`; `foundYogurt` is the seeded product `4840001000014` as a `LookupResponse`.)
Run: `pnpm --filter mobile test` → Expected: FAIL.

- [ ] **Step 2: Implement** `device.ts`, `api.ts` (base `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1`; headers `x-device-id`, `apikey`, `Authorization: Bearer <anon key>`; GET for lookup, POST JSON otherwise; 20 s timeout → `offline`), `format.ts`, `supabase.ts` (`createClient` with AsyncStorage session, used only by the admin screens).
Run: `pnpm --filter mobile test src/lib` → Expected: PASS.

- [ ] **Step 3: Theme and UI kit** — tokens copied from the prototype (ground, ink, grade colour sets good/medium/low/neutral, radii, spacing) with dark variants; every pressable has `accessibilityRole`, `accessibilityLabel` and a 44 pt minimum; text uses `allowFontScaling` and wraps at 200%. `ScoreRing` is an SVG with `accessibilityLabel` from `ro.score.ringLabel`.
Run: `pnpm --filter mobile test src/ui` → Expected: PASS.

- [ ] **Step 4: Shell** — root `_layout.tsx` loads fonts and sets the theme (D7 adds the error-reporter call in its own PR); tabs Acasă / Compară / Istoric; the home screen shows `ro.home.title`, the big `ro.home.photoButton` (→ `/capture`), the `ro.home.scanLink` (→ `/scan`) and the score legend.
Run: `pnpm lint && pnpm typecheck && pnpm test` → Expected: exit 0. Open on both phones via the PR's QR code and in Safari and Chrome via the browser preview link.

- [ ] **Step 5: Commit** — `feat(mobile): app shell, theme, UI kit and typed API client`

---

### Task B4: Result screen

**Files:**
- Create: `apps/mobile/app/product/[id]/index.tsx`, `apps/mobile/src/features/product/useProduct.ts`, `ResultView.tsx`, `ScoreCard.tsx`, `PortionTable.tsx`, `SourceCard.tsx`, `ReportSheet.tsx`, `portion.ts`
- Test: `apps/mobile/src/features/product/portion.test.ts`, `ResultView.test.tsx`

**Interfaces:**
- Consumes: `api.lookup({ id })`, UI kit (B1), `saveToHistory` (B6; until B6 merges, `useProduct` calls the stub exported from `src/features/history/store.ts`, which B6 replaces).
- Produces: `useProduct(id): { data?: { product: Product; score: ScoreResult }; error?: ApiError; loading: boolean }`; `perPortion(per100: number, portionAmount: number): number`; `percentOfReference(key: 'kcal'|'sugar'|'sat'|'salt', amount: number): number` (2000 / 90 / 20 / 6); `teaspoons(sugarGrams: number): string` (4 g each, nearest half, texts from `ro.result.teaspoons`).

- [ ] **Step 1: Failing tests** — `perPortion(13.2, 150) === 19.8`; `percentOfReference('sat', 2.4) === 12`; `teaspoons(19.8)` → "5 lingurițe"; `teaspoons(1.5)` → "sub jumătate de linguriță"; `ResultView` with `score: null` shows `ro.result.scoreUnavailable` and no text "0 din 100"; status `unverified` shows the "Neverificat" badge and `ro.result.unverifiedNote`; allergens `['Lapte']` show the chip; the disclaimer `ro.score.disclaimer` is always present.
- [ ] **Step 2: Implement** per the prototype's "Analiza produsului": allergens and may-contain, score card with reasons, portion table, source card (source, added date, verified date or "Neverificat"), "Vezi eticheta originală", "Raportează o greșeală" (sheet → `api.report`), links to ingredients and compare.
- [ ] **Step 3: Verify and commit** — tests PASS; all 6 seeded products checked on a phone against the prototype; `feat(mobile): product result screen`

---

### Task B5: Ingredients, label and compare screens

**Files:**
- Create: `apps/mobile/app/product/[id]/ingredients.tsx`, `apps/mobile/app/product/[id]/label.tsx`, `apps/mobile/app/(tabs)/compare.tsx` (replace placeholder), `apps/mobile/src/features/compare/compare.ts`, `ProductPicker.tsx`
- Test: `apps/mobile/src/features/product/ingredients.test.tsx`, `apps/mobile/src/features/compare/compare.test.ts`

**Interfaces:**
- Produces: `compareRows(a: Product, b: Product): { key: NutrientKey; a: number|null; b: number|null; better: 'a'|'b'|null }[]` — lower is better for kcal, fat, sat, sugar, salt; higher for protein, fiber; `null` if either side is missing or equal.

- [ ] **Step 1: Failing tests** — ingredients grouped base, fat, taste, add, cult (names from `ro`), each row expands to role, explanation and "Sursa explicației"; ingredients with `slug: null` show `ro.ingredients.explanationSoon`; `compareRows` for yogurts 014 vs 021: sugar → `a`, protein → `a`; different categories → `ro.compare.otherCategory` and no table.
- [ ] **Step 2: Implement** — ingredients and label screens per the prototype; compare tab: pick A and B from history (same category first) or "Fotografiază alt produs".
- [ ] **Step 3: Verify and commit** — tests PASS; `feat(mobile): ingredients explained, original label and compare`

---

### Task B6: History and offline queue

**Files:**
- Create: `apps/mobile/src/features/history/db.ts`, `store.ts` (replace B4's stub), `apps/mobile/app/(tabs)/history.tsx` (replace placeholder), `apps/mobile/src/features/offline/queue.ts`, `apps/mobile/src/features/offline/useQueueFlush.ts`, `apps/mobile/app/offline.tsx`
- Modify: `apps/mobile/src/features/product/useProduct.ts` (R5 wires the queue into `useCaptureFlow` in their B2 step 2c, so you never edit R5's files)
- Test: `apps/mobile/src/features/history/store.test.ts`, `apps/mobile/src/features/offline/queue.test.ts`

**Interfaces:**
- Produces: `saveToHistory(entry: { product: Product; score: ScoreResult }): Promise<void>`, `listHistory(): Promise<HistoryEntry[]>` (newest first, max 200), `getFromHistory(id): Promise<HistoryEntry | undefined>`, `clearHistory(): Promise<void>`, `enqueue(item: { kind: 'photo'; uri: string } | { kind: 'code'; code: string }): Promise<void>`, `flushQueue(): Promise<{ resolved: number }>`.

- [ ] **Step 1: Failing tests** (in-memory SQLite) — save then list newest first; saving the same product twice keeps one row; `useProduct` falls back to history when `lookup` throws `offline`; `enqueue` of a photo keeps a copy of the file; `flushQueue` processes items in order, removes resolved ones, keeps failed ones.
- [ ] **Step 2: Implement** — SQLite tables `history(id primary key, json, saved_at)` and `queue(id, kind, payload, created_at)`; queued photos copied to the app's document directory; flush on app foreground and on network regain (`@react-native-community/netinfo`), with a toast linking to the result.
- [ ] **Step 2b: Web variant** — `db.web.ts` and `queue.web.ts` with the same exports on IndexedDB (`idb-keyval` or a small wrapper); queued photos stored as Blobs; flush on the `online` event. Test with `fake-indexeddb`.
- [ ] **Step 3: Verify** — tests PASS; on a phone in airplane mode (app and browser): history opens; a photo taken offline is identified after reconnecting.
- [ ] **Step 4: Commit** — `feat(mobile): offline history and queued photos`

---

### Task A4: Legal and method screens, hosted privacy policy

**Files:**
- Create: `apps/mobile/app/(info)/about.tsx`, `privacy.tsx`, `terms.tsx`, `method.tsx`, `apps/mobile/src/features/legal/texts.ts`
- Test: `apps/mobile/src/features/legal/legal.test.tsx`

**Interfaces:**
- Consumes: UI kit (B1). Produces: routes `/about`, `/privacy`, `/terms`, `/method`; because the app also runs on the web, `https://okbite.md/privacy` is the public privacy policy URL for the store listings (A5).

- [ ] **Step 1: Failing test** — each screen renders a header and "Ultima actualizare"; privacy states that photos are sent to the Claude API for reading and stored with the product record, that a random device id is used, and that no account, name or location is collected; method contains `ro.score.disclaimer`; about lists data sources (producer labels, Open Food Facts with ODbL attribution, shopper photos, team checks).
- [ ] **Step 2: Draft** the texts in `texts.ts` (one source for app and web); mention Moldova's Law 133/2011 on personal data protection and the contact email `[TEAM EMAIL]`; terms: information only, not medical advice, check the pack if allergic, shopper-added products are unverified until checked.
- [ ] **Step 3 (human):** Read against the law and the spec; replace placeholders; open `/privacy` on the web preview to confirm it loads without the app.
- [ ] **Step 4: Commit** — `feat(legal): privacy, terms, method and about screens`

---

### Task B8: Accessibility, dark mode, sharing and polish

**Files:**
- Modify: files flagged by the audit; Create: `apps/mobile/src/features/share/shareProduct.ts`
- Test: `apps/mobile/src/features/share/shareProduct.test.ts`

- [ ] **Step 1: Audit** — VoiceOver (iPhone, app and Safari) and TalkBack (Android, app and Chrome) walk through every screen: every control announced with a Romanian label, focus order matches the visual order; font scaling 200% without clipped text; dark mode on every screen with contrast ≥ 4.5:1.
- [ ] **Step 2: Fix** every finding as small commits.
- [ ] **Step 3: Share** — failing test: `shareProduct(product, score)` builds the text "<name> (<brand>): <score> din 100 pe OkBite" plus the link `https://okbite.md/product/<id>`; implement with React Native `Share`, and in `shareProduct.web.ts` with `navigator.share`, falling back to copying the link with a toast.
- [ ] **Step 4: Polish** — haptics on capture and scan, skeleton loading states, empty states from the prototype, app icon and splash from A5.
- [ ] **Step 5: Verify and commit** — Maestro flows (D6) still pass; `feat(mobile): accessibility, dark mode, sharing and polish`
