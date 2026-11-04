# OkBite — Design Spec

Date: 2026-11-04 (revised: native iPhone + Android app, photo-first flow) · Status: approved for planning
Prototype (source of truth for look, copy and states): `docs/prototype/Main.dc.html` · https://claude.ai/artifact/5rY8DhLtDRH67SQzXMyP8s
Team plan (roles, timeline): https://claude.ai/artifact/XQm9DtD4aXXZBCi6sJfGQ4

## 1. What OkBite is

A Romanian-language mobile app for iPhone and Android, published in the App Store and Google Play, for shoppers in Moldova.

The core flow:

1. The shopper **photographs the product**.
2. The app looks for a **barcode in the photo**. If it finds one, it looks the product up by code. If not, AI reads the **brand, name and quantity from the pack**, the backend searches the database, and the shopper confirms the match.
3. **Found** → the shopper gets the answer: allergens, "may contain" traces, a 0–100 nutrition score with up to three reasons, per-portion values against an adult daily reference, every ingredient explained with a source, and a comparison with another product of the same category.
4. **Not found** → the app asks the shopper to photograph the **ingredients list and the nutrition table**. AI reads them, the shopper corrects anything unclear, gets the answer immediately, and the product is **added to the database at once**, visible to everyone and marked "Neverificat" until the team verifies it.

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
| `/add` | Two shots: ingredients list, then nutrition table (option "Sunt pe aceeași poză") | 6 · Fotografierea etichetei |
| `/add/review` | Confirm extracted text and product name/brand/quantity, then save | 6b · Confirmarea textului extras, OCR neclar |
| `/history` | On-device history, clear all | 7 · Istoric |
| (state) | Offline: photo or code kept, retried when online | Fără conexiune |
| `/about`, `/privacy`, `/terms`, `/method` | About the data, privacy, terms, score method | — |
| `/admin` | Moderation, team only, hidden behind sign-in | — |

## 3. Data rules

- A product has an internal `id` (UUID). `code` (EAN-8/EAN-13) is optional and unique when present: products added from a photo without a visible barcode have no code.
- Product `status`: `verified` (checked by the team), `unverified` (added by a shopper, visible with a "Neverificat" badge), `hidden` (removed by the team).
- Nutrients per 100 g (solids) or 100 ml (drinks): `kcal, fat, sat, sugar, salt, protein, fiber, fruitVegPct`; any may be `null`.
- Daily reference for an adult: 2000 kcal, 90 g sugars, 20 g saturated fat, 6 g salt.
- Allergens: the 14 EU allergens, with these Romanian names: `Gluten, Crustacee, Ouă, Pește, Arahide, Soia, Lapte, Fructe cu coajă lemnoasă, Țelină, Muștar, Susan, Dioxid de sulf și sulfiți, Lupin, Moluște`.
- Ingredient groups: `base`, `fat`, `taste`, `add`, `cult` (names from the prototype).
- Every ingredient explanation carries a source a human has opened. Ingredients not in the knowledge base are shown with their label text and "Explicație în curând".
- Every product shows its source, photo date, and verification state.

## 4. Score

- Nutri-Score **2023** points and letter with the official algorithm (general foods incl. cheese and red meat, fats/oils/nuts, beverages), from Santé publique France's update reports.
- 0–100 by letter band, linear inside the band's points range for that kind: A 100…80, B 79…60, C 59…40, D 39…20, E 19…0. Open-ended bands use the kind's minimum/maximum possible points.
- Grade: `good` ≥ 60, `medium` 40–59, `low` < 40; `unavailable` when kcal, sugar, sat or salt is null.
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

Exact types live in `packages/shared/src/contract.ts` (Lane C, Task C1).

| Function | Method | Request | Response |
|---|---|---|---|
| `lookup` | GET `?code=` or `?id=` | — | `LookupResponse` |
| `identify` | POST | `IdentifyRequest` | `IdentifyResponse` |
| `read-label` | POST | `ReadLabelRequest` | `ReadLabelResponse` |
| `add-product` | POST | `AddProductRequest` | `LookupResponse` (status `found`, product `unverified`) |
| `report` | POST | `ReportRequest` | `{ status: 'ok' }` |
| `moderate` | POST (moderator JWT) | `ModerateRequest` | `{ status: 'ok' }` |

Errors: HTTP 4xx/5xx with `{ error: 'bad_request' | 'rate_limited' | 'not_found' | 'unauthorized' | 'upstream_failed' | 'duplicate', message }`.

## 8. Store and non-functional requirements

- iOS 16+ and Android 9+; in the browser, Safari on iOS 16.4+ and Chrome on Android (latest two versions); phones from 360 dp wide; light and dark mode.
- Web: served over HTTPS only (camera needs it); Lighthouse PWA installable and accessibility ≥ 95 on the phone profile.
- Camera and photo-library permission texts in Romanian (Info.plist / Android manifest), explaining photos are used to read labels.
- Accessibility: every control has `accessibilityLabel`; Dynamic Type / font scaling up to 200% without clipping; touch targets ≥ 44 pt; contrast ≥ 4.5:1.
- Time from photo to answer for a known product: under 3 s on 4G.
- Privacy: no accounts, no location; photos go to the Claude API for reading and are stored for the product record (stated in the privacy policy and in App Store / Play data-safety forms); EXIF stripped.
- Store needs: Apple Developer Program and Google Play developer accounts, privacy policy URL, support email, screenshots for 6.7" iPhone and Android phone, age rating questionnaires.
