# `top-products` — candidates for "Cel mai bun din raft"

The app calls the `top-products` function through the configured Supabase gateway.
In demo mode (`EXPO_PUBLIC_PREVIEW=1` without a backend URL) the app answers from its sample products.

The shelf component shows up to three verified products per category. The full-screen Scan tab
keeps the component off the camera page. The backend ranks the eligible category products using
the OkBite score used by Result, History and Compare. The app recomputes the displayed score
from each returned entry.

## Request

```
GET {SUPABASE_URL}/functions/v1/top-products?category=iaurt&limit=20
Content-Type: application/json
x-device-id: <device uuid>
apikey: <anon key>
Authorization: Bearer <anon key>
```

| Query param | Value | Notes |
| --- | --- | --- |
| `category` | category slug from `data/categories.json`, e.g. `iaurt`, `fructe-legume` | The app sends only `^[a-z0-9]+(-[a-z0-9]+)*$`, at most 64 characters, never `necunoscut`. |
| `limit` | `20` (always, today) | Maximum number of products to return. |

No body. Same headers and 20 s client timeout as `lookup`. One request per shelf the user opens.

## Response `200`

```json
{
  "category": "iaurt",
  "products": [
    { "product": { "id": "0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f", "status": "verified", "name": "Iaurt natural 2,5%", "brand": "Livada Verde", "quantity": "400 g", "category": { "slug": "iaurt", "name": "Iaurt", "scoreKind": "general" }, "…": "all other Product fields" },
      "score": { "score": 78, "letter": "B", "grade": "good", "reasons": [], "missing": [] } }
  ]
}
```

- `category`: the slug that was asked for, echoed back.
- `products[]`: `{ product, score }` — exactly the `Product` and `ScoreResult` objects of the shared
  contract (`packages/shared/src/contract.ts`), i.e. the `found` answer of `lookup` without `status`.
  The **full** `Product` is needed: the product score is computed on the phone from `nutrients`,
  `ingredients`, `processing`, `category`, `source` and `ingredientsText`; the row shows `name`,
  `brand`, `quantity`; the tap opens `/product/{id}`.
- An empty shelf is `200` with `"products": []`, not an error.

### Which products to return

- `status = 'verified'` only; never hidden or unverified products.
- `category.slug` equal to the requested slug.
- With a numeric score. The input score comes from the nutrition rules for food and the chemical
  rules for water, as in product lookup.
- At most `limit`, best OkBite product score first, with ties resolved by Romanian product name, then
  ID. Food ranking includes nutrition, additives and processing. Water ranking uses the chemical
  score. Each entry carries the same `ScoreResult` as product lookup.

## What the app does with the answer

1. Validates with the shared Zod `TopProductsResponse` schema, including its 20-entry cap.
   Any mismatch, or a `category` different from the one requested, counts as `invalid_response`.
2. Keeps `product.status === 'verified'` with a non-null product score (`productScoreFor`).
3. Sorts by product score, highest first; ties by `name` A to Z (Romanian collation); keeps 3.
4. Zero rows left: the empty state ("Încă niciun produs verificat pe acest raft.").

## Errors

Non-2xx answers use the existing body `{ "error": ErrorCode, "message": string }` with the existing
codes (`bad_request`, `rate_limited`, `not_found`, `unauthorized`, `upstream_failed`, `duplicate`);
anything else is read as `upstream_failed`. Network failure or timeout is `offline`; an unreadable or
invalid body is `invalid_response`. The section shows the same short message and "Încearcă din nou"
for all of them. An unknown category should be `400 bad_request`.

## Caching

The app keeps each shelf's ranked answer in memory until it is closed (no disk cache, no refresh);
failures are not kept. The function may add `Cache-Control` (a few minutes is fine); the app does not depend on it.

## Open questions for the backend

1. Should the header show a total count of verified products on the shelf? Today it counts displayed rows.
2. Should the shelf keep including verified Open Food Facts imports alongside team-checked labels?
3. Is the lookup per-device rate limit suitable here? A shopper can open up to 25 shelves in a row.
