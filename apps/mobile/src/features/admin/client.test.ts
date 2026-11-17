import { getAdminClient, readAdminProduct, readWaterSubmissions, sendModeration } from './client';

const row: Record<string, unknown> & { id: string } = {
  id: '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f',
  name: 'Biscuiți',
  brand: '',
  quantity: '',
  code: null,
  unit: 'g',
  category_slug: 'necunoscut',
  ingredients_text: 'făină, zahăr',
  kcal: null,
  fat: null,
  sat: null,
  sugar: null,
  salt: null,
  protein: null,
  fiber: null,
  fruit_veg_pct: null,
  image_path: null,
  ingredients_photo_path: null,
  nutrition_photo_path: null,
};
let mockSubmissionRows: Record<string, unknown>[] = [];
const mockInvoke = jest.fn(async () => ({ data: { status: 'ok' }, error: null }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const query: Record<string, unknown> = {
      select: () => query,
      eq: () => query,
      order: () => query,
      limit: async () => ({ data: mockSubmissionRows, error: null }),
      single: async () => ({ data: row, error: null }),
    };
    return {
      from: (table: string) => {
        if (table === 'water_submissions') {
          return {
            select: () => query,
          };
        }
        return query;
      },
      functions: { invoke: mockInvoke },
      storage: { from: () => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: path ? `https://example.supabase.co/storage/${path}` : '' } }) }) },
    };
  },
}));

it('opens a shopper product whose brand was unreadable so the moderator can fill it in', async () => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';
  const { input } = await readAdminProduct(row.id);
  expect(input.brand).toBe('');
  expect(input.nutrients.sugar).toBeNull();
});

it('shows an Open Food Facts front photo to the moderator as is', async () => {
  const url = 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg';
  row.image_path = url;
  const { photos } = await readAdminProduct(row.id);
  row.image_path = null;
  expect(photos).toEqual([{ label: expect.any(String), url }]);
});

it('loads pending water submissions with resolved photo URLs and sends resolution decisions', async () => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';
  const pid = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f';
  const sid = '1b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f';
  mockSubmissionRows = [
    {
      id: sid,
      product_id: pid,
      photo_path: `${pid}/nutrition-123.jpg`,
      proposed_water: { tdsMgL: 490 },
      kind: 'conflict',
      status: 'pending',
      created_at: '2026-11-17T08:00:00Z',
      product: { name: 'OM Plată', brand: 'OM', quantity: '1,5 L', water: { tdsMgL: 375 } },
    },
  ];
  const submissions = await readWaterSubmissions();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    id: sid,
    productId: pid,
    productName: 'OM Plată',
    productBrand: 'OM',
    productQuantity: '1,5 L',
    kind: 'conflict',
    photoUrl: `https://example.supabase.co/storage/${pid}/nutrition-123.jpg`,
  });
  expect(submissions[0]?.proposedWater.tdsMgL).toBe(490);
  expect(submissions[0]?.currentWater?.tdsMgL).toBe(375);

  await sendModeration({ action: 'resolve_water_submission', submissionId: sid, decision: 'accept' });
  expect(mockInvoke).toHaveBeenCalledWith('moderate', {
    body: { action: 'resolve_water_submission', submissionId: sid, decision: 'accept' },
  });
  void getAdminClient;
});
