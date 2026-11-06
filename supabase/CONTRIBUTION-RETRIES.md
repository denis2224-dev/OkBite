# Retrying a contribution after an HTTP response is lost

One device's ingredients upload identifies one submission, including products
without a barcode. Retrying that upload returns the committed product; changing
the review fields during recovery does not overwrite it or create another row.
A genuinely new contribution uses a new label upload. Different captures are not
deduplicated by inferred name, image contents or nutritional values.

`contribution_receipts` is private: shoppers and authenticated staff cannot read
or write it. The service looks up `(device_id, upload_path)` before reserving
quota, so a successful submission can be recovered even at the daily limit.
The database records the receipt atomically with the product and serializes
concurrent attempts for that same upload. Losing attempts remove their own
published copies and unused quota reservation. Hidden products remain unavailable.
Deleting a product also deletes its receipt.

The client request/response contract is unchanged. The migration keeps the
existing service-only RPC signature and accepts legacy servers without the
additional internal upload key. Historical submissions made before receipts
exist cannot be recovered by upload identity; do not claim retroactive deduping.
This also does not deduplicate repeated `identify`, `read-label` or report calls.

## Operator deployment order — not performed by the audit

After Claude review, human approval and Stanislav's merge, from the reviewed
checkout, against the existing authorized staging project:

```sh
supabase link --project-ref vspdhdqaneofutsvavlc
supabase migration list --linked
supabase db push --dry-run
# Confirm only the reviewed 20261109000000 migration is pending.
supabase db push
supabase functions deploy add-product --project-ref vspdhdqaneofutsvavlc
```

Apply the migration before deploying the new handler. Keep the receipt table
when rolling back to the previous handler; do not reverse migrations on live data.
Repeat a no-barcode save after discarding its HTTP response, a concurrent retry,
recovery at full quota, and retry after hiding the product. Require one product,
one committed `added` event, valid original photos and no losing public copies.
Use an operator-authorized test product/photos and record the actual deployed SHA.
Never run local destructive integration fixtures against staging.

Local regressions: `supabase/functions/add-product/retry.integration.test.ts`;
receipt grants/RLS: `supabase/tests/receipts.test.sql`. Independent score cases
each upload their own label rather than retrying the same submission.

The local recovery snapshot also compares receipt rows. Include a known,
disposable receipt in the isolated source before its drill, then verify the
recorded count with `node supabase/ops/check-recovery-receipts.mjs
<outside-git-drill-directory>/report.json <known-positive-count>`. Remove only
that fixture afterward. This checks restored DB data, not hosted photo bytes.
