# D4/D5 verification — 9 November 2026

Base `9704b38`, branch `D4-D5-ai-followup`. Local implementation evidence only;
no hosted changes, external inference, user photos, or measured photo accuracy.

## Provider assumptions

`_lib/claude.ts` retains its historical names. It calls TokenHarbor's
OpenAI-compatible `https://tokenharbor.ai/v1/chat/completions`, using `AI_API_KEY`
and `AI_MODEL` or the unchanged default `deepseek-v4.1-flash:free`, with 4000
output tokens. [Current API docs](https://tokenharbor.ai/docs/api/curl) describe
Bearer authentication, OpenAI chat messages, and system-message pass-through.
[Quickstart](https://tokenharbor.ai/docs/getting-started/quickstart) describes
`:free` IDs as uncharged. These are provider claims, not proof of the configured
hosted model, image support, availability, privacy, cost cap, or OCR quality.
Do not replace the provider/model from the old Anthropic plan without approval.

The extraction rules now occupy a system message; photo text is untrusted data.
This mitigates instruction-like labels but cannot prove that a model follows the
rules. Parser tests preserve such text literally and never execute it.

## Reproduced defects and changes

Tests failed before each fix, then passed:

- Retries could start after an overslept deadline; late successful answers were
  accepted. Recheck the deadline before a new attempt and after reading success.
- Provider output was unbounded. Stream at most 65,536 bytes before JSON parsing;
  malformed, filtered, truncated, oversized or empty answers fail without bodies.
- A missing key consumed quota despite no provider attempt. `PreProviderError`
  proves no request was sent, so both services release that admission.
- Provider/parsing failures orphaned saved photos. Remove known paths on failure;
  retain quota for every attempted or uncertain provider outcome, including
  timeout, network failure and malformed answers. Successful paths remain private
  for the contribution flow. Cleanup failure is surfaced as a generic 502.
- Long ingredient lists were silently truncated. Over 3000 characters now gives
  null plus `ingredientsText` in `unclear`, avoiding a trusted partial list.

## Actual limits and remaining shared dependencies

The helper budgets 40 seconds for provider attempts, at most three, each at most
20 seconds including native-fetch response-body reading. Retryable statuses are
408/429/500/502/503/504/529; network failures also retry. Backoff is exponential
or numeric Retry-After capped at 5 seconds; no retry with less than 10 seconds
remaining after the wait. Retrying uncertain calls may cause multiple provider
executions; quota admission is once per endpoint request, not once per retry.
Malformed successful responses are not retried. A stalled-body mock verifies
that the same abort signal remains attached while reading the response.

**40 seconds is not an end-to-end handler deadline.** Body reading, quota,
storage, lookup/search, cleanup and telemetry add time and have no common total
budget here. The client AI timeout is 55 seconds. Shared helpers belong to point
6: coordinate bounded I/O/total-budget propagation there before promising that
all failures return before the client timeout. No shared helper was edited.

Current shared POST ingress is **2,000,000 UTF-8 bytes total**, for either
endpoint, including JSON and both label photos. Each stored/re-encoded JPEG may
be at most 1.5 MB; provider guards allow 2,000,000 base64 characters per image,
3,800,000 combined, at most two images. The larger provider guard does not raise
the ingress cap. Coordinate any two-large-photo request change with point 6 and
the capture track. Unit is nullable but the contract's `unclear` enum excludes
`unit`; preserve the contract and coordinate expansion with its owner if wanted.

Admission uses the existing atomic `reserve_usage` RPC (40 photo / 20 label per
rolling 24 hours). Concurrent final-slot tests prove one call is admitted.
Known pre-provider failures release quota even if removal fails. An upload that
commits but loses its response may have no returned path to remove; resolving
that uncertainty needs point 6's shared storage work. Lost successful HTTP
responses also retain uploads/quota; these endpoints have no replay receipt.
A retention/reconciliation policy and hosted error-path checks remain needed.

## Local evidence and reproduction

Deno 2.9.8, Supabase CLI 3.0.0, PG17, Node 24.19.0, locked pnpm 11.25.0.
Copied `supabase/` without `.temp`/`.env*` to disposable project
`/tmp/okbite-d4-d5-ai-20261109`, project ID `okbite-d4-d5-ai-20261109`,
API62431 / DB62432 / shadow62430 / studio62433 / mail62434. Existing projects
and checked-in defaults stayed unchanged. Settings were kept in a mode-0600
local-only environment file; provider responses were mocked. Fixtures clean up
their own uploads and usage events. Never run mutation tests against hosted URLs.

```sh
pnpm sync-shared
git diff --exit-code -- supabase/functions/_shared
deno check --config supabase/functions/deno.json supabase/functions/_shared/index.ts supabase/functions/_lib/*.ts supabase/functions/identify/*.ts supabase/functions/read-label/*.ts
deno test --config supabase/functions/deno.json -A --ignore='supabase/functions/_shared,supabase/functions/**/*.integration.test.ts' supabase/functions/
deno test --config supabase/functions/deno.json -A --env-file=<local-only-env> supabase/functions/identify/ supabase/functions/read-label/
supabase --workdir <disposable-project> test db
pnpm check
```

Results: 60 function unit tests passed; all 28 identify/read-label tests passed
with local integration enabled (no skips); 132 database assertions passed. Deno
checks and generated shared-code parity passed. `pnpm check` passed: lint had
57 existing warnings and zero errors; type checks, repository tests and data
validation succeeded. No physical-device or hosted inference run is implied.

Coverage includes fenced/malformed JSON, wrong numeric types, decimal commas,
unreadable/missing/impossible values null with `unclear`, UPC-A/EAN-8/checksum
validation, absent-valid-code trigram fallback, up to three candidates at the
0.35 threshold, unknown reads preserving valid codes, one/two-photo paths,
pre-provider rollback, failed cleanup, uncertain quota retention and atomic
admission. Supabase's [current hosted limits](https://supabase.com/docs/guides/functions/limits)
and changelog were checked; local tests do not establish hosted CPU/memory or
latency acceptance. PG minor extension upgrade notices concern infrastructure;
this track makes no schema or extension changes.

## Real-photo grading checklist (not run)

No supplied corpus or recorded ground truth exists in this task: **0/30 fronts,
0/30 label pairs graded; accuracy is unmeasured.** Before any live run, obtain
explicit inference authorization and verify the chosen model's image support,
spend controls and photo handling. Use private, consented, EXIF-stripped inputs;
keep photos, keys and raw provider bodies outside Git and logs.

1. Freeze commit, endpoint/project, exact effective model, prompt version, run
   date, device/browser and database snapshot. Hash each input; retain privately.
2. Register F01–F30: 30 known products, 20 with barcode hidden, 10 readable
   barcodes. Before running, independently record product ID/code, visible
   brand/name/quantity and barcode visibility. Include blur, glare, angles,
   accents and instruction-like printed text. Do not tune on the scored set.
3. Register L01–L30: 30 actual label pairs with independently transcribed
   ingredients, unit and eight nutrient fields per 100 g/ml. Mark truly missing,
   unreadable or ambiguous fields as expected null; separately test combined
   one-photo labels. A readable but hard field is not expected null.
4. Run once per item; record response status, duration, found ID/candidate IDs,
   normalized field values and unclear keys. Keep errors in the denominator;
   report retries/cost separately. Human reviewers resolve disagreements without
   seeing model output first. Repeated/tuned runs need a new held-out set.
5. Front result row: `id,sha256,barcode_visible,truth_product_id,status,found_id,
   candidate_ids,top1_correct,first_screen_correct,latency_ms,reviewer,notes`.
   First-screen correct means the right found product or inclusion in the first
   candidate list. Report found accuracy, top-1 and first-screen separately;
   target first-screen >=24/30 (80%). Unknown/absent products are a separate set.
6. Label row, one per field: `pair_id,ingredients_sha256,nutrition_sha256,field,
   truth,value,expected_null,in_unclear,grade,latency_ms,reviewer,notes`.
   Grades: correct numeric/text/unit, correctly null, wrong, incorrectly null,
   or error. Normalize decimal separators and whitespace only; no hidden numeric
   tolerance. A correctly null nutrient/ingredients field must also be unclear.
   Report each field's correct/correctly-null/wrong/incorrect-null/error counts
   over 30, plus all 300 fields (10 x 30); target >=90% correct or correctly null.
7. Record accepted/rejected items, disagreements and sign-off in the review.
   Do not replace real-photo denominators with synthetic parser fixtures.

Claude cross-review, human approval, hosted/model-image acceptance, real-photo
scores and phone/browser end-to-end acceptance remain separate release gates.
