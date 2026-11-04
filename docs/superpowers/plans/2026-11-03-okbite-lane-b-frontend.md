# OkBite Lane B (Mobile App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-03-okbite-overall.md`, the spec, and the prototype source in `docs/prototype/Main.dc.html` before Task B1.

**Goal:** Build every shopper screen as a native iPhone and Android app: photograph a product, get the answer or add the product, plus live barcode scan, history offline, ingredients and comparison.

**Architecture:** Expo Router with file-based routes in `apps/mobile/app/` and one folder per feature in `apps/mobile/src/features/`. Screens never call `fetch` directly: they use `apps/mobile/src/lib/api.ts`, which validates every response with the contract's Zod schemas. History and the offline queue live in SQLite (expo-sqlite). All copy comes from `apps/mobile/src/copy/ro.ts` (Lane A). The look follows the prototype, adapted to native controls.

**Tech Stack:** Expo SDK (latest stable), Expo Router, React Native, TypeScript 5, expo-camera (`CameraView`, `scanFromURLAsync`), expo-image-picker, expo-image-manipulator, expo-sqlite, expo-secure-store, expo-haptics, react-native-svg, Zod 3, jest-expo, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Lane-specific: you own `apps/mobile/**` except `src/copy/`, `src/features/legal/`, `app/(info)/` (A), `app/admin/`, `src/features/admin/` (C), and `app.config.ts`, `eas.json`, `src/lib/errorReporter.ts` (D). Ask Lane D for any new native permission or plugin. Fonts: Bricolage Grotesque (headings) and Manrope (text) via `@expo-google-fonts`; colours from the prototype, with a dark variant of each token.

## Review Focus (owned here)

- The on-device barcode scan of a photo fails on blur or angle: the photo must still go to `identify`, never straight to "not found" (B2).
- "0,3" typed or read → 0.3; empty field → `null`, never `0` (B7).
- Missing kcal/sugar/sat/salt → "Scor indisponibil" card, never "0 din 100" (B4).
- A 12 MP photo → JPEG with longest side 1600 px and ≤ 1.5 MB before upload (B2, B7).
- Offline: a photo or code taken without network is kept and processed when the network returns; history opens offline (B6).

---

### Task B1: App shell, theme, UI kit and API client (fully specified)

**Files:**
- Create: `apps/mobile/app/_layout.tsx` (replace D1's), `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/(tabs)/compare.tsx`, `apps/mobile/app/(tabs)/history.tsx` (placeholders for B5/B6)
- Create: `apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/theme/useTheme.ts`
- Create: `apps/mobile/src/ui/Button.tsx`, `Card.tsx`, `ScoreRing.tsx`, `AllergenChip.tsx`, `Badge.tsx`, `Screen.tsx`, `Toast.tsx`, `index.ts`
- Create: `apps/mobile/src/lib/device.ts`, `apps/mobile/src/lib/api.ts`, `apps/mobile/src/lib/supabase.ts`, `apps/mobile/src/lib/format.ts`, `apps/mobile/src/test/fixtures.ts`
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
Run: `pnpm lint && pnpm typecheck && pnpm test` → Expected: exit 0. Open on both phones via the PR's QR code.

- [ ] **Step 5: Commit** — `feat(mobile): app shell, theme, UI kit and typed API client`

---

### Task B2: Capture screen, barcode in photo, live scan and manual entry

**Files:**
- Create: `apps/mobile/app/capture.tsx`, `apps/mobile/app/scan.tsx`, `apps/mobile/src/features/capture/compressPhoto.ts`, `apps/mobile/src/features/capture/findBarcode.ts`, `apps/mobile/src/features/capture/useCaptureFlow.ts`, `apps/mobile/src/features/scan/ManualCode.tsx`
- Test: `apps/mobile/src/features/capture/compressPhoto.test.ts`, `findBarcode.test.ts`, `useCaptureFlow.test.ts`, `apps/mobile/src/features/scan/ManualCode.test.tsx`

**Interfaces:**
- Consumes: `normalizeCode` (D3), `api.lookup`, `api.identify` (B1).
- Produces: `compressPhoto(uri: string): Promise<{ uri: string; base64: string; bytes: number }>` (longest side 1600, JPEG 0.8, re-compress at 0.6 if > 1.5 MB); `findBarcode(uri: string): Promise<string | null>` (`scanFromURLAsync` for ean13/ean8/upc_a → `normalizeCode`); `useCaptureFlow()` returning `{ state, takePhoto, pickFromGallery }` that ends in `router.replace('/product/<id>')`, `router.replace('/identify', …)`, or the offline state.

- [ ] **Step 1: Failing tests** (mock expo modules) — `compressPhoto` on a 4000×3000 image returns longest side 1600 and ≤ 1.5 MB; `findBarcode` returns the normalised code, `null` when nothing is found, and `null` (not a throw) when `scanFromURLAsync` throws; `useCaptureFlow`: barcode found + `found` → product route; barcode found + `not_found` → still calls `identify` with the photo; no barcode → `identify`; `identify` `found` → product route; `candidates`/`not_found` → `/identify` with the response; network error → offline state with the photo kept (B6 stores it). ManualCode: an invalid code shows `ro.scan.manualInvalid` and does not navigate.
- [ ] **Step 2: Implement** — `/capture`: full-screen `CameraView` with one shutter button and "Alege din galerie" (expo-image-picker); a working state with `ro.capture.working`; camera permission denied → the prototype's refused state with "Alege din galerie" and "Deschide setările". `/scan`: `CameraView` with `barcodeScannerSettings` (ean13, ean8, upc_a), haptic tap on detection, then `api.lookup`; manual entry below the camera.
- [ ] **Step 3: Verify** — tests PASS; on an iPhone and an Android phone: photo of a seeded product's barcode side → result; photo of its front → identify flow.
- [ ] **Step 4: Commit** — `feat(mobile): photo capture with on-device barcode reading, live scan and manual entry`

---

### Task B3: Identify flow screens

**Files:**
- Create: `apps/mobile/app/identify.tsx`, `apps/mobile/src/features/identify/ConfirmMatch.tsx`, `CandidateList.tsx`, `NotFound.tsx`
- Test: `apps/mobile/src/features/identify/identify.test.tsx`

**Interfaces:**
- Consumes: `IdentifyResponse`, `Candidate`, `FrontRead` (C1); route params from B2.
- Produces: navigation to `/product/[id]`, or to `/add` with params `{ code?, brand?, name?, quantity?, photoPath }` pre-filled from `read`.

- [ ] **Step 1: Failing tests** — one candidate with similarity ≥ 0.6 → `ConfirmMatch` ("Este acesta?", photo, name, brand, quantity; "Da" → product; "Nu" → `/add` pre-filled); several or lower similarity → `CandidateList` with each candidate and "Nu e niciunul" → `/add`; `not_found` → `NotFound` with the steps from the prototype and "Fotografiază eticheta" → `/add` pre-filled.
- [ ] **Step 2: Implement** following the prototype's "Confirmă produsul" and "Produs negăsit" screens.
- [ ] **Step 3: Verify and commit** — tests PASS; `feat(mobile): confirm, choose or add after identifying a photo`

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
- Modify: `apps/mobile/src/features/product/useProduct.ts`, `apps/mobile/src/features/capture/useCaptureFlow.ts`
- Test: `apps/mobile/src/features/history/store.test.ts`, `apps/mobile/src/features/offline/queue.test.ts`

**Interfaces:**
- Produces: `saveToHistory(entry: { product: Product; score: ScoreResult }): Promise<void>`, `listHistory(): Promise<HistoryEntry[]>` (newest first, max 200), `getFromHistory(id): Promise<HistoryEntry | undefined>`, `clearHistory(): Promise<void>`, `enqueue(item: { kind: 'photo'; uri: string } | { kind: 'code'; code: string }): Promise<void>`, `flushQueue(): Promise<{ resolved: number }>`.

- [ ] **Step 1: Failing tests** (in-memory SQLite) — save then list newest first; saving the same product twice keeps one row; `useProduct` falls back to history when `lookup` throws `offline`; `useCaptureFlow` enqueues the compressed photo when offline and shows `/offline`; `flushQueue` processes items in order, removes resolved ones, keeps failed ones.
- [ ] **Step 2: Implement** — SQLite tables `history(id primary key, json, saved_at)` and `queue(id, kind, payload, created_at)`; queued photos copied to the app's document directory; flush on app foreground and on network regain (`@react-native-community/netinfo`), with a toast linking to the result.
- [ ] **Step 3: Verify** — tests PASS; on a phone in airplane mode: history opens; a photo taken offline is identified after reconnecting.
- [ ] **Step 4: Commit** — `feat(mobile): offline history and queued photos`

---

### Task B7: Add flow (two shots, review, save, result)

**Files:**
- Create: `apps/mobile/app/add/index.tsx`, `apps/mobile/app/add/review.tsx`, `apps/mobile/src/features/add/parseAmount.ts`, `useAddFlow.ts`, `CategoryPicker.tsx`
- Test: `apps/mobile/src/features/add/parseAmount.test.ts`, `apps/mobile/src/features/add/review.test.tsx`

**Interfaces:**
- Consumes: `compressPhoto` (B2), `api.readLabel`, `api.addProduct` (B1), `detectAllergens` (D3), params from B3.
- Produces: `parseAmount(s: string): number | null`.

- [ ] **Step 1: Failing tests** — `parseAmount('0,3') === 0.3`, `parseAmount(' 13.2 g') === 13.2`, `parseAmount('') === null`, `parseAmount('abc') === null`; review screen: fields from `unclear` are marked with `ro.review.unclearField`; save is disabled until name, brand, category and ingredients are filled; detected allergens update live as the ingredients text changes; brand/name/quantity/code are pre-filled from the params; after `addProduct` succeeds the app opens `/product/<id>` showing "Neverificat"; `rate_limited` and `upstream_failed` show the prototype's retry states.
- [ ] **Step 2: Implement** — `/add`: shot 1 ingredients list, shot 2 nutrition table, with "Sunt pe aceeași poză" (sends `nutritionImage: null`); `api.readLabel` → `/add/review` (editable ingredients text, nutrition fields, name, brand, quantity, category picker from the categories table, optional barcode) → `api.addProduct` → result.
- [ ] **Step 3: Verify** — tests PASS; on a phone, add one real unknown product on staging, then find it from a second phone by photo.
- [ ] **Step 4: Commit** — `feat(mobile): add unknown products from label photos and show the analysis`

---

### Task B8: Accessibility, dark mode, sharing and polish

**Files:**
- Modify: files flagged by the audit; Create: `apps/mobile/src/features/share/shareProduct.ts`
- Test: `apps/mobile/src/features/share/shareProduct.test.ts`

- [ ] **Step 1: Audit** — VoiceOver (iPhone) and TalkBack (Android) walk through every screen: every control announced with a Romanian label, focus order matches the visual order; font scaling 200% without clipped text; dark mode on every screen with contrast ≥ 4.5:1.
- [ ] **Step 2: Fix** every finding as small commits.
- [ ] **Step 3: Share** — failing test: `shareProduct(product, score)` builds the text "<name> (<brand>): <score> din 100 pe OkBite" plus the store link from `ro.share.storeLink`; implement with React Native `Share`.
- [ ] **Step 4: Polish** — haptics on capture and scan, skeleton loading states, empty states from the prototype, app icon and splash from A5.
- [ ] **Step 5: Verify and commit** — Maestro flows (D6) still pass; `feat(mobile): accessibility, dark mode, sharing and polish`
