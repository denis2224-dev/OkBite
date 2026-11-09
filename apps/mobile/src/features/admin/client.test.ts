import { readAdminProduct } from './client';

const row = {
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
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      single: async () => ({ data: row, error: null }),
    };
    return {
      from: () => query,
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
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
