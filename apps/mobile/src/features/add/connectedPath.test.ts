import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  AddProductRequest,
  CategoryEntry,
  ErrorCode,
  IdentifyResponse,
  LookupResponse,
  ModerateRequest,
  ReadLabelResponse,
  type AddProductRequest as AddProductRequestType,
  type ProductInput as ProductInputType,
} from '@okbite/shared';
import rawCategoriesJson from '../../../../../data/categories.json';
import { api, ApiError } from '../../lib/api';
import { sendModeration } from '../admin/client';
import { foundYogurt } from '../../test/fixtures';

let mockCurrentDeviceId = 'device-a-1111-1111-1111-111111111111';
jest.mock('../../lib/device', () => ({
  getDeviceId: async () => mockCurrentDeviceId,
}));

const mockFetch = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  }),
}));

describe('Connected E2E Path: Lookup, Add, Second Client, and Moderator Verification', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';
    mockCurrentDeviceId = 'device-a-1111-1111-1111-111111111111';
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
    mockFunctionsInvoke.mockReset();
  });

  const jsonResponse = (body: unknown, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => body,
  });

  it('runs complete sequence: known barcode -> unknown add -> second client discovery -> moderator verification', async () => {
    // -------------------------------------------------------------------------
    // 1. Known barcode lookup (Shopper 1 on Device A)
    // -------------------------------------------------------------------------
    mockFetch.mockResolvedValueOnce(jsonResponse(foundYogurt));
    const knownResult = await api.lookup({ code: '4840001000014' });

    expect(knownResult.status).toBe('found');
    if (knownResult.status === 'found') {
      expect(knownResult.product.code).toBe('4840001000014');
      expect(knownResult.product.status).toBe('verified');
      expect(knownResult.score.grade).toBe('good');
    }
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/functions/v1/lookup?code=4840001000014'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-device-id': 'device-a-1111-1111-1111-111111111111',
        }),
      }),
    );

    // -------------------------------------------------------------------------
    // 2. Unknown product barcode lookup (Shopper 1) -> not_found
    // -------------------------------------------------------------------------
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'not_found' }));
    const unknownResult = await api.lookup({ code: '5941234567890' });
    expect(unknownResult.status).toBe('not_found');

    // -------------------------------------------------------------------------
    // 3. Label OCR scan (Shopper 1) -> readLabel
    // -------------------------------------------------------------------------
    const labelOcr: ReadLabelResponse = {
      ingredientsText: 'Lapte de vacă pasteurizat, culturi lactice selecționate.',
      unit: 'g',
      nutrients: {
        kcal: 65,
        fat: 3.5,
        sat: 2.1,
        sugar: 4.2,
        salt: 0.1,
        protein: 3.2,
        fiber: null,
        fruitVegPct: null,
      },
      unclear: [],
      ingredientsPhotoPath: `${mockCurrentDeviceId}/b3dcb6d1-ingredients.jpg`,
      nutritionPhotoPath: `${mockCurrentDeviceId}/b3dcb6d2-nutrition.jpg`,
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(labelOcr));
    const ocrResult = await api.readLabel({
      ingredientsImage: 'base64-ingredients-photo',
      nutritionImage: 'base64-nutrition-photo',
    });
    expect(ocrResult.ingredientsText).toContain('Lapte de vacă');
    expect(ocrResult.nutrients.fat).toBe(3.5);

    // -------------------------------------------------------------------------
    // 4. Shopper 1 reviews and submits new product (addProduct) -> unverified
    // -------------------------------------------------------------------------
    const realCategories = rawCategoriesJson.map((c) => CategoryEntry.parse(c));
    const iaurtCategory = realCategories.find((c) => c.slug === 'iaurt')!;

    const newProductId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    const addedProductResponse: LookupResponse = {
      status: 'found',
      product: {
        id: newProductId,
        code: '5941234567890',
        status: 'unverified',
        name: 'Iaurt Natural 3.5%',
        brand: 'Lactate Tradiționale',
        quantity: '150 g',
        category: iaurtCategory,
        unit: 'g',
        portion: { amount: 150, label: '150 g' },
        nutrients: labelOcr.nutrients,
        ingredientsText: labelOcr.ingredientsText!,
        ingredients: [
          {
            slug: 'lapte-de-vaca',
            name: 'Lapte de vacă pasteurizat',
            group: 'base',
            role: 'bază',
            explanation: 'Lapte natural',
            source: 'tradițional',
            allergen: 'Lapte',
          },
        ],
        allergens: ['Lapte'],
        mayContain: [],
        imageUrl: null,
        labelImageUrl: `https://example.supabase.co/storage/v1/object/public/products/${newProductId}/ingredients.jpg`,
        source: 'shopper',
        addedAt: '2026-11-05',
        verifiedAt: null,
      },
      score: {
        score: 82,
        letter: 'B',
        grade: 'good',
        reasons: [{ tone: 'good', title: 'Proteine', detail: 'Conținut ridicat' }],
        missing: [],
      },
    };

    mockFetch.mockResolvedValueOnce(jsonResponse(addedProductResponse));
    const addPayload: AddProductRequestType = {
      code: '5941234567890',
      name: 'Iaurt Natural 3.5%',
      brand: 'Lactate Tradiționale',
      quantity: '150 g',
      unit: 'g',
      categorySlug: 'iaurt',
      ingredientsText: labelOcr.ingredientsText!,
      nutrients: labelOcr.nutrients,
      photoPath: null,
      ingredientsPhotoPath: `${mockCurrentDeviceId}/b3dcb6d1-ingredients.jpg`,
      nutritionPhotoPath: `${mockCurrentDeviceId}/b3dcb6d2-nutrition.jpg`,
    };
    const addResult = await api.addProduct(addPayload);
    expect(addResult.status).toBe('found');
    if (addResult.status === 'found') {
      expect(addResult.product.id).toBe(newProductId);
      expect(addResult.product.status).toBe('unverified');
    }

    // -------------------------------------------------------------------------
    // 5. Second Client (Device B) looks up the newly saved product -> found as unverified
    // -------------------------------------------------------------------------
    mockCurrentDeviceId = 'device-b-2222-2222-2222-222222222222';
    mockFetch.mockResolvedValueOnce(jsonResponse(addedProductResponse));
    const clientBResult = await api.lookup({ code: '5941234567890' });
    expect(clientBResult.status).toBe('found');
    if (clientBResult.status === 'found') {
      expect(clientBResult.product.id).toBe(newProductId);
      expect(clientBResult.product.status).toBe('unverified');
      expect(clientBResult.product.verifiedAt).toBeNull();
    }
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/functions/v1/lookup?code=5941234567890'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-device-id': 'device-b-2222-2222-2222-222222222222',
        }),
      }),
    );

    // -------------------------------------------------------------------------
    // 6. Moderator verifies product via sendModeration -> status becomes verified
    // -------------------------------------------------------------------------
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { status: 'ok' }, error: null });
    const verifiedProductInput: ProductInputType = {
      code: '5941234567890',
      name: 'Iaurt Natural 3.5%',
      brand: 'Lactate Tradiționale',
      quantity: '150 g',
      unit: 'g',
      categorySlug: 'iaurt',
      ingredientsText: labelOcr.ingredientsText!,
      nutrients: labelOcr.nutrients,
    };
    await expect(
      sendModeration({
        action: 'verify',
        productId: newProductId,
        product: verifiedProductInput,
      }),
    ).resolves.toBeUndefined();

    // -------------------------------------------------------------------------
    // 7. Shopper visibility update: Client B lookup now sees verified status
    // -------------------------------------------------------------------------
    const verifiedProductResponse: LookupResponse = {
      ...addedProductResponse,
      product: {
        ...(addedProductResponse as Extract<LookupResponse, { status: 'found' }>).product,
        status: 'verified',
        verifiedAt: '2026-11-05',
      },
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(verifiedProductResponse));
    const clientBUpdated = await api.lookup({ code: '5941234567890' });
    expect(clientBUpdated.status).toBe('found');
    if (clientBUpdated.status === 'found') {
      expect(clientBUpdated.product.id).toBe(newProductId);
      expect(clientBUpdated.product.status).toBe('verified');
      expect(clientBUpdated.product.verifiedAt).toBe('2026-11-05');
    }

    // -------------------------------------------------------------------------
    // 8. If moderator hides the product, shopper lookup returns not_found
    // -------------------------------------------------------------------------
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { status: 'ok' }, error: null });
    await expect(
      sendModeration({
        action: 'hide',
        productId: newProductId,
        reason: 'Produs retras sau raportat ca duplicat eronat',
      }),
    ).resolves.toBeUndefined();

    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'not_found' }));
    const clientBAfterHide = await api.lookup({ code: '5941234567890' });
    expect(clientBAfterHide.status).toBe('not_found');
  });

  it('correctly reports structured API error codes for recovery flows', async () => {
    // 1. Rate limiting
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'rate_limited', message: 'Prea multe cereri' }, 429));
    await expect(api.lookup({ code: '4840001000014' })).rejects.toMatchObject({ code: 'rate_limited' });

    // 2. Upstream failure
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'upstream_failed', message: 'Eroare server' }, 502));
    await expect(api.identify('dGVzdA==')).rejects.toMatchObject({ code: 'upstream_failed' });

    // 3. Invalid JSON / malformed response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new Error('invalid json'); },
    });
    await expect(api.lookup({ code: '4840001000014' })).rejects.toMatchObject({ code: 'invalid_response' });

    // 4. Duplicate code on addProduct
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'duplicate', message: 'Cod duplicat' }, 409));
    const duplicateAdd: AddProductRequestType = {
      code: '4840001000014',
      name: 'Iaurt',
      brand: 'Brand',
      quantity: '100 g',
      unit: 'g',
      categorySlug: 'iaurt',
      ingredientsText: 'lapte',
      nutrients: { kcal: 50, fat: 2, sat: 1, sugar: 3, salt: 0.1, protein: 3, fiber: null, fruitVegPct: null },
      photoPath: null,
      ingredientsPhotoPath: 'device-a/ing.jpg',
      nutritionPhotoPath: null,
    };
    await expect(api.addProduct(duplicateAdd)).rejects.toMatchObject({ code: 'duplicate' });

    // 5. Offline error recovery
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.lookup({ code: '4840001000014' })).rejects.toMatchObject({ code: 'offline' });
  });
});
