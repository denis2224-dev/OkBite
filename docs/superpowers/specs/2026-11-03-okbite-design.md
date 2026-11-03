# OkBite — Design Spec

Date: 2026-11-03 · Status: approved for planning
Prototype (source of truth for screens, copy and states): https://claude.ai/artifact/5rY8DhLtDRH67SQzXMyP8s
Team plan (roles, timeline): https://claude.ai/artifact/XQm9DtD4aXXZBCi6sJfGQ4

## 1. What OkBite is

A Romanian-language PWA for shoppers in Moldova. The shopper scans a food barcode (or types it) and sees: allergens, "may contain" traces, a 0–100 nutrition score with up to three reasons, per-portion values against an adult daily reference, every ingredient explained with a source, and a side-by-side comparison with another product in the same category. Products missing from the catalogue can be added by photographing the label; a team moderator approves them before they go public. History works offline.

Public launch: **2026-12-08**. Romanian only. No shopper accounts.

## 2. Screens (all exist in the prototype; match its layout, copy and states)

| Route | Screen | Prototype artboard |
|---|---|---|
| `/` | Home: scan button, photo and compare shortcuts, recent scans, score legend | 1 · Acasă |
| `/scan` | Scanner, manual code entry (8 or 13 digits), camera-refused state | 2 · Scanner, Cameră refuzată |
| `/p/:code` | Confirm product, then result | 2b · Confirmare, 3 · Rezultat, Date insuficiente |
| `/p/:code/ingredients` | Ingredients explained, grouped | 4 · Ingrediente |
| `/p/:code/label` | Original label view | (sheet in 3 · Rezultat) |
| `/compare?a=:code&b=:code` | Compare two products of one category | 5 · Comparație |
| `/add/:code` | Two-shot label capture | 6 · Fotografierea etichetei |
| `/add/:code/review` | Confirm extracted text, then submit | 6b · Confirmarea textului extras, OCR neclar |
| `/history` | On-device history, clear all | 7 · Istoric |
| (state) | Product not found | Produs negăsit |
| (state) | Offline, code queued | Fără conexiune |
| `/despre`, `/confidentialitate`, `/termeni`, `/metoda` | About the data, privacy, terms, score method | — |
| `/admin` | Moderation (team only) | — |

## 3. Data rules

- Nutrients are stored per 100 g (solids) or per 100 ml (drinks): `kcal, fat, sat, sugar, salt, protein, fiber, fruitVegPct`. Any may be `null` (not declared).
- Daily reference for an adult: 2000 kcal, 90 g sugars, 20 g saturated fat, 6 g salt.
- Allergens: the 14 EU allergens, stored with these Romanian names: `Gluten, Crustacee, Ouă, Pește, Arahide, Soia, Lapte, Fructe cu coajă lemnoasă, Țelină, Muștar, Susan, Dioxid de sulf și sulfiți, Lupin, Moluște`.
- Ingredient groups: `base` (Ingrediente de bază), `fat` (Grăsimi), `taste` (Gust și dulceață), `add` (Aditivi), `cult` (Culturi și fermenți).
- Every ingredient explanation carries a source (URL or regulation name) that a human has opened.
- Every product shows its source, photo date and place, and verification date.

## 4. Score

- Compute Nutri-Score **2023** points and letter with the official algorithm (general foods incl. cheese and red-meat rules, fats/oils/nuts, beverages), from Santé publique France's published update reports.
- Convert to 0–100 by letter band, interpolating linearly inside the band's points range for that product kind:
  - A → 100…80, B → 79…60, C → 59…40, D → 39…20, E → 19…0 (lower points = higher score).
  - Open-ended bands use the minimum/maximum points possible for that kind as the band edge.
- Grade from score: `good` ≥ 60, `medium` 40–59, `low` < 40; `unavailable` when kcal, sugar, sat or salt is null.
- Up to 3 reasons (`good`/`bad`/`neutral`, Romanian title + one-sentence detail with the actual numbers), derived from the components that drove the points.
- Every score screen shows: "Calculat la 100 g; nu indică riscul unei boli." Never use the Nutri-Score logo.

## 5. Architecture

- `apps/web`: Vite + React 18 + TypeScript + react-router + vite-plugin-pwa + Dexie (IndexedDB) + @zxing/browser. Hosted on Cloudflare Pages.
- `packages/shared`: the contract (types + Zod schemas) and pure logic: EAN checksum, score, allergen matcher. Copied into `supabase/functions/_shared/` by `pnpm sync-shared` (generated; never edit the copy).
- `supabase/`: Postgres migrations, seed, Storage bucket `labels` (private), Edge Functions `lookup`, `read-label`, `submit`, `report`, `moderate`. Team sign-in with Supabase Auth (email magic link) for `/admin` only.
- Label reading: `read-label` sends the two photos to Claude Haiku (`claude-haiku-5-5`) and asks for JSON matching `ReadLabelResponse`. Monthly spend cap on the API key.
- Shoppers are identified only by a random device id (UUID in localStorage), sent as header `x-device-id`, used for rate limits: 20 `read-label` and 10 `submit` calls per device per 24 h.
- Analytics: rows in `usage_events` (`scan`, `not_found`, `submit`, `read_label`); no third-party trackers.

## 6. Contract

The exact types live in `packages/shared/src/contract.ts` (defined in Lane C, Task C1). Function endpoints:

| Function | Method | Request | Response |
|---|---|---|---|
| `lookup` | GET `?code=` | — | `LookupResponse` |
| `read-label` | POST | `ReadLabelRequest` | `ReadLabelResponse` |
| `submit` | POST | `SubmitRequest` | `SubmitResponse` |
| `report` | POST | `ReportRequest` | `{ status: 'ok' }` |
| `moderate` | POST (moderator JWT) | `ModerateRequest` | `{ status: 'ok' }` |

Errors from every function: HTTP 4xx/5xx with body `{ error: ErrorCode, message: string }` where `ErrorCode = 'bad_request' | 'rate_limited' | 'not_found' | 'unauthorized' | 'upstream_failed'`.

## 7. Non-functional

- Works on Android Chrome and iOS Safari, 360 px wide and up.
- Lighthouse PWA installable; accessibility score ≥ 95; touch targets ≥ 44 px; text contrast ≥ 4.5:1.
- First result after a scan in under 2 s on 4G.
- Privacy: no accounts, no location; photos are sent to the Claude API for reading (stated in the privacy policy); EXIF stripped before upload.
