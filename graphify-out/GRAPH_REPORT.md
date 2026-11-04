# Graph Report - docs  (2026-11-04)

## Corpus Check
- Corpus is ~24,112 words - fits in a single context window. You may not need a graph.

## Summary
- 147 nodes · 427 edges · 8 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Backend Functions And Contract
- Photo Capture And Add Flow
- Platform CI And Release
- Results Score And History
- Database Identity And Telemetry
- Copy UI Kit And Legal
- Moderation
- Reference Data Pipeline

## God Nodes (most connected - your core abstractions)
1. `C1 Contract` - 23 edges
2. `C2 Database schema, RLS, search, seed` - 20 edges
3. `B1 App shell, theme, UI kit and API client` - 19 edges
4. `C6 add-product and report functions` - 19 edges
5. `B2 Capture screen, barcode in photo, live scan, manual entry` - 18 edges
6. `D4 identify function` - 18 edges
7. `B7 Add flow (two shots, review, save)` - 17 edges
8. `D9 Web app: PWA, service worker, Playwright, okbite.md` - 16 edges
9. `OkBite prototype (Main.dc.html, Pe Etichetă)` - 15 edges
10. `C3 sync-shared, function helpers and lookup` - 15 edges

## Surprising Connections (you probably didn't know these)
- `apps/mobile/src/copy/ro.ts (Romanian copy, plural)` --references--> `OkBite prototype (Main.dc.html, Pe Etichetă)`  [EXTRACTED]
  superpowers/plans/2026-11-03-okbite-lane-a-content.md → prototype/Main.dc.html
- `/identify screen (ConfirmMatch, CandidateList, NotFound)` --implements--> `Confirmare produs artboard`  [EXTRACTED]
  superpowers/plans/2026-11-03-okbite-lane-b-frontend.md → prototype/Main.dc.html
- `/identify screen (ConfirmMatch, CandidateList, NotFound)` --implements--> `Produs negăsit artboard`  [EXTRACTED]
  superpowers/plans/2026-11-03-okbite-lane-b-frontend.md → prototype/Main.dc.html
- `/product/[id] result screen (useProduct, ResultView, portion.ts)` --implements--> `Rezultat artboard`  [EXTRACTED]
  superpowers/plans/2026-11-03-okbite-lane-b-frontend.md → prototype/Main.dc.html
- `Web (Expo web) platform fallbacks` --rationale_for--> `findBarcode() (+ .web BarcodeDetector variant)`  [INFERRED]
  superpowers/specs/2026-11-03-okbite-design.md → superpowers/plans/2026-11-03-okbite-lane-b-frontend.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Contract consumers (C1 contract used by app, functions, data)** — superpowers_plans_2026_11_03_okbite_lane_c_backend_contract_ts, superpowers_plans_2026_11_03_okbite_lane_b_frontend_task_b1, superpowers_plans_2026_11_03_okbite_lane_c_backend_task_c3, superpowers_plans_2026_11_03_okbite_lane_d_quality_task_d4, superpowers_plans_2026_11_03_okbite_lane_d_quality_task_d5, superpowers_plans_2026_11_03_okbite_lane_c_backend_task_c6, superpowers_plans_2026_11_03_okbite_lane_a_content_task_a2 [EXTRACTED 1.00]
- **Photo identify flow (capture -> findBarcode -> identify -> confirm/add)** — superpowers_plans_2026_11_03_okbite_lane_b_frontend_usecaptureflow, superpowers_plans_2026_11_03_okbite_lane_b_frontend_findbarcode, superpowers_plans_2026_11_03_okbite_lane_d_quality_identify_fn, superpowers_plans_2026_11_03_okbite_lane_c_backend_search_products, superpowers_plans_2026_11_03_okbite_lane_b_frontend_identify_screen, superpowers_plans_2026_11_03_okbite_lane_b_frontend_add_screens [EXTRACTED 1.00]
- **Add unknown product flow (read-label -> review -> add-product -> moderate)** — superpowers_plans_2026_11_03_okbite_lane_d_quality_read_label_fn, superpowers_plans_2026_11_03_okbite_lane_b_frontend_add_screens, superpowers_plans_2026_11_03_okbite_lane_c_backend_add_product_fn, superpowers_plans_2026_11_03_okbite_lane_c_backend_moderate_fn, superpowers_specs_2026_11_03_okbite_design_unverified_status [INFERRED 0.85]

## Communities (8 total, 0 thin omitted)

### Community 0 - "Backend Functions And Contract"
Cohesion: 0.15
Nodes (27): apps/mobile/src/lib/api.ts (typed API client, ApiError), findBarcode() (+ .web BarcodeDetector variant), parseAmount(), add-product Edge Function, packages/shared/src/contract.ts (Zod contract), scripts/import-off.ts (Open Food Facts import, mapOffProduct), supabase/functions/_lib/db.ts (loadProduct), supabase/functions/_lib/storage.ts (saveJpeg, publishPhoto) (+19 more)

### Community 1 - "Photo Capture And Add Flow"
Cohesion: 0.12
Nodes (25): OkBite prototype (Main.dc.html, Pe Etichetă), Fotografiere etichetă artboard, Confirmare produs artboard, Ingrediente artboard, Produs negăsit artboard, Confirmare text (OCR) artboard, Fără conexiune artboard, Scanner artboard (+17 more)

### Community 2 - "Platform CI And Release"
Cohesion: 0.17
Nodes (23): store/ listing, privacy answers, icon, screenshots, review notes, A5 Store listing material, A8 Launch posts, shareProduct(), B8 Accessibility, dark mode, sharing, polish, apps/mobile/app.config.ts, .github/workflows ci.yml + preview.yml, .github/CODEOWNERS (+15 more)

### Community 3 - "Results Score And History"
Cohesion: 0.16
Nodes (22): Istoric artboard, Rezultat artboard, data/score-fixtures.json, A3 Score test fixtures, history store / db.ts (saveToHistory, listHistory), /product/[id] result screen (useProduct, ResultView, portion.ts), B3 Identify flow screens, B4 Result screen (+14 more)

### Community 4 - "Database Identity And Telemetry"
Cohesion: 0.17
Nodes (14): Acasă (home) artboard, getDeviceId (device.ts / device.web.ts), apps/mobile/app/_layout.tsx, client_errors table, daily_stats view, supabase/migrations/20261105000000_init.sql, supabase/functions/_lib/http.ts (json, fail, cors, readDeviceId, readJsonBody, checkRateLimit, logEvent), supabase/seed.sql (6 prototype products) (+6 more)

### Community 5 - "Copy UI Kit And Legal"
Cohesion: 0.27
Nodes (12): Comparație artboard, app/(info) about/privacy/terms/method + legal/texts.ts, apps/mobile/src/copy/ro.ts (Romanian copy, plural), A1 Romanian copy file, A4 Legal and method screens, hosted privacy policy, /compare screen (compareRows), formatAmount (format.ts), B1 App shell, theme, UI kit and API client (+4 more)

### Community 6 - "Moderation"
Cohesion: 0.22
Nodes (9): apps/mobile/src/lib/supabase.ts, apps/mobile/app/admin screens (UnverifiedList, ProductEditor, ReportsList), is_moderator() SQL function, moderate Edge Function, ModerateRequest schema, docs/ops/moderation.md, C7 Moderation function and admin screens, C8 Backups and moderation routine (+1 more)

### Community 7 - "Reference Data Pipeline"
Cohesion: 0.42
Nodes (9): data/categories.json, scripts/check-data.ts (checkData, pnpm data:check), data/ingredients.json, A2 Categories and ingredient knowledge base, AddProductRequest schema, ALLERGENS (14 EU allergens), IngredientEntry / CategoryEntry / ScoreFixture schemas, scripts/load-data.ts (pnpm data:load) (+1 more)

## Knowledge Gaps
- **10 isolated node(s):** `ErrorCode / ErrorBody`, `Storage buckets uploads/products`, `supabase/migrations/20261105000000_init.sql`, `docs/ops/moderation.md`, `theme tokens / useTheme` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 12 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `OkBite prototype (Main.dc.html, Pe Etichetă)` connect `Photo Capture And Add Flow` to `Results Score And History`, `Database Identity And Telemetry`, `Copy UI Kit And Legal`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `ErrorCode / ErrorBody`, `Storage buckets uploads/products`, `supabase/migrations/20261105000000_init.sql` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Photo Capture And Add Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._
- **Why does `C1 Contract` connect `Results Score And History` to `Backend Functions And Contract`, `Platform CI And Release`, `Copy UI Kit And Legal`, `Moderation`, `Reference Data Pipeline`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `B1 App shell, theme, UI kit and API client` connect `Copy UI Kit And Legal` to `Backend Functions And Contract`, `Results Score And History`, `Database Identity And Telemetry`, `Moderation`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._