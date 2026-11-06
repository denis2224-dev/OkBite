# Production readiness — 6 November 2026

**Decision: NO-GO.** Two R2 changes are prepared for review. Reproduced defects
outside R2, incomplete checked content, connected acceptance and required human,
Claude and physical-device gates remain open. No deployment, store submission,
merge, purchase or hosted mutation was performed. Stanislav decides merge order.

## Revisions, scope and evidence

| Label | Exact code SHA | Scope |
| --- | --- | --- |
| M | `efb3c6a591941af45d292a203dd967b60d4b1989` | Fetched `origin/main`; clean baseline; all inventory rows unless stated otherwise |
| F | `7984a9f60909fc86a7a1d82d4c928b7f13d67906` | `C6-idempotent-photo-submissions`; private contribution receipts + recovery verification |
| P | `a8aa7e87c050c45102361c7dc0d1ae9c0d8e5cd5` | `C8-scoped-staging-probes`; operator-run pinned probes, never run against hosted staging here |
| H71 | `5394e8e944b88d483ddf897c39791034cf257551` | [#71](https://github.com/denis2224-dev/OkBite/pull/71), draft, main base, CI green, no submitted review |
| H72 | `1e23e7c8a4e63ca4549e259b8bc3ee522543035e` | [#72](https://github.com/denis2224-dev/OkBite/pull/72), draft, stacked on #71, CI green, no submitted review |

All pre-existing worktrees/changes were inventoried and left untouched, including
staged D1 work, `.idea`, R4 startup/artwork and R5 uncommitted recovery work. Three
independent audits used separate worktrees. Only two open PRs existed at refresh;
their explicit Claude/phone hold remains. No merged #31/#36/#37/#61 work was replayed.
The planning graph has 147 nodes and refers to old lane plans: it guided dependency
discovery, then every finding was checked against current source. No graph output
is included in these changes. Expo's incidental audit-worktree tsconfig rewrite
was restored to its original bytes; approved design/assets/startup were preserved.

Detailed evidence is outside Git at `/private/tmp/okbite-readiness-evidence-20261106/`:
`{ai-data,client,platform}-audit.md` contain the expanded acceptance inventories;
`*-checks.json` records exact tested heads/commands/exits; logs and owner patch/test
packages are alongside them. Private local credentials, start logs and DB archives
are restricted and excluded from the shareable review package. No real photographs
or human transcriptions were supplied; synthetic/demo fixtures are labelled as such.

## Executed checks and inherited limitations

Actual toolchain: Node **22.23.4**, pnpm **11.25.0** (declared policy, not old pnpm9
plan text), Deno **2.9.6**, Supabase CLI **2.65.5**. M frozen install, lint,
types, `pnpm test` (**878 passed, no skips**), data check (**0 errors**), shared
generation, web/native exports pass. Lint has **57 inherited warnings**, zero errors.
M Deno unit-only run: **37 passed**; clean configured full run: **58 passed,
0 ignored**; original four-migration DB: **96 assertions passed**. Eight Playwright
checks pass in Chromium/WebKit phone profiles, using local demo fixtures only.
They prove shell/history/manifest/cache/POST behavior, not connected photo flows.

F's three new retry regressions were observed **RED (3 failures) → GREEN** against
real local DB/Storage. Full configured Edge suite: **61 passed, 0 ignored**;
DB: **103 assertions**, lint clean. A fresh restored database matched counts,
owners, effective grants and passed all 103 assertions. Its receipt-count check
was first RED (missing from report) and then GREEN with one known fixture. No
hosted restore or new hosted/photo-binary recovery is claimed. P's network-denied
guard/HTTP/schema tests were **3 RED → 3 GREEN**. Final-head check manifests and
PR checks, rather than historical handoff totals, are authoritative.

Harness failures retained in evidence: sandbox DNS blocked the first install;
missing filesystem permission caused a Deno unit attempt to fail; local server
binding and absent Playwright binaries initially blocked browser execution.
These were corrected without changing repository policy. CLI's local Kong CORS
override initially failed two gateway checks; the documented workaround was applied
only to the new audit container. A baseline DB attempt mistakenly selected the new
receipt test before its migration; rerunning main's six SQL files passed 96.
Recovery setup/path mistakes were corrected before the final verified drill.
Inherited runtime messages include NO_COLOR/FORCE_COLOR, Workbox update-store
permissions, provider-failure test diagnostics and development-only `/sw.js`
HTML/MIME failure. No warning was globally suppressed.

## Defects, missing implementation and evidence gates

| ID / owner / severity | Classification and reproduction at M | Concrete action / dependency |
| --- | --- | --- |
| R2-01 / R2 / P1 | **Defect fixed in F:** after a lost HTTP response, another no-barcode save creates a second product; concurrent attempts differ; recovery at full quota returns429. Existing lost-RPC recovery covered only the first invocation. | Private `(device_id, ingredients upload)` receipt is written atomically; retries return original data before quota admission; concurrent losers clean their own copies; hidden stays409. Apply migration before new handler. |
| R2-02 / R2 / P1 | **Recovery verification fixed in F:** old count report omitted the newly introduced receipt data, despite green restored-schema/grant assertions. | Compare receipt counts too; real one-row restore regression passes. Fixtures removed; dumps stay private. |
| R3-01 / Serghei (R3) / P1 | **Reproduced defect:** identify stored-photo download/rejection/Blob body failure occurs outside pre-provider compensation. Nine cases reserve quota, leave upload, never call provider and never attempt either cleanup, including failed-compensation variants. | Review `identify-pre-provider.patch` + regressions; 9 RED on M, 9 GREEN on scratch proposal. Tracked R3 source untouched pending owner authorization, full-head checks and Claude review. |
| R4-01 / R4 / P1 | **Reproduced defect:** actual preview module returns true in production with missing URL and no explicit preview flag. | Explicit preview opt-in proposal: 1 fail/1 pass on M → 2 pass on scratch copy. R4 owns implementation; R1 guard is complementary. |
| R1-01 / R1 / P1 | **Reproduced defect:** production config accepts absent backend/project settings or explicit demo. Ten executable cases: 8 fail/2 pass on M, all10 pass on proposed config copy. | Review `release-config.owner.patch`; bind actual distinct prod/staging refs and production OTA marker. No R1 config applied by this audit. |
| X-01 / R3+R4, R5 retries / P1 | **Verified policy mismatch:** client20s vs 3×provider20s +1s+2s backoff =63s (up to70s); server has no propagated client cancellation/operation identity. Timeout can enqueue another provider call. This is controlled timing/source evidence, not measured hosted latency. | Agree total deadline, uncertain-outcome UI, cancellation and duplicate-work semantics; add delayed-response regressions. Do not silently switch provider, require shopper accounts or introduce tracking. |
| R5-01 / R5 / P2 | **Three reproduced defects:** capture response after blur replaces route; label response after blur replaces draft/route; manual lookup after unmount navigates. Three actual-hook regressions RED; proposed lifecycle guards GREEN in scratch files. | Review `client/r5-navigation-owner.patch`; integrate focus mocks without weakening assertions; full normal/offline/error tests and phone acceptance. Preserve merged #70 and held #71/#72. |
| R4-02 / R4 / P2 | **Browser-reproduced defect:** React reports false non-boolean `accessible`. `Icon.tsx:5` and `ScoreRing.tsx:12` forward native-only SVG prop; developer console and screenshot retained. | Review `client/r4-svg-warning-owner.patch`; retain decorative/native screen-reader behavior; verify no console error without suppression. |
| X-02 / R1+R4 / P1 | **Reproduced cache defect:** real exported service worker returns `found` while online, while direct same-URL network returns `not_found` after4.5s; cached200 has no freshness marker. `cache-repro-red.log/json`. | Coordinate Workbox freshness with API/cache warning and hidden/corrected-product handling. Saved-history `?cached=1` is separately explicit snapshot behavior, not an RLS bypass. |
| R4-03 / R4 / P2 | **Measured browser defect:** Back target is40×48 px at390px viewport, below44 minimum width (`back-target.json`; `Screen.tsx:9`). | Increase shared target with R4 review; measure native controls and 200% fonts. #71 does not cover this R4 file. |
| M-01 / R1 / P1 | **Missing implementation:** native known-by-photo/add-unknown Maestro files and connected Playwright photo/label/save cases are absent. Eight browser shell tests do not cover them. | Authorized R5 media/expected labels + R1 device selectors; implement actual connected tests, retaining local-host guards. |
| E-01 / all owners / P1 | **Missing evidence:** real phones, 30-front/30-pair grading, hosted recovery, legal/content and beta gates below. | Owners execute checklist; record actual evidence. Green CI/merged PRs are insufficient. |

F's deduplication is deliberately scoped to the same device and original label
upload. It is not content/name deduplication, retroactive recovery of old products,
provider idempotency, or a guarantee after a restart that loses all draft/upload
identity and creates new uploads. R5/R4 must verify that interruption boundary.
Report retries also lack a cross-request operation key; existing tests prove
lost-RPC recovery, not exactly-once new HTTP report requests.

## Acceptance inventory

I = source + local automated coverage, D = open reproduced defect, M = missing
code/content, E = missing actual acceptance evidence, H = held owner work. Each row
uses exact M unless F/P/H is stated. `mobile`, `shared`, `scripts`, `Edge`, `DB`,
`browser` refer to the newly run suites above, not old handoff claims. No plan box
was ticked because complete human/device/review acceptance is not established.

| Requirement (plan steps/spec) / role | Implementation and automated evidence | Staging/device/human evidence | Severity / dependency / next action |
| --- | --- | --- | --- |
| D1.1–6 workspace, modules, canonical app, config, strict TS, formatting / R1 | I: workspace/Metro/toolchain tests, types, all three exports; IDs `md.okbite.app`, approved assets and Romanian permissions. | E: real installed iOS/Android minimum-version acceptance. | P1: R1 signed internal builds; no duplicate scaffold. |
| D2.1,2,2b,5,6 CI/profiles/QR/Pages/CODEOWNERS / R1 | I: frozen/head checks, staged profiles, fingerprint runtime, SPA routes; live H71/H72 CI success. Preview workflow success can mean skipped setup. | E: actual build/QR/HTTPS preview and owner approval. | P1: R1 fixes R1-01; real signing/project/build evidence. |
| D2.3–4 accounts, staging/prod separation, protection / R1+owner | I templates; no claimed cloud setup. | Operator reports existing staging; Expo/signing, distinct prod ref and protections not established. | P1: owner supplies facts, no duplicate staging/purchase. |
| D7.1–4 diagnostics + statistics / R1/R2 | I: dedupe60s, bounded schema/5s reporter, installed handlers; service-only atomic50/day; mobile, Edge, DB. | E: real error traffic/privacy/retention/access review. | P1: owner approves collection/retention; UUID reset bypasses per-device limits. |
| B5.1–3 ingredients, original label, comparison / R1 | I: groups/source/pending explanation, label route, null/equal/category+unit guards, mobile. | E: actual label/source and real share/compare flows. | P1 content gate R3; R1/R4 cache handling. |
| D9.1–2 PWA/offline/deep links/browser flows / R1 | I shell/manifest/192+512 icons, browser8; M connected photo/add specs; D X-02. | E: hosted Safari/Chrome deep links/home-screen install. | P1: R1 fixes cache/connected tests, then device runs. |
| D9.3–5 HTTPS/performance/a11y / R1+R4/R5 | Exports are I, not performance measurements. | E: Lighthouse mobile>=95, installability, known photo<3s on4G, real HTTPS/support/policy. Tool access failure is not proof of host outage. | P1: record real measurements and platform versions. |
| D6.1–4 native E2E / R1+R5 | I media-loader checks, known-code/offline YAML; M photo/add YAML. Maestro unavailable here. | E: private authorized media and signed native execution. | P1: R5 expected transcriptions; R1 implement/run all four flows. |
| C1.1–4 request/response and data schemas / R2 | I shared231, Edge validation; no contract change in F/P. | E: new cross-review/human gate. | P2: preserve canonical exports; no invented source facts. |
| C2.1–5 schema/RLS/search/seed / R2 | I DB96 at M; F103; hidden filtering, explicit grants, service-only RPCs, accent/trigram search. Seed explicitly demo-only. | Operator reports original four migrations applied; hosted grants not independently re-audited. | P1: owner compares actual migration/grant state; production never demo seed. |
| C3.1–4 generator/helpers/lookup / R2 | I deterministic10 generated modules, checksum/query/body/CORS/error/storage tests; malformed query400, hidden/missing not_found, optional analytics nonfatal. | Operator reports200/not_found, allowed204/rejected403. | P1: run P smoke separately; known real product still needed. |
| C6.1–3 matching/ownership/atomic quota/contribution/report / R2 | I local DB/Storage/HTTP tests; new F fixes no-code HTTP retries; barcode concurrency, allergen/traces, immediate unverified, lost-RPC, compensation tested. | E: real two-device unverified visibility, save/report/recovery. | P1: F migration→handler, then actual device suite. |
| C7.1–4 Auth/verify/hide/close/editor / R2 | I server getUser+DB membership recheck, revoked-write, private fields, empty-name validation, Edge/DB/mobile. | Operator reports staff sign-in only; E writes/revocation/native callbacks. | P1: actual authorized staff executes actions; no fabricated identity. |
| C8.1–3 routine/backup/rota / R2+owner | I guarded local DB/photo components; F receipt-aware restore counts/ACL103, P smoke. M approved retention/rota names. | E: hosted photos/Auth/owners/grants/full-platform recovery and restore limits. | P1: named human primary/backup8Dec–8Jan and hosted drill. |
| D3.1–3 checksum/UPC/allergen traces / R3 | I EAN8/13, leading-zero UPC-A,14 allergens/diacritics/trace exceptions, shared231. | E human-opened synonym/source review, language coverage. | P1: Serghei checks against cited source/actual labels. |
| A3 human score fixtures / R3 | I31 engine fixture records;25 declare checked,6 explicitly unchecked. Checked subset A4/B4/C7/D5/E5; cheese1. | E minimum30, >=5 each letter, >=3 cheeses not met by checked subset. | P1: Serghei checks remaining6; do not invent checkedWith/approval. |
| C4.1–4 scoring kinds/boundaries/bands/reasons/nulls / R3 | I shared231: six kinds, sweeteners, rounding, null/unavailable, <=3 reasons, comma formatting, disclaimer; Edge real-engine wiring. | E official calculator/source/human fixtures as above. | P1: source comments/test fixtures are not human approval. |
| A2 categories/150 checked ingredients/source / R3+five humans | I18 categories; **0 checked ingredients**,172 drafts safely excluded; scripts/data check. | Operator confirms18 loaded/checked empty; E actual human source checks. | P1 M content: review150+, keep drafts out of production. |
| C5.1–4 loaders/OFF/units/nulls/idempotence / R3 | I scripts31 validates checked data, checksum, unverified OFF/source/ignore-existing. | E staging import counts/second run0, actual>=50 known and>=300 launch products. | P1: operator executes reviewed import/licensing; never invent products. |
| D4.1–6 front photo/code/search/candidates/quota / R3 | I parser/handler/atomic40/day; D R3-01; provider mocked in Edge tests. | Operator front smoke only; E30 fronts (20 barcode-hidden), >=80% first-screen correct. | P1: Serghei owner fix→Claude/full checks→real human grading. |
| D5.1–7 label extraction/pairs/comma/null/quota/spend / R3 | I parser/one+two photos/atomic20/day/metadata and compensation tests. | E30 real pairs, >=90% correct-or-correct-null per field; key cap/model/terms actual setting. | P1: Serghei+operator grading and cap/privacy evidence. |
| A1.1–4 Romanian copy/plural/diacritics / R4 | I copy/format tests, agreed keys and disclaimer. | E human contextual read. | P2: R4 read each actual screen. |
| B1.1–5 theme/UI/UUID/API/shell / R4 | I mobile481 secure/local UUID, Zod and format/error tests; D R4-01/02/03, X-01. | E real three-platform shell/camera/fonts. | P1 release fallback/deadlines; R4 owns UI corrections. |
| B4.1–3 result/nulls/allergens/portion/source/report / R4 | I mobile: unavailable never0; adult refs2000/90/20/6; portion/teaspoons; unverified/source/date/reasons/disclaimer. | E six prototype checks on phone; demo values are not live food validation. | P1 content; R4/R3 human source and photo checks. |
| B6.1–4 history/FIFO/photo ownership/reconnect / R4, R5 consumers | I SQLite+IndexedDB/migrations, max200/dedupe/order, Web Locks, persisted outcomes/completed receipts, cleanup-only retry, late-write guards; mobile+browser. | E actual airplane mode/restart/cancel/cleanup/interrupted persistence. | P1 X-01/02 and draft restart boundary; R4/R5 record actual outcomes. |
| A4.1–4 about/method/terms/privacy / R4+operator | I routes/tests/disclaimer; draft discloses TokenHarbor, DeepSeek, UUID, diagnostics and public-photo/deletion limits. | E legal entity/contact/retention/processor/region/transfer approval and public HTTPS. | P1: legal/operator review; no invented approval or law conclusion. |
| B8.1–5 light/dark/200%/reader/share/haptics / R4+R5 | I theme/share/cancel/error states; H71 covers R5 light styles/recovery/wrapping; D40px Back and SVG warning. | E native200%, VoiceOver/TalkBack, contrast>=4.5, touch>=44, actual share sheets/haptics. | P1 physical acceptance; reuse H71, keep hold. |
| B2.1–4 capture/gallery/barcode/manual/compress/queue / R5 | I mobile native+web fallback, UPC, no-barcode→identify, <=1600px/1.5MB, two-label budget/actual UTF8 request limit, denied states; D R5-01. | E real12MP images, gallery/settings/camera/Safari fallback,4G timing. | P1 X-01; R5 ownership fix/device run. |
| B3.1–3 confirm>=0.6/list/reject/prefill / R5 | I mobile routes/validation/candidates/negative/queued acknowledgement guards. | E right/wrong real candidates; front grading. | P1 R3 grading; preserve merged navigation work. |
| B7.1–4 two shots/same photo/review/category/comma/null/save / R5+R2 | I mobile481 review/unclear/required fields/allergen edits/draft identity/persistence errors; bundled18 categories, F server receipts. | E real unknown→Neverificat→second actual device→moderator. | P1 connected acceptance and R5 late-label/restart issue. |
| A6.1–4 field collection / R5 lead+all, R2 verification | I worksheet/ownership prep; M actual300 products, selection/provenance/photos. | E five real collectors x60, source/consent and daily verification. | P1: use H72 prep, no filled fictitious rows. |
| A7.1–3 beta25/tester feedback/zeroP1 / R5+R1 | I scenario/triage/private registry templates, H72 prep. | E25 actual testers/builds/sessions/feedback/zeroP1. | P1: owner recruitment/build access; no invented testers. |
| A5.1–6 listing/privacy/icon/screenshots/review notes / R4+R1 | I unpublished listing/approved art; M final privacy answers/review-notes/real screenshot sets. | E seller/support/HTTPS policy/actual6.7-inch+Android captures. | P1: finalize against accepted binary/provider facts, no health claims. |
| D8.1–6 builds/store records/submission/OTA/rollback/watch / R1+team | I profiles/fingerprint; M release.md and tested rollback/runbook. No submission/deploy done. | E production project/signing/builds/accounts/manual release approval/48h rota. | P1: App complete first; Stanislav merge; owner executes cloud actions. |
| A8.1–3 video/posts/publication / R5 | H72 unpublished storyboard/post drafts; M real recording/final confirmed links. | E publication intentionally unexecuted. | P1 launch gate: reuse H72 after acceptance, no messages sent here. |

## Provider/security conclusions

Source default is TokenHarbor `deepseek-v4.1-flash:free`, optional server `AI_MODEL`;
the actual hosted override is **unknown**. [Official API](https://tokenharbor.ai/docs/api/curl)
and [model page](https://tokenharbor.ai/models/deepseek-v4.1-flash:free) match current
request shape/advertised image support; that is not live accuracy evidence.
[Rate policy](https://tokenharbor.ai/docs/api/rate-limits) distinguishes account
RPM/hour caps and USD key limits. Device UUID quotas are resettable and do not
establish a global abuse/spend control. Keep account-free shopping and no tracking.
[Current free-route privacy terms](https://tokenharbor.ai/privacy) describe retention,
staff/third-party analysis and potential upstream training; operator/legal review
must cover actual routing, regions and deletion. Preserve the approved provider.

Local tests confirm service-only atomic quota/diagnostic RPCs, RLS/grants, hidden
lookup/search filters, current moderator authorization/revocation, device-prefix
upload checks, JPEG byte/pixel bounds, metadata stripping and sanitized errors.
This does not prove hosted ACL/configuration, adversarial global abuse resistance,
or photo/synonym/score correctness. Public product photos can remain reachable by
known URL after a product is hidden; hiding is not photo deletion or cache erasure.
Retention/deletion/processor decisions remain operator/legal gates.

## Owner-executable checklist — not performed against hosted services

Record for every row: actual deployed SHA/build/update ID, device+OS/browser,
expected transcription, result/time, human role/name and restricted evidence path.
Never put keys, staff identities, real photographs or raw dumps in public artifacts.

1. **Owners/Stanislav:** obtain Claude cross-review + actual human approval of final F/P diffs; preserve H71→H72 hold. R3/R4/R5/R1 review the concrete owner packages. The user is arranging approvals; this is not approval received. Independent Codex review is additional, not Claude.
2. **R2/operator:** from F reviewed checkout, `supabase link --project-ref vspdhdqaneofutsvavlc`; `supabase migration list --linked`; `supabase db push --dry-run`. Confirm only reviewed migration20261109000000 is pending, then owner runs `supabase db push` and `supabase functions deploy add-product --project-ref vspdhdqaneofutsvavlc`. Migration first; do not seed production or delete receipts on rollback.
3. **R2/operator:** from P run `supabase/STAGING-PROBES.md` command with existing public-only `.env.local`. It pins the exact project, refuses privileged keys/redirects, checks six safe gateway/schema cases; normal lookup can log telemetry. Set `OKBITE_STAGING_KNOWN_CODE` to a real accepted code to require `found`. Never run loopback integration fixtures on hosted staging.
4. **R5/R3:** real known barcode/live/manual/front (including blurred barcode and Safari no-detector), correct/wrong candidate confirmation and rejection, gallery/settings/permission-denied recovery; record first-screen accuracy and <3s4G timing separately.
5. **R5/R2/R3:** unknown→two label photos and same-photo variant→editable review; test0,3, blank=null, unclear fields and missing category; save Neverificat, record UUID and find the same UUID by photo from a second actual device. Complete30-front and30-pair grading against human expected transcriptions, recording errors/nulls rather than deleting failures.
6. **R2 actual moderator:** verify/edit against photos, hide, close report, sign out and revoke membership; attempt direct write and native/web callback after revocation. Confirm fresh lookup/search and service-worker behavior, not only disappearance of admin navigation. Inspect original label/ingredients/source/compare/share on both phones.
7. **R2/R4/R5:** discard a post-commit save HTTP response; retry both barcode and no-code original upload, including at full quota/concurrently/after hide; require same UUID, one committed added event and no loser photos. Restart before local receipt/history save, prove how draft/upload identity survives; new uploads are not covered by F. Repeat report lost-response semantics honestly.
8. **R4/R5:** airplane mode with code/photo/history, restart/reconnect/FIFO, retained candidate/review, cancel during upload, failed receipt/cleanup storage, two browser tabs, a new draft while old work returns, blur/unmount/back during capture/scan/label. Ensure no late navigation or repeated completed provider work.
9. **R1/R4/R5:** native iPhone+Android and Safari+Chrome light/dark,200% fonts, VoiceOver/TalkBack,>=44 targets,>=4.5 contrast; real photo E2E and phone-browser deep links/PWA install/offline. Record Lighthouse mobile>=95 and actual timing; fixture profiles/exports do not satisfy physical checks.
10. **R3/team:** complete remaining human score fixtures and150+ cited ingredient checks; use C5 reviewed loader/import with first/second counts, OFF attribution and actual50/300-product checkpoints. Keep checked ingredients empty until approved; do not promote172 drafts automatically.
11. **Operator/R4:** approve actual legal entity/contact, hosted HTTPS privacy/support, provider/model/regions/transfers/retention/deletion, diagnostics/UUID/public-contribution disclosures, actual seller/store answers/screenshots. Record real named moderation/backup primary+backup8Dec–8Jan; no placeholder counts as acceptance.
12. **R1/operator:** confirm distinct production ref/public env, EAS project/signing/IDs/native compatibility and real installed builds; prepare release.md with channel/build/update IDs and tested rollback. Use [Expo runtime guidance](https://docs.expo.dev/eas-update/runtime-versions/) and [rollback guidance](https://docs.expo.dev/eas-update/rollbacks/); run internal preview acceptance before any production action. No public deploy/submission/purchase is authorized by this audit.

Hosted backup/export preparation, **operator only**, in the staging-linked reviewed
checkout (CLI2.65.5 flags verified via `--help`):

```sh
umask 077
backup=$(mktemp -d "${TMPDIR:-/tmp}/okbite-staging-export.XXXXXX")
supabase db dump --linked --role-only --file "$backup/roles.sql"
supabase db dump --linked --schema public,auth,storage,extensions --file "$backup/schema.sql"
supabase db dump --linked --schema public,auth,storage,extensions --data-only --use-copy --file "$backup/data.sql"
supabase storage ls --linked --experimental --recursive ss:///uploads > "$backup/uploads-manifest.txt"
supabase storage ls --linked --experimental --recursive ss:///products > "$backup/products-manifest.txt"
supabase storage cp --linked --experimental --recursive ss:///uploads "$backup/uploads"
supabase storage cp --linked --experimental --recursive ss:///products "$backup/products"
```

This is an export recipe, **not a verified hosted backup/recovery service**. Owner
must capture source owners/effective ACLs/default grants and extension versions too:
CLI logical dump alone is not proof those were preserved. Inspect `--dry-run`,
encrypt/restrict approved storage, checksum every binary and record timestamp/counts.
[Supabase confirms DB backups omit Storage file bytes](https://supabase.com/docs/guides/platform/backups).
Restore only into a fresh isolated matching Supabase/Postgres bootstrap, never the
source/staging DB or an existing local stack; disable external jobs/webhooks first.
Compare all table/receipt/Auth/bucket counts, owners/grants/extensions and photo
SHA-256, run SQL/Edge authorization tests and perform real login/photo lookup.
Record platform schemas/config/secrets/Auth redirects/custom-role-password limits,
RPO/RTO and operator access. Current local recovery guards intentionally refuse
hosted URLs; do not relax them or restore the exports blindly into a running project.

## Review package and gate

F and P are independent children of M; neither depends on H71/H72. F deployment
requires its migration before its handler. H72 remains dependent on H71. Stanislav
chooses all merges after required reviews; no history was rewritten. Claude CLI
and real human/device approval are unavailable in this session. Concrete diff,
tests, failure/green logs, instructions and owner proposals are prepared instead.

Rulings: audit existing implemented work rather than replay old plans (cost if
wrong: a missed inherited gap, tracked in inventory); leave other-role production
patches unapplied until actual owner authorization (cost: known release blockers
remain open). No minor finding was silently waived. **NO-GO remains until defects,
content/AI accuracy, connected/physical acceptance and legal/operational gates close.**
