import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { integrationTest } from '../_lib/integration.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { fixture, found } from '../add-product/retry-fixture.ts';
import { moderate } from './index.ts';

integrationTest(
  'hide removes shared-source orphan copies after failed compensation and blocks late Storage publication',
  async () => {
    const f = await fixture();
    const originalFetch = globalThis.fetch;
    const extras: string[] = [];
    let actor: string | undefined;
    let productId: string | undefined;
    let release = () => {};
    let started = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const committing = new Promise<void>((resolve) => {
      started = resolve;
    });
    let loserRequest: Promise<Response> | undefined;
    try {
      const encoded = jpeg.encode({ width: 1, height: 1, data: new Uint8Array(4) }, 80).data;
      const bytes = btoa(String.fromCharCode(...encoded));
      const originalLabel = f.input.ingredientsPhotoPath;
      const front = await saveJpeg(bytes, f.device, 'front');
      const secondLabel = await saveJpeg(bytes, f.device, 'ingredients');
      extras.push(front, secondLabel);
      f.input.photoPath = front;
      f.input.ingredientsPhotoPath = secondLabel;
      let failCleanup = false;
      globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
        const url = String(args[0]);
        if (url.endsWith('/rpc/commit_product') && String(args[1]?.body).includes(secondLabel)) {
          started();
          await held;
        }
        if (
          failCleanup && url.endsWith('/storage/v1/object/products') && args[1]?.method === 'DELETE'
        ) {
          return new Response(JSON.stringify({ message: 'injected compensation outage' }), {
            status: 503,
          });
        }
        return originalFetch(...args);
      };
      loserRequest = f.submit(); // B publishes before either request owns the shared source.
      await committing;
      f.input.ingredientsPhotoPath = originalLabel;
      const winner = await found(await f.submit());
      productId = winner.id;
      failCleanup = true;
      release();
      assert.equal((await loserRequest).status, 502, 'B commit rejects and its compensation fails');
      globalThis.fetch = originalFetch;
      const loser = f.attemptedIds.find((id) => id !== winner.id)!;
      const orphanPath = `${loser}/front.jpg`;
      const orphanUrl = f.db.storage.from('products').getPublicUrl(orphanPath).data.publicUrl;
      let response = await fetch(orphanUrl);
      assert.equal(response.status, 200, 'failed compensation leaves a real public orphan');
      await response.body?.cancel();
      const user = await f.db.auth.admin.createUser({
        email: `journal-${crypto.randomUUID()}@example.invalid`,
        email_confirm: true,
      });
      assert.equal(user.error, null);
      actor = user.data.user!.id;
      assert.equal((await f.db.from('moderators').insert({ user_id: actor })).error, null);
      assert.equal(
        (await f.db.rpc('moderate_product', {
          p_actor: actor,
          p_action: 'hide',
          p_id: winner.id,
          p_reason: 'Local orphan withdrawal',
        })).error,
        null,
      );
      const changed = await f.db.storage.from('products').update(orphanPath, encoded, {
        contentType: 'image/jpeg',
      });
      assert.ok(changed.error, 'Storage UPDATE cannot modify an existing tombstoned object');
      await moderate(
        { action: 'hide', productId: winner.id, reason: 'Local orphan withdrawal' },
        actor,
      );
      response = await fetch(orphanUrl, { cache: 'no-store' });
      assert.equal(
        response.ok,
        false,
        'hide must follow the original to every attempted public destination',
      );
      await response.body?.cancel();
      const lateSource = await saveJpeg(bytes, f.device, 'front');
      extras.push(lateSource);
      const late = await f.db.storage.from('uploads').copy(lateSource, orphanPath, {
        destinationBucket: 'products',
      });
      assert.ok(late.error, 'a delayed copy cannot resurrect a completed tombstone');
      response = await fetch(orphanUrl, { cache: 'no-store' });
      assert.equal(response.ok, false);
      await response.body?.cancel();
    } finally {
      release();
      if (loserRequest) await loserRequest.catch(() => {});
      globalThis.fetch = originalFetch;
      for (const id of f.attemptedIds) {
        await f.db.storage.from('products').remove([
          `${id}/front.jpg`,
          `${id}/ingredients.jpg`,
          `${id}/nutrition.jpg`,
        ]);
      }
      await f.cleanup();
      if (extras.length) await f.db.storage.from('uploads').remove(extras);
      if (productId) await f.db.from('photo_removals').delete().eq('product_id', productId);
      if (f.attemptedIds.length) {
        await f.db.from('photo_publications').delete().in('attempt_product_id', f.attemptedIds);
      }
      if (actor) {
        await f.db.from('moderators').delete().eq('user_id', actor);
        await f.db.auth.admin.deleteUser(actor);
      }
    }
  },
);
