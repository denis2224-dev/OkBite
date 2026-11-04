# OkBite R5 · Capture, Contribution and Field Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md`, `docs/superpowers/plans/2026-11-04-okbite-overall.md` (Global Constraints, Review Focus, who owns what, dependencies) and the spec before your first task. Steps marked **(human)** are done or checked by the person, not the agent. Task IDs keep their original letters (A = content, B = app, C = backend, D = platform/AI) so cross-references stay stable.

**Goal:** The photo-first flows — camera capture with on-device barcode reading, live scan and manual entry, identify screens, and adding an unknown product from label photos — plus leading the shop photo runs and the beta testers.

**Owns (only this role edits these paths):** `apps/mobile/app/{capture,scan,identify}.tsx`, `apps/mobile/app/add/`, `apps/mobile/src/features/{capture,scan,identify,add}/`

**Tasks in order:** B2 → B3 → B7 → A6 → A7

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Role-specific: the graph puts your flows in the least cohesive area of the project (0.12): they touch the camera, the API client (R4), `identify` and `read-label` (R3) and `add-product` (R2). Agree the params passed between your screens and R4's result screen in B3 before coding B7. From 12 Nov you also run the shop photo runs (A6) with everyone, and from 24 Nov the beta (A7).

## Review Focus (owned here)

- A blurred or angled barcode the phone cannot read must still send the photo to `identify`, never straight to "not found" (B2).
- A 12 MP photo → longest side 1600 px and ≤ 1.5 MB before upload (B2, B7).
- "0,3" typed → 0.3; empty → `null` (B7).
- A photo taken offline is queued and identified when the network returns (B2 step 2c).

---

### Task B2: Capture screen, barcode in photo, live scan and manual entry

**Files:**
- Create: `apps/mobile/app/capture.tsx`, `apps/mobile/app/scan.tsx`, `apps/mobile/src/features/capture/compressPhoto.ts`, `apps/mobile/src/features/capture/findBarcode.ts`, `apps/mobile/src/features/capture/useCaptureFlow.ts`, `apps/mobile/src/features/scan/ManualCode.tsx`
- Test: `apps/mobile/src/features/capture/compressPhoto.test.ts`, `findBarcode.test.ts`, `useCaptureFlow.test.ts`, `apps/mobile/src/features/scan/ManualCode.test.tsx`

**Interfaces:**
- Consumes: `normalizeCode` (D3), `api.lookup`, `api.identify` (B1).
- Produces: `compressPhoto(uri: string): Promise<{ uri: string; base64: string; bytes: number }>` (longest side 1600, JPEG 0.8, re-compress at 0.6 if > 1.5 MB); `findBarcode(uri: string): Promise<string | null>` (`scanFromURLAsync` for ean13/ean8/upc_a → `normalizeCode`); `useCaptureFlow()` returning `{ state, takePhoto, pickFromGallery }` that ends in `router.replace('/product/<id>')`, `router.replace('/identify', …)`, or the offline state.

- [ ] **Step 1: Failing tests** (mock expo modules) — `compressPhoto` on a 4000×3000 image returns longest side 1600 and ≤ 1.5 MB; `findBarcode` returns the normalised code, `null` when nothing is found, and `null` (not a throw) when `scanFromURLAsync` throws; `useCaptureFlow`: barcode found + `found` → product route; barcode found + `not_found` → still calls `identify` with the photo; no barcode → `identify`; `identify` `found` → product route; `candidates`/`not_found` → `/identify` with the response; network error → offline state (the queue itself is wired in step 2c). ManualCode: an invalid code shows `ro.scan.manualInvalid` and does not navigate.
- [ ] **Step 2: Implement** — `/capture`: full-screen `CameraView` with one shutter button and "Alege din galerie" (expo-image-picker); a working state with `ro.capture.working`; camera permission denied → the prototype's refused state with "Alege din galerie" and "Deschide setările". `/scan`: `CameraView` with `barcodeScannerSettings` (ean13, ean8, upc_a), haptic tap on detection, then `api.lookup`; manual entry below the camera.
- [ ] **Step 2b: Web variants** — `findBarcode.web.ts`: uses `BarcodeDetector` (formats ean_13, ean_8, upc_a) on the image when `'BarcodeDetector' in window`, else returns `null` so the photo goes to `identify`; `scan.web.tsx`: live scanning with `BarcodeDetector` on the camera stream when available, otherwise only manual entry with a short note (`ro.scan.webManualOnly`). Test: with `BarcodeDetector` undefined, `findBarcode` returns `null` and `useCaptureFlow` calls `identify`.
- [ ] **Step 2c (separate small PR, after R4's B6 merges): Offline queue** — failing test: with `api.identify` throwing `offline`, `useCaptureFlow` calls `enqueue({ kind: 'photo', uri })` (B6) with the compressed photo and navigates to `/offline`; then implement.
- [ ] **Step 3: Verify** — tests PASS; on an iPhone and an Android phone, in the app and in the browser: photo of a seeded product's barcode side → result; photo of its front → identify flow.
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

### Task A6: Shop photo runs (human, all four people, 12–29 Nov)

- [ ] **Step 1:** Shared list of the 300 best-selling packaged products across the categories, 60 per person, skipping codes already imported from Open Food Facts.
- [ ] **Step 2:** First run (by 18 Nov): photograph front, ingredients and nutrition table of each product; enter them through the admin screens if B7 is not merged yet.
- [ ] **Step 3:** Second run (19–29 Nov): add products only through the app's own photo flow, so it gets real testing; file every problem as a GitHub issue labelled `beta`.
- [ ] **Step 4:** R2 verifies the added products daily (C8 routine). Checkpoint: `select count(*) from products where status = 'verified'` ≥ 300 on production.

---

### Task A7: Beta testers and feedback triage (human, 23 Nov – 1 Dec)

- [ ] **Step 1:** Recruit 25 testers with iPhones and Android phones (classmates, families, one allergy community). No store needed: Android testers install the EAS `preview` build link; iPhone testers register their device for the EAS internal build (`eas device:create`) or use the web preview in Safari. Send a 5-question feedback form.
- [ ] **Step 2:** Daily: turn feedback into GitHub issues with severity P1 (wrong allergen, crash, data loss), P2, P3, assigned to the owning role.
- [ ] **Step 3:** Checkpoint 1 Dec ("App complete"): zero open P1 issues.
