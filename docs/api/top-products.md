# `top-products` — candidates for "Cel mai bun din raft"

Status: **the function does not exist yet.** The app already calls it (`api.topProducts` in
`apps/mobile/src/lib/api.ts`); until it is deployed the section shows its error state with a retry.
In demo mode (`EXPO_PUBLIC_PREVIEW=1` without a backend URL) the app answers from its sample products.

The Scan home screen shows, per category ("shelf"), the three best verified products by OkBite
product score. The backend returns candidates; **the app ranks them**, so the order always matches
the score shown on Result, History and Compare.

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
- With a nutrition score (`score.score` not null) — products without one are dropped by the app anyway.
- At most `limit`, best `score.score` first. Twenty candidates are asked for so the app can re-rank by
  the product score (nutrition, additives, processing) and still fill three rows.

## What the app does with the answer

1. Validates with Zod (`TopProductsResponse` in `apps/mobile/src/features/shelf/topProducts.ts`):
   `{ category: string (non-empty), products: Array<{ product: Product, score: ScoreResult }> }`.
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

1. Should `TopProductsResponse` move into the shared contract (R2), replacing the local schema?
2. Pre-ordering: `score.score` is the nutrition score, the app ranks by the product score. Can the
   backend order by the product score (`productScore` from `@okbite/shared`) so 20 candidates are surely enough?
3. A `total` count of verified products on the shelf? Today the header counts only the rows shown.
4. Should verified Open Food Facts imports (`source` starting with "Open Food Facts") take part, or only team-checked labels?
5. Rate limiting: the user can open up to 25 shelves in a row; is the per-device limit of `lookup` suitable here?
