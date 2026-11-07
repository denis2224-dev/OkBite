# Replay admission follow-up

Depends on `C6-idempotent-photo-submissions`. Apply migration
`20261110000000_replay_admission.sql` after `20261109000000`, then deploy the
combined reviewed handler using the fail-closed instructions in
`CONTRIBUTION-RETRIES.md`. No hosted action was performed in this work.

An existing visible barcode also records an atomic upload receipt, without
charging a new-product quota slot. This requires a real stored upload belonging
to the device; invented paths cannot create receipts. Removing/editing the code
on an HTTP retry therefore cannot turn that same upload into a new product.

At the final quota slot, a denied request rechecks its own receipt up to five
times, waiting at most 400 ms between reads. This cannot spend another slot or
start another publication. If the original is still unresolved, the response
remains429; retry the same upload after it settles. A persisted result recovers
even at full quota. No unlimited wait or promise about unknown in-flight outcomes
is made. Separate captures racing for one barcode still use barcode uniqueness.
