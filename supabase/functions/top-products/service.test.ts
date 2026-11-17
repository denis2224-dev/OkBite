import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../_lib/http.ts';
import { loadShelfCandidates } from './service.ts';

const category = { slug: 'iaurt', name: 'Iaurturi', scoreKind: 'general' };
type Row = ReturnType<typeof productRow>;
type Link = { product_id: string; position: number; raw_name: string; ingredient: null };

function productRow(number: number, name: string) {
  return {
    id: `c2000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    code: null,
    status: 'verified',
    name,
    brand: 'Livada Verde',
    quantity: '400 g',
    unit: 'g',
    portion_amount: 150,
    portion_label: '1 pahar · 150 g',
    kcal: 63 as number | null,
    fat: 2.5,
    sat: 1.6,
    sugar: 4.1,
    salt: 0.1,
    protein: 3.6,
    fiber: 0,
    fruit_veg_pct: null,
    ingredients_text: '',
    allergens: ['Lapte'],
    may_contain: [],
    image_path: null,
    ingredients_photo_path: null,
    nutrition_photo_path: null,
    source: 'DEMO — docs/prototype/Main.dc.html',
    added_at: '2026-10-12T00:00:00Z',
    verified_at: '2026-10-28T00:00:00Z',
    category,
  };
}

function fakeDb(rows: Row[], links: Link[] = []) {
  const queries = new Map<string, number>();
  const db = createClient('http://local.invalid', 'anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input) => {
        const url = new URL(input instanceof Request ? input.url : input);
        const params = url.searchParams;
        const table = url.pathname.split('/').at(-1)!;
        queries.set(table, (queries.get(table) ?? 0) + 1);
        const page = (data: unknown[]) => {
          const offset = Number(params.get('offset') ?? 0);
          return Promise.resolve(
            Response.json(data.slice(offset, offset + Number(params.get('limit') ?? 1000))),
          );
        };
        if (table === 'categories') {
          const slug = params.get('slug')?.slice(3);
          if (slug === 'necunoscut') return page([{ ...category, slug }]);
          return page(slug === 'iaurt' ? [category] : []);
        }
        if (table === 'products') {
          assert.equal(params.get('category_slug'), 'eq.iaurt');
          assert.equal(params.get('status'), 'eq.verified');
          assert.equal(params.get('order'), 'id.asc');
          const cursor = params.get('id')?.slice(3) ?? '';
          return page(rows.filter((row) => row.status === 'verified' && row.id > cursor));
        }
        if (table === 'product_ingredients') {
          const ids = params.get('product_id')?.slice(4, -1).split(',') ?? [];
          assert.equal(params.get('order'), 'product_id.asc,position.asc');
          return page(links.filter((link) => ids.includes(link.product_id)));
        }
        assert.equal(table, 'ingredients');
        return page([{
          slug: 'lapte-normalizat',
          name: 'Lapte normalizat',
          aliases: [],
          group: 'base',
          role: 'Ingredient de bază',
          explanation: 'Lapte de vacă cu grăsimea ajustată la valoarea de pe etichetă.',
          source: 'DEMO — docs/prototype/Main.dc.html',
          allergen: 'Lapte',
        }]);
      },
    },
  });
  return { db, queries };
}

Deno.test('loads verified, scorable products and ranks by nutrition score, then Romanian name', async () => {
  const rows = [
    productRow(1, 'Zăhăr'),
    { ...productRow(2, 'Primul'), sat: 0, sugar: 0 },
    { ...productRow(3, 'Apă'), source: 'Open Food Facts — test' },
    { ...productRow(4, 'Ascuns'), status: 'hidden' },
    { ...productRow(5, 'Neverificat'), status: 'unverified' },
    { ...productRow(6, 'Fără scor'), kcal: null },
    { ...productRow(7, 'Alt raft'), category: { ...category, slug: 'biscuiti' } },
  ];
  const { db } = fakeDb(rows);
  const results = await loadShelfCandidates('iaurt', 20, db);
  assert.deepEqual(results.map(({ product }) => product.name), ['Primul', 'Apă', 'Zăhăr']);
  assert.ok(
    results.every(({ product, score }) => product.status === 'verified' && score.score !== null),
  );
});

Deno.test('keeps the requested limit and considers the best item from later pages', async () => {
  const rows = Array.from({ length: 505 }, (_, index) => productRow(index + 1, 'Iaurt natural'));
  rows[504] = { ...rows[504], name: 'Primul', sat: 0, sugar: 0 };
  const { db } = fakeDb(rows);
  const results = await loadShelfCandidates('iaurt', 20, db);
  assert.equal(results.length, 20);
  assert.equal(results[0].product.id, rows[504].id);
});

Deno.test('rejects unknown categories and returns empty arrays for an empty shelf', async () => {
  const { db, queries } = fakeDb([]);
  await assert.rejects(
    () => loadShelfCandidates('missing', 20, db),
    (error: unknown) =>
      error instanceof HttpError && error.status === 400 && error.error === 'bad_request',
  );
  assert.deepEqual(await loadShelfCandidates('necunoscut', 20, db), []);
  assert.equal(queries.get('products'), undefined);
  assert.deepEqual(await loadShelfCandidates('iaurt', 20, db), []);
  assert.equal(queries.get('product_ingredients'), undefined);
});

Deno.test('loads ingredients in one batch and shares the knowledge-base fallback', async () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    ...productRow(index + 1, 'Iaurt natural'),
    ingredients_text: 'lapte normalizat',
  }));
  const product_id = rows[0].id;
  const { db, queries } = fakeDb(rows, [
    { product_id, position: 1, raw_name: 'Lapte', ingredient: null },
    { product_id, position: 2, raw_name: 'Culturi lactice vii', ingredient: null },
  ]);
  const results = await loadShelfCandidates('iaurt', 5, db);
  assert.equal(queries.get('product_ingredients'), 1);
  assert.equal(queries.get('ingredients'), 1);
  assert.deepEqual(
    results.find(({ product }) => product.id === product_id)?.product.ingredients.map((i) =>
      i.name
    ),
    ['Lapte', 'Culturi lactice vii'],
  );
  assert.equal(
    results.find(({ product }) => product.id === rows[1].id)?.product.ingredients[0]?.slug,
    'lapte-normalizat',
  );
});

Deno.test('keeps ingredient links beyond the first REST page', async () => {
  const row = productRow(1, 'Iaurt natural');
  const links = Array.from({ length: 1001 }, (_, position) => ({
    product_id: row.id,
    position,
    raw_name: `Ingredient ${position}`,
    ingredient: null,
  }));
  const { db } = fakeDb([row], links);
  const results = await loadShelfCandidates('iaurt', 1, db);
  assert.equal(results[0].product.ingredients.at(-1)?.name, 'Ingredient 1000');
});
