# Production analysis outcome client (P-R4-2 / X-01)

This ports the already-tested preparation from production-readiness-followup
46a55fa into apps/mobile, the production application. It does not replace
the existing identify/readLabel methods or edit R5 capture screens.

New opt-in methods api.identifyOutcome(photo) and api.readLabelOutcome(request)
return a local client type (no shared contract change):

- completed: validated result, with its deadline timer cleared.
- pending at 55 seconds: retryAllowed:false and the original completion promise.

The pending request is not aborted, resent or automatically retried. A caller
must keep its original completion, handle both late success and rejection,
and guard navigation/state by current draft and focus. Use ro.pwa.analysis
copy; never promise an idempotent retry. An unknown result can remain pending
indefinitely. This does not provide durable operations across process restart.

Legacy identify/readLabel calls retain their existing 55-second timeout.
R5 owns switching capture/add screens to these outcome methods. The canonical
operation key remains an R2/R3 dependency and is intentionally not invented.

The source port reuses the existing eight fake-timer regression cases; they
failed against main before implementation. They cover the exact 55-second
deadline, no abort/retry, late success, late service/schema errors, early
network failure, request validation and timer cleanup.

Client preparation is reviewable independently. End-to-end X-01 acceptance
remains open until R5 integrates the caller and real timeout/restart/focus
cases pass with an agreed backend operation key.
