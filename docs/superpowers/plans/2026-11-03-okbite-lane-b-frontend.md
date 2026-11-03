# OkBite Lane B (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-03-okbite-overall.md` and the prototype source in `docs/prototype/Main.dc.html` before Task B1.

**Goal:** Build every shopper screen of the prototype as a working, installable, offline-capable PWA on top of the shared contract.

**Architecture:** React 18 + react-router with one folder per feature under `apps/web/src/features/`. Screens never call `fetch` directly: they use `apps/web/src/lib/api.ts`, which validates every response with the contract's Zod schemas. History and the offline queue live in IndexedDB via Dexie. All copy comes from `apps/web/src/copy/ro.ts` (Lane A).

**Tech Stack:** React 18, TypeScript 5, react-router-dom 6, vite-plugin-pwa (Workbox), Dexie 4, @zxing/browser, Zod 3, Vitest, Testing Library, fake-indexeddb (tests).

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Lane-specific: you own `apps/web/**` except `src/copy/` and `src/features/legal/` (A), `src/features/admin/` (C) and `src/lib/errorReporter.ts` (D); you also own `packages/shared/src/ean/`. Match the prototype's layout, colours, fonts (Bricolage Grotesque for headings, Manrope for text) and copy; take exact colour values from `docs/prototype/Main.dc.html`.

## Review Focus (owned here)

- 12-digit UPC-A from the scanner → EAN-13 with leading `0` (B2).
- "0,3" typed or read → 0.3; empty field → `null`, never `0` (B7).
- Products with missing kcal/sugar/sat/salt → "Scor indisponibil" card, never "0 din 100" (B3).
- 12 MP photo → JPEG ≤ 1.5 MB, longest side ≤ 1600 px, EXIF gone (B7).
- Offline scan → code queued, result opens when back online; history readable offline (B6).

---

### Task B1: App shell, UI kit and API client (fully specified)

**Files:**
- Create: `apps/web/src/App.tsx` (replace D1's), `apps/web/src/routes.tsx`, `apps/web/src/styles/tokens.css`, `apps/web/src/styles/global.css`
- Create: `apps/web/src/ui/Button.tsx`, `Card.tsx`, `ScoreRing.tsx`, `AllergenChip.tsx`, `TopBar.tsx`, `BottomNav.tsx`, `Sheet.tsx`, `Toast.tsx`, `index.ts`
- Create: `apps/web/src/lib/device.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/supabase.ts`, `apps/web/src/lib/format.ts`
- Test: `apps/web/src/lib/api.test.ts`, `apps/web/src/lib/device.test.ts`, `apps/web/src/lib/format.test.ts`, `apps/web/src/ui/ScoreRing.test.tsx`, `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: contract types and schemas from `@okbite/shared` (C1); `ro` from `apps/web/src/copy/ro.ts` (A1).
- Produces (all later B tasks and C7, D6 use these names):
  - `getDeviceId(): string` — UUID created once, kept in `localStorage['okbite.deviceId']`.
  - `api.lookup(code: string): Promise<LookupResponse>`, `api.readLabel(req: ReadLabelRequest): Promise<ReadLabelResponse>`, `api.submit(req: SubmitRequest): Promise<SubmitResponse>`, `api.report(req: ReportRequest): Promise<void>`.
  - `class ApiError extends Error { code: ErrorCode | 'offline' | 'invalid_response' }`.
  - `formatAmount(n: number, decimals?: number): string` — Romanian decimal comma, e.g. `formatAmount(13.2) === '13,2'`.
  - UI: `<Button variant="primary|secondary|ghost">`, `<Card>`, `<ScoreRing score={number|null} grade={Grade} />`, `<AllergenChip name={Allergen} />`, `<TopBar title back? />`, `<BottomNav />` (Acasă, Compară, Istoric), `<Sheet open onClose>`, `useToast()`.
  - Routes from the spec §2 registered in `routes.tsx` with placeholder pages; `/admin` lazy-loads `features/admin/AdminPage`.

- [ ] **Step 1: Failing tests**

```ts
// lib/api.test.ts
it('sends the device id and validates a found product', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(foundYogurt)));
  const r = await api.lookup('4840001000014');
  expect(fetchMock.mock.calls[0][1].headers['x-device-id']).toMatch(/^[0-9a-f-]{36}$/);
  expect(r.status).toBe('found');
});
it('throws invalid_response when the body does not match the contract', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'found' })));
  await expect(api.lookup('4840001000014')).rejects.toMatchObject({ code: 'invalid_response' });
});
it('throws offline when the network fails', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(api.lookup('4840001000014')).rejects.toMatchObject({ code: 'offline' });
});
it('maps error bodies to ApiError codes', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'rate_limited', message: 'x' }), { status: 429 }));
  await expect(api.submit(validSubmit)).rejects.toMatchObject({ code: 'rate_limited' });
});
// lib/format.test.ts
it.each([[13.2, '13,2'], [0.1, '0,1'], [478, '478'], [2.56, '2,6']])('formats %s', (n, s) => expect(formatAmount(n)).toBe(s));
// ui/ScoreRing.test.tsx
it('labels the score for screen readers', () => {
  render(<ScoreRing score={78} grade="good" />);
  expect(screen.getByRole('img', { name: '78 din 100, calitate nutrițională bună' })).toBeInTheDocument();
});
```
(`foundYogurt` fixture: the seeded product `4840001000014` shaped as `LookupResponse`; put it in `apps/web/src/test/fixtures.ts`.)
Run: `pnpm --filter web test` → Expected: FAIL.

- [ ] **Step 2: Implement** `device.ts`, `api.ts` (base URL `import.meta.env.VITE_FUNCTIONS_URL`; GET for lookup with `?code=`, POST JSON otherwise; headers `x-device-id`, `apikey` and `Authorization: Bearer <anon key>`), `format.ts`, `supabase.ts` (`createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`).
Run: `pnpm --filter web test lib` → Expected: PASS.

- [ ] **Step 3: Implement tokens and UI kit** — CSS custom properties copied from the prototype (ground, ink, three grade colour sets good/medium/low/neutral, radii, spacing); Google Fonts link for Bricolage Grotesque and Manrope in `index.html`; every interactive element is a real `<button>` or `<a>` ≥ 44 px. `ScoreRing` is an SVG ring with `role="img"` and the label from `ro.score.ringLabel`.
Run: `pnpm --filter web test ui` → Expected: PASS.

- [ ] **Step 4: Shell and routes** — `App` renders `RouterProvider` with the routes, `BottomNav` on `/`, `/compare`, `/history`; `App.test.tsx` updated to expect the home heading from `ro.home.title` at `/`.
Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → Expected: exit 0.

- [ ] **Step 5: Commit** — `feat(web): app shell, UI kit and typed API client`

---

### Task B2: EAN checksum, scanner and manual entry

**Files:**
- Create: `packages/shared/src/ean/index.ts`, `apps/web/src/features/scan/ScanPage.tsx`, `apps/web/src/features/scan/useBarcodeScanner.ts`, `apps/web/src/features/scan/ManualCode.tsx`
- Test: `packages/shared/src/ean/index.test.ts`, `apps/web/src/features/scan/ManualCode.test.tsx`

**Interfaces:**
- Produces: `normalizeCode(raw: string): string | null` (digits only; UPC-A 12 → EAN-13 with leading 0; valid EAN-8/13 checksum or `null`), exported from `@okbite/shared`. Scan success navigates to `/p/:code`.

- [ ] **Step 1: Failing tests** — `normalizeCode('4840001000014') === '4840001000014'`; `normalizeCode('036000291452') === '0036000291452'`; `normalizeCode('4840001000017') === null`; `normalizeCode('96385074') === '96385074'`; `normalizeCode(' 4840001 000014 ') === '4840001000014'`. ManualCode: invalid code shows `ro.scan.manualInvalid` and does not navigate.
- [ ] **Step 2: Implement** — `useBarcodeScanner` uses `BarcodeDetector` when available (formats `ean_13`, `ean_8`, `upc_a`), else `@zxing/browser`; stops the camera on unmount; camera permission denied → the "Camera nu este permisă" state from the prototype with manual entry below.
- [ ] **Step 3: Verify** — tests PASS; on a real Android phone and an iPhone via the preview URL, scanning a real product navigates to `/p/<code>`.
- [ ] **Step 4: Commit** — `feat(web): barcode scanner with manual entry and EAN validation`

---

### Task B3: Confirm and result screens

**Files:**
- Create: `apps/web/src/features/product/ProductPage.tsx`, `ConfirmProduct.tsx`, `ResultView.tsx`, `ScoreCard.tsx`, `PortionTable.tsx`, `SourceCard.tsx`, `NotFound.tsx`, `portion.ts`, `useProduct.ts`
- Test: `apps/web/src/features/product/portion.test.ts`, `ResultView.test.tsx`, `ProductPage.test.tsx`

**Interfaces:**
- Consumes: `api.lookup`, UI kit (B1); `ScoreResult` (C1); `saveToHistory(entry)` (B6 — until B6 merges, `useProduct` calls a no-op stub exported from `features/history/store.ts`, which B6 replaces).
- Produces: `perPortion(per100: number, portionAmount: number): number`, `percentOfReference(key: 'kcal'|'sugar'|'sat'|'salt', amount: number): number` (references 2000 / 90 / 20 / 6), `teaspoons(sugarGrams: number): string` (4 g per teaspoon, rounded to the nearest half; texts from `ro.result.teaspoons`).

- [ ] **Step 1: Failing tests** — `perPortion(13.2, 150) === 19.8`; `percentOfReference('sat', 2.4) === 12`; `teaspoons(19.8)` → "5 lingurițe", `teaspoons(1.5)` → "sub jumătate de linguriță"; `ResultView` with `score: null` shows `ro.result.scoreUnavailable` and the missing-data text, and no element with text "0 din 100"; with allergens `['Lapte']` shows the chip; NotFound for `not_found` shows the code and the "Fotografiază eticheta" link to `/add/:code`.
- [ ] **Step 2: Implement** — `/p/:code` shows `ConfirmProduct` first ("Da, arată analiza" / "Nu, e alt produs" → back to `/scan`); after confirming, `ResultView`: allergens and may-contain, `ScoreCard` with reasons and the fixed disclaimer, portion table, source card with "Vezi eticheta originală" (→ `/p/:code/label`) and "Raportează o greșeală" (sheet → `api.report`), links to ingredients and compare.
- [ ] **Step 3: Verify** — tests PASS; manual check on the preview with all 6 seeded codes against the prototype screens.
- [ ] **Step 4: Commit** — `feat(web): product confirmation and result screens`

---

### Task B4: Ingredients and original-label screens

**Files:**
- Create: `apps/web/src/features/product/IngredientsPage.tsx`, `IngredientRow.tsx`, `LabelPage.tsx`
- Test: `apps/web/src/features/product/IngredientsPage.test.tsx`

**Interfaces:**
- Consumes: `useProduct(code)` (B3), `Ingredient`, `IngredientGroup` (C1).

- [ ] **Step 1: Failing tests** — ingredients grouped in the order base, fat, taste, add, cult with group names from `ro`; tapping a row expands role, explanation and "Sursa explicației: …"; allergen ingredients show the allergen badge; the raw label text is shown under the list.
- [ ] **Step 2: Implement** — rows are `<button aria-expanded>`; `LabelPage` shows `labelImageUrl` (or a placeholder) and the label text, per the prototype sheet.
- [ ] **Step 3: Verify and commit** — tests PASS; `feat(web): ingredients explained and original label view`

---

### Task B5: Compare screen

**Files:**
- Create: `apps/web/src/features/compare/ComparePage.tsx`, `compare.ts`, `ProductPicker.tsx`
- Test: `apps/web/src/features/compare/compare.test.ts`, `ComparePage.test.tsx`

**Interfaces:**
- Produces: `compareRows(a: Product, b: Product): { key: NutrientKey; a: number|null; b: number|null; better: 'a'|'b'|null }[]` — lower is better for kcal, fat, sat, sugar, salt; higher is better for protein, fiber; `null` when either side is missing or equal.

- [ ] **Step 1: Failing tests** — yogurt 014 vs 021: sugar better `a`, protein better `a`; products in different categories show `ro.compare.otherCategory` and no table; picker lists products from history in the same category.
- [ ] **Step 2: Implement** — `/compare?a=&b=`; missing `b` opens the picker (history first, then scan).
- [ ] **Step 3: Verify and commit** — tests PASS; `feat(web): compare two products of one category`

---

### Task B6: History and offline queue

**Files:**
- Create: `apps/web/src/features/history/db.ts`, `store.ts` (replace B3's stub), `HistoryPage.tsx`, `apps/web/src/features/offline/OfflinePage.tsx`, `apps/web/src/features/offline/queue.ts`
- Modify: `apps/web/vite.config.ts` (Workbox runtime caching), `apps/web/src/features/product/useProduct.ts`
- Test: `apps/web/src/features/history/store.test.ts`, `apps/web/src/features/offline/queue.test.ts`

**Interfaces:**
- Produces: `saveToHistory(entry: { code: string; product: Product; score: ScoreResult }): Promise<void>`, `listHistory(): Promise<HistoryEntry[]>` (newest first, max 200), `clearHistory(): Promise<void>`, `getFromHistory(code): Promise<HistoryEntry | undefined>`, `enqueue(code): Promise<void>`, `flushQueue(lookup): Promise<string[]>` (returns codes resolved).

- [ ] **Step 1: Failing tests** (fake-indexeddb) — save then list returns newest first; saving the same code twice keeps one entry with the newest date; `useProduct` falls back to history when `api.lookup` throws `offline`; an offline lookup with no history enqueues the code and shows the offline page; `flushQueue` resolves queued codes and empties the queue.
- [ ] **Step 2: Implement** — Dexie DB `okbite` with tables `history` (key `code`) and `queue` (key `code`); `window.addEventListener('online', …)` flushes and toasts "Am găsit produsul" with a link; Workbox precaches the shell and caches `labels` bucket images (CacheFirst, 30 days).
- [ ] **Step 3: Verify** — tests PASS; on a phone: scan two products, switch to airplane mode, history and both results still open.
- [ ] **Step 4: Commit** — `feat(web): offline history and queued lookups`

---

### Task B7: Capture, review and submit flow

**Files:**
- Create: `apps/web/src/features/contribute/CapturePage.tsx`, `ReviewPage.tsx`, `compressImage.ts`, `parseAmount.ts`, `useContribution.ts`
- Test: `apps/web/src/features/contribute/parseAmount.test.ts`, `compressImage.test.ts`, `ReviewPage.test.tsx`

**Interfaces:**
- Consumes: `api.readLabel`, `api.submit` (B1); `detectAllergens` (D3); `ReadLabelResponse`, `SubmitRequest` (C1).
- Produces: `parseAmount(s: string): number | null`, `compressImage(file: File): Promise<{ base64: string; bytes: number }>`.

- [ ] **Step 1: Failing tests** — `parseAmount('0,3') === 0.3`, `parseAmount(' 13.2 g') === 13.2`, `parseAmount('') === null`, `parseAmount('abc') === null`; `compressImage` on a 4000×3000 test image returns ≤ 1.5 MB with longest side 1600; ReviewPage marks fields listed in `unclear` with `ro.review.unclearField`, disables submit until every `unclear` nutrient is filled or explicitly left blank, and shows detected allergens live as the ingredients text is edited.
- [ ] **Step 2: Implement** — `/add/:code`: two steps (ingredients, then nutrition table) using `<input type="file" accept="image/*" capture="environment">` plus "Alege din galerie"; compress with a canvas (drops EXIF); `api.readLabel` → `/add/:code/review` with editable fields → `api.submit` → confirmation "Ai trimis produsul. Apare după verificarea echipei." Errors: `rate_limited` and `upstream_failed` show the prototype's retry states.
- [ ] **Step 3: Verify** — tests PASS; on a phone, add one real missing product end to end on staging.
- [ ] **Step 4: Commit** — `feat(web): add missing products from two label photos`

---

### Task B8: Accessibility, performance, install and share

**Files:**
- Modify: files flagged by the audits; Create: `apps/web/src/features/install/InstallPrompt.tsx`, `apps/web/lighthouserc.json`
- Test: `apps/web/src/features/install/InstallPrompt.test.tsx`

- [ ] **Step 1:** Add Lighthouse CI (`@lhci/cli`) to CI on the preview URL with assertions: PWA installable, accessibility ≥ 0.95, performance ≥ 0.85 (mobile).
- [ ] **Step 2:** Fix every failure; keyboard-only walk through all screens; screen-reader labels on icon buttons.
- [ ] **Step 3:** Install prompt after the second scan (Android `beforeinstallprompt`; iOS instruction sheet); share button on results using `navigator.share` with `/p/:code`, falling back to copy-link.
- [ ] **Step 4: Verify and commit** — Lighthouse CI green; `feat(web): install prompt, sharing and accessibility fixes`
