import { strict as assert } from 'node:assert';
import { EnrichProductRequest, LookupResponse, type Product, type WaterProfile } from '../_shared/contract.ts';
import { enrichProduct } from './service.ts';

const productId = '11111111-1111-4111-8111-111111111111';
const device = '22222222-2222-4222-8222-222222222222';
const emptyNutrients = {
  kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null,
};
const baseWater: WaterProfile = {
  tdsMgL: 375, dryResidueMgL: null, ph: null, carbonation: 'still', classification: 'drinking',
  caMgL: null, mgMgL: null, naMgL: null, kMgL: null, naPlusKMgL: null,
  hco3MgL: null, so4MgL: null, clMgL: null, fMgL: null, no3MgL: null, bMgL: null, h3bo3MgL: null, iUgL: null,
};
const sampleProduct: Product = {
  id: productId,
  code: null,
  status: 'unverified',
  name: 'Apă Test',
  brand: 'Brand',
  quantity: '1,5 L',
  category: { slug: 'apa', name: 'Apă', scoreKind: 'water' },
  unit: 'ml',
  portion: { amount: 100, label: '100 ml' },
  nutrients: emptyNutrients,
  water: baseWater,
  ingredientsText: '',
  ingredients: [],
  allergens: [],
  mayContain: [],
  imageUrl: null,
  labelImageUrl: null,
  source: 'Fotografiile utilizatorului',
  addedAt: '2026-11-17',
  verifiedAt: null,
};

function stubDeps(options: {
  submissions: { id: string; status: string }[];
  nutritionPhotoPath: string | null;
  removedPaths: string[];
}) {
  const db = {
    from(table: string) {
      if (table === 'enrichment_receipts') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: { nutrition_photo_path: options.nutritionPhotoPath }, error: null }) }),
          }),
        };
      }
      if (table === 'water_submissions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: options.submissions, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    rpc: async () => ({ data: productId, error: null }),
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          options.removedPaths.push(...paths);
          return { error: null };
        },
      }),
    },
  };
  return {
    adminClient: () => db as never,
    loadProduct: async () => ({
      product: sampleProduct,
      score: { score: null, letter: null, grade: 'unavailable' as const, reasons: [], missing: [] },
    }),
    publishPhoto: async (_uploadPath: string, id: string, suffix: string) => `${id}/${suffix}.jpg`,
    reserveUsage: async () => 1,
    releaseUsage: async () => {},
  };
}

Deno.test('water enrichment rejects a unit other than ml before reserving quota', async () => {
  const input = EnrichProductRequest.parse({
    productId, unit: 'g', nutrients: emptyNutrients, water: baseWater,
    nutritionPhotoPath: device + '/11111111-1111-4111-8111-111111111111-nutrition.jpg',
  });
  const deps = stubDeps({ submissions: [], nutritionPhotoPath: null, removedPaths: [] });
  let calls = 0;
  const adminClient = () => { calls++; return deps.adminClient(); };
  await assert.rejects(() => enrichProduct(input, device, { ...deps, adminClient }), { status: 400 });
  assert.equal(calls, 0);
});

Deno.test('enrichProduct reports waterSubmissionStatus and preserves pending submission photos from cleanup', async () => {
  const req = EnrichProductRequest.parse({
    productId,
    unit: 'ml',
    nutrients: emptyNutrients,
    water: { ...baseWater, ph: 7.2 },
    nutritionPhotoPath: `${device}/33333333-3333-4333-8333-333333333333-nutrition.jpg`,
  });

  const cases: { statuses: string[]; expected: 'applied' | 'partial' | 'queued_for_review' }[] = [
    { statuses: ['accepted'], expected: 'applied' },
    { statuses: ['accepted', 'pending'], expected: 'partial' },
    { statuses: ['pending'], expected: 'queued_for_review' },
  ];

  for (const c of cases) {
    const removedPaths: string[] = [];
    const rpc = async (_fn: string, params: Record<string, unknown>) => ({
      data: params.p_nutrients ? productId : null,
      error: null,
    });
    const deps = stubDeps({
      submissions: c.statuses.map((status, idx) => ({ id: `${idx}`, status })),
      nutritionPhotoPath: `${productId}/earlier.jpg`,
      removedPaths,
    });
    (deps.adminClient() as { rpc: typeof rpc }).rpc = rpc;
    const result = LookupResponse.parse(await enrichProduct(req, device, deps));
    assert.equal(result.status, 'found');
    if (result.status === 'found') {
      assert.equal(result.waterSubmissionStatus, c.expected);
    }
    assert.deepEqual(removedPaths, [], 'pending submission photos must not be deleted as orphans');
  }
});

Deno.test('enrichProduct still cleans up unreferenced orphaned photos when no product or submission row points to them', async () => {
  const req = EnrichProductRequest.parse({
    productId,
    unit: 'ml',
    nutrients: emptyNutrients,
    water: { ...baseWater, ph: 7.2 },
    nutritionPhotoPath: `${device}/44444444-4444-4444-8444-444444444444-nutrition.jpg`,
  });
  const removedPaths: string[] = [];
  const deps = stubDeps({
    submissions: [],
    nutritionPhotoPath: `${productId}/other.jpg`,
    removedPaths,
  });
  (deps.adminClient() as { rpc: (_fn: string, params: Record<string, unknown>) => Promise<{ data: string | null; error: null }> }).rpc =
    async (_fn, params) => ({ data: params.p_nutrients ? productId : null, error: null });

  await enrichProduct(req, device, deps);
  assert.equal(removedPaths.length, 1);
  assert.ok(removedPaths[0]?.startsWith(`${productId}/nutrition-`));
});
