import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { createClient } from '@supabase/supabase-js';
import { integrationTest } from '../_lib/integration.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { loadProduct } from '../_lib/db.ts';
import { fixture, found } from '../add-product/retry-fixture.ts';
import { authorize, handler } from './index.ts';

integrationTest(
  'real Storage URLs fail after hide, all originals are tracked, partial failures retry, and revoked JWTs lose moderation',
  async () => {
    const f = await fixture();
    const originalFetch = globalThis.fetch;
    const extras: string[] = [];
    let staffId: string | undefined;
    let sharedId: string | undefined;
    let productId: string | undefined;
    try {
      const encoded = jpeg.encode({ width: 1, height: 1, data: new Uint8Array(4) }, 80).data;
      const bytes = btoa(String.fromCharCode(...encoded));
      f.input.photoPath = await saveJpeg(bytes, f.device, 'front');
      f.input.nutritionPhotoPath = await saveJpeg(bytes, f.device, 'nutrition');
      extras.push(f.input.photoPath, f.input.nutritionPhotoPath);
      const product = await found(await f.submit());
      productId = product.id;
      const sources = await f.db.from('contribution_photo_sources').select('upload_path').eq(
        'product_id',
        product.id,
      );
      assert.equal(sources.error, null);
      assert.equal(sources.data?.length, 3, 'all three private originals must be durable');
      const urls = ['front', 'ingredients', 'nutrition'].map((suffix) =>
        f.db.storage.from('products').getPublicUrl(`${product.id}/${suffix}.jpg`).data.publicUrl
      );
      for (const url of urls) {
        const response = await fetch(url);
        assert.equal(response.status, 200);
        await response.body?.cancel();
      }
      const password = crypto.randomUUID();
      const email = `moderation-${crypto.randomUUID()}@example.invalid`;
      const created = await f.db.auth.admin.createUser({ email, password, email_confirm: true });
      assert.equal(created.error, null);
      staffId = created.data.user!.id;
      const client = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        },
      );
      const signed = await client.auth.signInWithPassword({ email, password });
      assert.equal(signed.error, null);
      const token = signed.data.session!.access_token;
      const request = () =>
        new Request('http://local/moderate', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'hide',
            productId: product.id,
            reason: 'Local deletion test',
          }),
        });
      for (const token of ['', 'forged', Deno.env.get('SUPABASE_ANON_KEY')!]) {
        assert.equal(
          await authorize(
            new Request('http://local/moderate', { headers: { authorization: `Bearer ${token}` } }),
          ),
          null,
        );
      }
      assert.equal(await authorize(request()), null, 'valid ordinary user is not a moderator');
      assert.equal((await handler(request())).status, 401);
      assert.equal((await f.db.from('moderators').insert({ user_id: staffId })).error, null);
      assert.equal(await authorize(request()), staffId);
      assert.equal(
        (await client.from('products').update({ name: 'tampered' }).eq('id', product.id)).error
          ?.code,
        '42501',
      );
      assert.equal(
        (await client.rpc('moderate_product', {
          p_actor: staffId,
          p_action: 'hide',
          p_id: product.id,
          p_reason: 'forged',
        })).error?.code,
        '42501',
      );
      sharedId = crypto.randomUUID();
      assert.equal(
        (await f.db.from('products').insert({
          id: sharedId,
          name: 'Shared fixture',
          brand: 'Test',
          quantity: '',
          category_slug: 'iaurt',
          unit: 'g',
          ingredients_text: 'lapte',
          source: 'test',
          image_path: `${product.id}/front.jpg`,
        })).error,
        null,
      );
      let removed = false;
      globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
        if (String(args[0]).includes('/storage/v1/object/') && args[1]?.method === 'DELETE') {
          if (removed) {
            return new Response(JSON.stringify({ message: 'injected outage' }), { status: 503 });
          }
          removed = true;
        }
        return originalFetch(...args);
      };
      assert.equal((await handler(request())).status, 502, 'partial removal cannot report success');
      assert.equal(await loadProduct({ id: product.id }), null);
      const shared = await f.db.from('products').select('image_path').eq('id', sharedId).single();
      assert.equal(shared.data?.image_path, null, 'shared public reference withdrawn');
      const pending = await f.db.from('photo_removals').select('path').eq('product_id', product.id)
        .is('completed_at', null);
      assert.equal(pending.data?.length, 5, 'successful first removal acknowledged; five remain');
      globalThis.fetch = originalFetch;
      const retries = await Promise.all([handler(request()), handler(request())]);
      assert.deepEqual(
        retries.map((response) => response.status),
        [200, 200],
        'concurrent authorized retries drain durable work',
      );
      for (const url of urls) {
        const response = await fetch(url, { cache: 'no-store' });
        assert.equal(response.ok, false, 'the exact original public URL must fail at local origin');
        await response.body?.cancel();
      }
      for (const path of [f.input.ingredientsPhotoPath, ...extras]) {
        const response = await f.db.storage.from('uploads').download(path);
        assert.ok(response.error, 'private original removed too');
      }
      assert.equal((await f.db.from('moderators').delete().eq('user_id', staffId)).error, null);
      assert.equal(
        await authorize(request()),
        null,
        'same issued JWT fails current membership check',
      );
      assert.equal((await handler(request())).status, 401);
      assert.equal((await client.rpc('is_moderator')).data, false);
      assert.equal(
        (await client.from('reports').update({ status: 'closed' }).eq('product_id', product.id))
          .error?.code,
        '42501',
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (staffId) {
        await f.db.from('moderators').delete().eq('user_id', staffId);
        await f.db.auth.admin.deleteUser(staffId);
      }
      if (sharedId) await f.db.from('products').delete().eq('id', sharedId);
      if (extras.length) await f.db.storage.from('uploads').remove(extras);
      await f.cleanup();
      if (productId) await f.db.from('photo_removals').delete().eq('product_id', productId);
    }
  },
);
