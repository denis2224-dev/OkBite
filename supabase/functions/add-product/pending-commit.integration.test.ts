import { strict as assert } from 'node:assert';
import { integrationTest } from '../_lib/integration.ts';
import { fixture, found } from './retry-fixture.ts';

// This opt-in fault fixture requires the disposable DB trigger documented in C6.
if (Deno.env.get('C6_PENDING_COMMIT_FIXTURE') === '1') {
  integrationTest(
    'a still-committing product keeps its photos after RPC transport failure',
    async () => {
      const f = await fixture();
      const original = globalThis.fetch;
      let pending: Promise<Response> | undefined;
      try {
        f.input.name = 'C6 slow commit fixture';
        globalThis.fetch = async (...args) => {
          if (String(args[0]).endsWith('/rpc/commit_product')) {
            pending = original(...args);
            let waiting = false;
            for (let i = 0; i < 100 && !waiting; i++) {
              const state = await f.db.rpc('c6_test_commit_waiting');
              assert.equal(state.error, null);
              waiting = state.data === true;
              if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
            }
            assert.ok(waiting, 'fault must occur inside the active DB transaction');
            throw new Error('Connection lost while transaction is still running');
          }
          return original(...args);
        };
        const response = await f.submit();
        const committed = await pending!;
        assert.equal(committed.ok, true, await committed.clone().text());
        await committed.body?.cancel();
        const retried = await found(await f.submit());
        const product = retried;
        const photo = await original(product.labelImageUrl!);
        assert.equal(photo.status, 200, 'a committed product must keep its published photo');
        await photo.body?.cancel();
        assert.equal((await found(response)).id, product.id);
      } finally {
        globalThis.fetch = original;
        if (pending) await (await pending).body?.cancel().catch(() => {});
        await f.cleanup();
      }
    },
  );
}
