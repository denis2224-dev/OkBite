# Production photo analysis timeouts

The mobile client uses one request per user attempt for photo identification and
label reading. The provider has a 40-second budget. The client allows more time
for the gateway, storage, lookup and response.

- A validated response within 55 seconds completes the request.
- At 55 seconds, the client shows the pending state and keeps waiting for the
  same response. Retry stays disabled.
- At 75 seconds, the client stops waiting, aborts its local transport, and
  surfaces an unconfirmed outcome. A response that arrives after this point
  cannot advance the screen or overwrite the draft.

A local timeout does not confirm that server processing stopped. Capture keeps
the selected photo, and guided Add keeps the saved draft. Retry is an explicit
action that can start another analysis. A pending Capture request that loses its
network connection stays available for explicit retry.

Legacy raw photo methods keep the 55-second maximum. A timed-out queued photo
retains its local payload and is retried only on request. The timeout is a
client-side error and adds no fields to the shared API contract.

Fake-timer tests exercise the soft and hard deadlines with stalled transport,
device ID and response body. Capture and Add tests exercise pending, recovery,
navigation and draft restoration. Verify those journeys on the staging build
and physical devices as part of release acceptance.
