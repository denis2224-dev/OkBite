# R4 → R5 durable queue interface

Base: #29, then R4 B6c. Import only `src/features/offline/queue` from capture consumers.

- `enqueue({kind:'photo',uri}|{kind:'code',code}): Promise<void>` is unchanged. Photo enqueue copies to app-owned native storage or an IndexedDB Blob before resolving. R5 may then dispose the temporary capture URI.
- `flushQueue(onResolved?): Promise<{resolved:number}>` preserves FIFO and coalesces concurrent drains. Found responses save validated history before removing queue/photo ownership. All attached success callbacks are notified; callback errors cannot interrupt queue work.
- `listQueue(): Promise<QueueEntry[]>` lists stable IDs in FIFO order. `outcome` contains the validated candidates/not_found response, including remote photoPath/read fields. These outcomes survive restarts and are not automatically resubmitted.
- `openQueuedPhoto(id): Promise<{uri:string;release():void}>` exposes the retained capture. Native returns its durable URI. Web creates a temporary Blob URL; call release on view disposal. release does not delete queue ownership.
- `completeQueued(id): Promise<void>` acknowledges successful consumer completion or explicit user cancellation. Call only after confirmation/contribution succeeds or the shopper explicitly cancels. It removes the durable photo and row. Failed contribution must retain both.
- `retryQueued(id)` explicitly clears retained outcome/error and retries pending work in FIFO order. Offline transport failures also retry on the next reconnect flush; quota/configuration/storage failures require explicit action.
- `subscribeQueue(listener)` reports changed or missing_photo events; unsubscribe when disposing a view. Consumers should reload listQueue after changed. A permanently missing capture is dropped and reported, never retried forever.

R5 wiring request: render persisted candidate/not_found outcomes using the existing identification/add flows, pass the queue ID through those screens, and acknowledge only after successful confirmation/contribution. Do not interpret outcome rows as resolved or delete the capture on a failed save. R4 does not change R5-owned capture/identify/add files.

R1 integration: keep #25 → #26 → #27 → #28 → #29 ancestry, then this contract. R1 owns main reconciliation/lockfile policy. No shared API contract, database migration or generated Edge code changed.

Real browser/photo/provider/device acceptance remains separate from local SQLite/IndexedDB regression tests. These tests do not certify staging.
