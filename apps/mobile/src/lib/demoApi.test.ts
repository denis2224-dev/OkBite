import { previewEntries, validAdd } from '../test/fixtures';

jest.mock('./preview', () => ({ isPreview: true }));
jest.mock('./device', () => ({ getDeviceId: async () => '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f' }));

// Demo mode has no backend: products must still open, so history and compare fill up.
describe('api in demo mode without a backend', () => {
  const saved = { ...process.env };
  beforeEach(() => { delete process.env.EXPO_PUBLIC_SUPABASE_URL; delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; });
  afterAll(() => { process.env = saved; });
  const { api } = jest.requireActual<typeof import('./api')>('./api');
  const sample = previewEntries[1]!.product;

  it('looks sample products up by id and by code', async () => {
    expect(await api.lookup({ id: sample.id })).toMatchObject({ status: 'found', product: { id: sample.id } });
    expect(await api.lookup({ code: sample.code! })).toMatchObject({ status: 'found', product: { id: sample.id } });
    expect(await api.lookup({ code: '4840000000000' })).toEqual({ status: 'not_found' });
  });

  it('reads a label, saves the new product and accepts reports without a backend', async () => {
    const label = await api.readLabel({ ingredientsImage: 'aGVsbG8=', nutritionImage: null });
    expect(label.ingredientsText).toBeTruthy();
    const added = await api.addProduct({ ...validAdd, ingredientsPhotoPath: label.ingredientsPhotoPath });
    expect(added).toMatchObject({ status: 'found', product: { name: validAdd.name, brand: validAdd.brand } });
    expect(await api.lookup({ id: added.status === 'found' ? added.product.id : '' })).toMatchObject({ status: 'found' });
    await expect(api.report({ productId: sample.id, message: 'Greșit' })).resolves.toBeUndefined();
  });

  it('identifies a photo as one of the sample products', async () => {
    const result = await api.identify('aGVsbG8=');
    expect(result.status).toBe('found');
    expect(previewEntries.map((e) => e.product.id)).toContain(result.status === 'found' && result.product.id);
  });
});
