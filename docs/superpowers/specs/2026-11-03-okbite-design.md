# OkBite — Design Spec

Date: 2026-11-04 (revised: 2026-11-09, Task U0 draft proposal for Denis/Sergiu/David/Stas approval; U1 contract merged in #115) · Status: draft proposal for review
Prototype (source of truth for look, copy and states): `docs/prototype/Main.dc.html` · https://claude.ai/artifact/5rY8DhLtDRH67SQzXMyP8s
Team plan (roles, timeline): https://claude.ai/artifact/XQm9DtD4aXXZBCi6sJfGQ4

> **Revision note (9 Nov 2026 — Task U0 draft proposal)**:
> - **Summary**: Specifies the unknown product flow improvements. Front photo is required (reusing identify photo or prompting on barcode entry), ingredients photo is required, followed by four explicit answers to the nutrition question (separate photo, same photo, no table, skip for now). Added draft lifecycle rules, null nutrient semantics, idempotency on save, enrichment constraints for unverified products, U1 contract proposals for R2 confirmation, and eight comprehensive acceptance criteria.
> - **Status**: Draft proposal submitted for review and approval by Denis, Sergiu, David, and Stas. The U1 contract (§7) merged in #115; `unit` stays required (9 Nov), so a flow without a nutrition table asks g/ml with one tap.

## 1. What OkBite is

A Romanian-language mobile app for iPhone and Android, published in the App Store and Google Play, for shoppers in Moldova.

The core flow:

1. The shopper **photographs the product**.
2. The app looks for a **barcode in the photo**. If it finds one, it looks the product up by code. If not, AI reads the **brand, name and quantity from the pack**, the backend searches the database, and the shopper confirms the match.
3. **Found** → the shopper gets the answer: allergens, "may contain" traces, a 0–100 nutrition score with up to three reasons, per-portion values against an adult daily reference, every ingredient explained with a source, and a comparison with another product of the same category.
4. **Not found** → front photo required (reusing the front photo taken during identification; barcode-only entry adds a front-photo step while preserving the scanned barcode), ingredients photo required, then **four explicit answers to the nutrition question**: (a) yes, separate photo; (b) table is in the ingredients photo; (c) no table on packaging; (d) skip for now. A short confirmation screen shows captured photos and extracted values; editing on tap, category optional. Preserves manual-entry fallback (#104) behind "Scriu eu textul" when AI read fails, along with existing lifecycle guards. Retaking one photo keeps all other photos and already-extracted results. Missing optional nutrition must never imply blurry photography or camera failure. The product is **added to the database at once**, visible to everyone and marked "Neverificat" until the team verifies it.

The shopper can also **scan the barcode directly** with the live camera, or type it, as an alternative entry.

The same app also runs **in the phone's browser** (Safari on iPhone, Chrome on Android) at `https://okbite.md`, built from the same code with Expo web, installable to the home screen as a PWA. The browser version has the same flows; where a browser lacks a feature (on-device barcode reading in iOS Safari, haptics), it falls back as described in §6.

History works offline. No shopper accounts. Romanian only. Target: both stores live and the web app public on **2026-12-08** (subject to Apple and Google review). Pricing (free, paid, or in-app purchase) is **not decided**: build it free, with no payment code.

## 2. Screens (the prototype shows the look and copy; adapt layout to native)

| Route (Expo Router) | Screen | Prototype artboard |
|---|---|---|
| `/` | Home: big "Fotografiază produsul" button, "Scanează codul de bare" link, compare shortcut, recent products, score legend | 1 · Acasă |
| `/capture` | Camera: take one photo of the product (front or barcode side); camera-refused state with "Alege din galerie" | 2 · Scanner, Cameră refuzată |
| `/identify` | Working state, then: one confident match → confirm; several → pick one; none → "Nu avem încă acest produs" | 2b · Confirmare, Produs negăsit |
| `/scan` | Live barcode scanner + manual code entry (8 or 13 digits) | 2 · Scanner |
| `/product/[id]` | Result (or "Date insuficiente"), with "Neverificat" badge when unverified | 3 · Rezultat, Date insuficiente |
| `/product/[id]/ingredients` | Ingredients explained, grouped | 4 · Ingrediente |
| `/product/[id]/label` | Label photo and text | (sheet in 3 · Rezultat) |
| `/compare` | Compare two products of one category | 5 · Comparație |
| `/add` | Multi-step photo capture: front photo required (reused from identify, or captured if entered via barcode), ingredients photo required, then nutrition choice (separate photo / table in ingredients photo / no table / skip for now). Retaking one photo keeps all other photos/results. Manual fallback ("Scriu eu textul", #104) available if AI read fails. | 6 · Fotografierea etichetei |
| `/add/review` | Short confirmation screen: displays photos and extracted values (brand, name, quantity, ingredients, optional nutrition, optional category; editing on tap). Missing optional nutrition never displays blurry-photo warnings. Publishes an unverified product only after explicit confirmation. | 6b · Confirmarea textului extras, OCR neclar |
| `/history` | On-device history, clear all | 7 · Istoric |
| (state) | Offline: photo or code kept, retried when online | Fără conexiune |
| `/about`, `/privacy`, `/terms`, `/method` | About the data, privacy, terms, score method | — |
| `/admin` | Moderation, team only, hidden behind sign-in | — |

## 3. Data rules

- A product has an internal `id` (UUID). `code` (EAN-8/EAN-13) is optional and unique when present: products added from a photo without a visible barcode have no code.
- Product `status`: `verified` (checked by the team), `unverified` (added by a shopper, visible with a "Neverificat" badge), `hidden` (removed by the team). Confirmed saved products remain unverified / "Neverificat" and immediately visible to all shoppers.
- Nutrients per 100 g (solids) or 100 ml (drinks): `kcal, fat, sat, sugar, salt, protein, fiber, fruitVegPct`; all nutrients may be `null`. Missing values never default or convert to zero.
- Category: optional on submission; if unconfirmed or `necunoscut`, no score is calculated.
- Brand: may be unreadable or missing from packaging without mandatory typing or keyboard entry. If essential product identity or ingredients cannot be read, offer a targeted retake and preserve a local draft; never invent identity to satisfy validation.
- Draft lifecycle: unfinished additions are device-only drafts and are never published as products. Private photo uploads for extraction do not publish a product.
- Save idempotency: retrying the same save (network retry, re-submission, double-tap) must reuse the original ingredients-photo identity to prevent duplicate records.
- Nutrition enrichment: allows updating an existing product record later only while it remains `unverified` and all nutrient fields are currently `null`, submitted from the contributing device; enrichment only fills null fields and strictly preserves existing product `status`.
- Daily reference for an adult: 2000 kcal, 90 g sugars, 20 g saturated fat, 6 g salt.
- Allergens: the 14 EU allergens, with these Romanian names: `Gluten, Crustacee, Ouă, Pește, Arahide, Soia, Lapte, Fructe cu coajă lemnoasă, Țelină, Muștar, Susan, Dioxid de sulf și sulfiți, Lupin, Moluște`.
- Ingredient groups: `base`, `fat`, `taste`, `add`, `cult` (names from the prototype).
- Every ingredient explanation carries a source a human has opened. Ingredients not in the knowledge base are shown with their label text and "Explicație în curând".
- Every product shows its source, photo date, and verification state.

## 4. Score

- Nutri-Score **2023** points and letter with the official algorithm (general foods incl. cheese and red meat, fats/oils/nuts, beverages), from Santé publique France's update reports.
- 0–100 by letter band, linear inside the band's points range for that kind: A 100…80, B 79…60, C 59…40, D 39…20, E 19…0. Open-ended bands use the kind's minimum/maximum possible points.
- Grade: `good` ≥ 60, `medium` 40–59, `low` < 40; `unavailable` ("Date insuficiente") when kcal, sugar, sat, or salt is null, or when category is unconfirmed / `necunoscut`. Missing values never become zero, and no score is computed without approved inputs and category.
- Do not change the scoring algorithm or invent medical/nutrition facts.
- Ingredients analysis is independent of the nutrition score: allergens and ingredient insights are presented even when nutrition values are missing or the score is unavailable.
- Clear distinction between literal label transcription and sourced ingredient explanations.
- An unknown allergen or missing label text is never proof of absence; allergen status reflects only confirmed findings.
- Up to 3 reasons (`good`/`bad`/`neutral`, Romanian, with the real numbers).
- Always show "Calculat la 100 g; nu indică riscul unei boli." Never use the Nutri-Score logo.

## 5. Identification

1. **On device:** `scanFromURLAsync` (expo-camera) on the product photo for EAN-13, EAN-8, UPC-A. A valid code → `lookup(code)`.
2. **No barcode in the photo:** the compressed photo goes to the `identify` function. Claude Haiku returns `{ brand, name, quantity, barcodeDigits }`. If it read barcode digits that pass the checksum → lookup by code. Otherwise a trigram search (`pg_trgm`) over `brand || ' ' || name` returns up to 3 candidates with similarity ≥ 0.35.
3. **Shopper confirms:** one candidate with similarity ≥ 0.6 → "Este acesta?" confirm screen; otherwise a pick-list of candidates plus "Nu e niciunul". "Nu e niciunul" or no candidates → the add flow, pre-filled with the brand, name, quantity (and code if known) that AI read.

## 6. Architecture

**Web (phone browser):** `apps/mobile` also builds for web (`npx expo export -p web`, react-native-web) and is hosted on Cloudflare Pages at `https://okbite.md`, with a web manifest and a service worker so it installs and opens offline. Platform differences live in `*.web.ts(x)` files next to the native ones:

| Feature | Native | Web |
|---|---|---|
| Camera photo | expo-camera `CameraView` | expo-camera on web, or file input with `capture="environment"` |
| Barcode in photo | `scanFromURLAsync` | browser `BarcodeDetector` when available (Chrome Android); otherwise skip to `identify`, which also reads printed digits |
| Live barcode scan | `CameraView` scanner | `BarcodeDetector` on the video stream when available; otherwise manual entry only |
| History and offline queue | expo-sqlite | IndexedDB |
| Device id | expo-secure-store | `localStorage` |
| Haptics, share sheet | expo-haptics, `Share` | none; Web Share API, else copy link |
| Product links | `okbite://product/<id>` | `https://okbite.md/product/<id>` (also used in shared texts) |

**Shared by all three platforms:**

- `apps/mobile`: Expo SDK (latest stable), Expo Router, TypeScript, expo-camera, expo-image-manipulator, expo-sqlite (history and offline queue), expo-secure-store (device id), jest-expo + React Native Testing Library. Built and submitted with EAS Build / EAS Submit; JS fixes shipped with EAS Update.
- `packages/shared`: contract (types + Zod), pure logic (EAN checksum, score, allergen matcher). Copied into `supabase/functions/_shared/` by `pnpm sync-shared`.
- `supabase/`: Postgres + `pg_trgm`, Storage buckets `uploads` (private) and `products` (public), Edge Functions `lookup`, `identify`, `read-label`, `add-product`, `report`, `moderate`. Team sign-in with Supabase Auth (email magic link) for the moderation screen only.
- AI: `identify` and `read-label` call Claude Haiku (`claude-haiku-5-5`) with images and require JSON. Monthly spend cap on the API key.
- Shoppers are identified only by a random device id (UUID in secure store) in header `x-device-id`. Rate limits per device per 24 h: `identify` 40, `read-label` 20, `add-product` 10, `report` 20.
- Usage counts in `usage_events` (`photo`, `barcode`, `identified`, `not_found`, `read_label`, `added`, `report`). No third-party trackers.

## 7. Contract

Exact types live in `packages/shared/src/contract.ts` (R2, Task C1).

| Function | Method | Request | Response |
|---|---|---|---|
| `lookup` | GET `?code=` or `?id=` | — | `LookupResponse` |
| `identify` | POST | `IdentifyRequest` | `IdentifyResponse` |
| `read-label` | POST | `ReadLabelRequest` (`nutrition`: `separate` \| `same_photo` \| `none` \| `skipped`; absent = old client) | `ReadLabelResponse` (`reasons`: one `FieldReason` per nutrient and `ingredientsText`) |
| `read-label` (enrich read) | POST | `EnrichReadLabelRequest` (nutrition photo only, `ingredientsImage: null`) | `EnrichReadLabelResponse` (`ingredientsPhotoPath: null`) |
| `add-product` | POST | `AddProductRequest` (`categorySlug` optional, defaults to `necunoscut`; `brand` may be `''`) | `LookupResponse` (status `found`, product `unverified`) |
| `enrich-product` | POST | `EnrichProductRequest` (`productId`, `unit`, `nutrients`, `nutritionPhotoPath`) | `LookupResponse` |
| `report` | POST | `ReportRequest` | `{ status: 'ok' }` |
| `moderate` | POST (moderator JWT) | `ModerateRequest` | `{ status: 'ok' }` |

Errors: HTTP 4xx/5xx with `{ error: 'bad_request' | 'rate_limited' | 'not_found' | 'unauthorized' | 'upstream_failed' | 'duplicate', message }`.

`FieldReason`: `read`, `not_printed`, `not_photographed`, `unreadable`, `no_per_100`, `failed`. A field that is not `read` is `null`, never `0`. `unclear` stays in `ReadLabelResponse` for old clients.

## 8. Store and non-functional requirements

- iOS 16+ and Android 9+; in the browser, Safari on iOS 16.4+ and Chrome on Android (latest two versions); phones from 360 dp wide; light and dark mode.
- Web: served over HTTPS only (camera needs it); Lighthouse PWA installable and accessibility ≥ 95 on the phone profile.
- Camera and photo-library permission texts in Romanian (Info.plist / Android manifest), explaining photos are used to read labels.
- Accessibility: every control has `accessibilityLabel`; Dynamic Type / font scaling up to 200% without clipping; touch targets ≥ 44 pt; contrast ≥ 4.5:1.
- Time from photo to answer for a known product: under 3 s on 4G.
- Privacy: no accounts, no location; photos go to the Claude API for reading and are stored for the product record (stated in the privacy policy and in App Store / Play data-safety forms); EXIF stripped.
- Store needs: Apple Developer Program and Google Play developer accounts, privacy policy URL, support email, screenshots for 6.7" iPhone and Android phone, age rating questionnaires.

## 9. Acceptance criteria

1. **Unknown product creation from front + ingredients photos without mandatory keyboard input**: Shoppers can photograph the front of the pack and the ingredients list, and save the product without being forced to type brand, product name, or category.
2. **Nutrition question asked only after both photos with all four choices**: The nutrition prompt appears strictly after both front and ingredients photos have been acquired, presenting four distinct choices: separate photo, table in ingredients photo, no table on packaging, and skip for now.
3. **"No table" and "skip for now" save ingredients-only without misleading nutrition warning**: Choosing "no table" or "skip for now" saves the product with ingredients analysis only, without triggering misleading warnings about blurry photography or camera errors.
4. **"Yes" and "same-photo" retain only printed nutrition and score conditionally**: Selecting a separate photo or same-photo mode records only values physically printed on the label, and shows a nutrition score only when approved nutrient inputs and a confirmed category permit it (otherwise showing "Date insuficiente").
5. **Unreadable optional table offers retake or continue ingredients-only**: If the nutrition table cannot be parsed by AI, the shopper is given the choice to retake the nutrition photo or proceed with ingredients only, preserving all other captured photos and already-extracted data.
6. **Missing nutrients stay null, never zero or invented**: All absent or unread nutrients remain strictly `null`; they are never coerced to `0`, substituted with defaults, or fabricated.
7. **Enrichment updates same ID conditionally, retries prevent duplicates, drafts restore locally**: Later nutrition enrichment updates the existing product ID only if it remains `unverified` and all nutrient fields are currently `null`. Network retries or rapid double-taps reuse original photo identities and prevent duplicate records. Reloading the app restores any local draft without automatically resubmitting pending AI read requests.
8. **Physical verification on iPhone and Android**: Validated on actual iPhone (Safari web + installed app) and Android phone (Chrome web + installed app), in light and dark mode, and at 200% font scaling, with verifiable execution evidence (commit SHA, device model, OS version, mode, test outcome, screenshots) and zero fabricated test results.
