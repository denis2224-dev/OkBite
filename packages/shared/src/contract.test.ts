import { describe, it, expect } from 'vitest';
import type { Nutrients } from './contract';
import {
  Code, Nutrients as NutrientsSchema, IdentifyResponse, AddProductRequest, ReadLabelResponse, Uuid, NUTRIENT_KEYS,
  Product, ScoreResult, LookupResponse, ReadLabelRequest, ReportRequest, ModerateRequest,
  ErrorCode, ErrorBody, IngredientEntry, IdentifyRequest, LABEL_FIELDS, FieldReason, EnrichReadLabelRequest,
  EnrichReadLabelResponse, EnrichProductRequest, ProductInput,
} from './contract';

const n: Nutrients = { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: 0, fruitVegPct: null };

describe('contract', () => {
  it('accepts EAN-8 and EAN-13 only', () => {
    expect(Code.safeParse('4840001000014').success).toBe(true);
    expect(Code.safeParse('96385074').success).toBe(true);
    expect(Code.safeParse('484000100001').success).toBe(false);
  });
  it('allows null nutrients but not negative ones', () => {
    expect(NutrientsSchema.safeParse(n).success).toBe(true);
    expect(NutrientsSchema.safeParse({ ...n, sugar: -1 }).success).toBe(false);
  });
  it('parses identify candidates with what the AI read', () => {
    const r = IdentifyResponse.parse({
      status: 'candidates', photoPath: 'dev/a-front.jpg',
      read: { brand: 'Zorel', name: 'Iaurt cu căpșuni', quantity: '400 g', code: null },
      candidates: [{ id: '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f', name: 'Iaurt cu căpșuni 2%', brand: 'Zorel', quantity: '400 g', imageUrl: null, similarity: 0.71 }],
    });
    expect(r.status).toBe('candidates');
  });
  it('lets a product be added without a barcode', () => {
    expect(AddProductRequest.safeParse({
      code: null, name: 'Biscuiți', brand: 'X', quantity: '200 g', unit: 'g', categorySlug: 'biscuiti',
      ingredientsText: 'făină de grâu, zahăr', nutrients: n,
      photoPath: null, ingredientsPhotoPath: 'dev/i.jpg', nutritionPhotoPath: 'dev/n.jpg',
    }).success).toBe(true);
  });
  it('lists unclear fields in read-label responses', () => {
    const r = ReadLabelResponse.parse({ ingredientsText: null, unit: 'g', nutrients: { ...n, sugar: null },
      unclear: ['ingredientsText', 'sugar'], ingredientsPhotoPath: 'dev/i.jpg', nutritionPhotoPath: 'dev/n.jpg' });
    expect(r.unclear).toContain('sugar');
  });
});

const id = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f';
const add = {
  code: null, name: 'Biscuiți', brand: 'X', quantity: '200 g', unit: 'g', categorySlug: 'biscuiti',
  ingredientsText: 'făină de grâu, zahăr', nutrients: n,
  photoPath: null, ingredientsPhotoPath: 'dev/i.jpg', nutritionPhotoPath: null,
};
const candidate = { id, name: 'Iaurt cu căpșuni 2%', brand: 'Zorel', quantity: '400 g', imageUrl: null, similarity: 0.71 };
const read = { brand: null, name: null, quantity: null, code: null };
const product = {
  ...add, id, status: 'unverified', category: { slug: 'biscuiti', name: 'Biscuiți', scoreKind: 'general' },
  portion: { amount: 100, label: '100 g' }, ingredients: [], allergens: [], mayContain: [],
  imageUrl: null, labelImageUrl: null, source: 'Fixture din planul C1', addedAt: '2026-11-04', verifiedAt: null,
};
const unavailable = { score: null, letter: null, grade: 'unavailable', reasons: [], missing: ['sugar'] };

describe('contract boundaries', () => {
  it.each(['', '1234567', '123456789', 'abcdefgh', ' 96385074', '96385074 ', '48400010000140'])(
    'rejects malformed code %j', (code) => expect(Code.safeParse(code).success).toBe(false),
  );
  it('leaves checksum validation to D3', () => {
    expect(Code.parse('4840001000017')).toBe('4840001000017');
  });
  it.each(['invalid', '0b6f3c1e', 'zb6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f'])(
    'rejects invalid UUID %j', (value) => expect(Uuid.safeParse(value).success).toBe(false),
  );
  it.each(NUTRIENT_KEYS)('rejects negative %s', (key) => {
    expect(NutrientsSchema.safeParse({ ...n, [key]: -1 }).success).toBe(false);
  });
  it('preserves missing nutrients as null and requires every key', () => {
    const empty = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, null]));
    expect(NutrientsSchema.parse(empty)).toEqual(empty);
    expect(NutrientsSchema.safeParse({ ...n, sugar: undefined }).success).toBe(false);
  });
  it.each([0, 100])('accepts fruit/vegetable percentage %s', (fruitVegPct) => {
    expect(NutrientsSchema.safeParse({ ...n, fruitVegPct }).success).toBe(true);
  });
  it.each([-0.1, 100.1])('rejects fruit/vegetable percentage %s', (fruitVegPct) => {
    expect(NutrientsSchema.safeParse({ ...n, fruitVegPct }).success).toBe(false);
  });
  it.each([['name', 1, 120], ['brand', 0, 80], ['quantity', 0, 30], ['ingredientsText', 3, 3000]] as const)(
    'enforces %s length bounds', (field, min, max) => {
      expect(AddProductRequest.safeParse({ ...add, [field]: 'x'.repeat(min) }).success).toBe(true);
      expect(AddProductRequest.safeParse({ ...add, [field]: 'x'.repeat(max) }).success).toBe(true);
      expect(AddProductRequest.safeParse({ ...add, [field]: 'x'.repeat(max + 1) }).success).toBe(false);
      if (min > 0) expect(AddProductRequest.safeParse({ ...add, [field]: 'x'.repeat(min - 1) }).success).toBe(false);
    },
  );
  it('requires code to be explicitly null when absent', () => {
    expect(AddProductRequest.safeParse({ ...add, code: undefined }).success).toBe(false);
  });
  it('accepts a nullable-barcode product and discriminated lookup responses', () => {
    expect(Product.parse(product).code).toBeNull();
    expect(LookupResponse.parse({ status: 'found', product, score: unavailable }).status).toBe('found');
    expect(LookupResponse.parse({ status: 'not_found' })).toEqual({ status: 'not_found' });
    expect(LookupResponse.safeParse({ status: 'found' }).success).toBe(false);
    expect(LookupResponse.safeParse({ status: 'unknown' }).success).toBe(false);
  });
  it.each([0, 1, 3, 4])('bounds identify candidates at %s', (count) => {
    const response = { status: 'candidates', read, photoPath: 'dev/a-front.jpg', candidates: Array(count).fill(candidate) };
    expect(IdentifyResponse.safeParse(response).success).toBe(count >= 1 && count <= 3);
  });
  it('rejects empty identify photos', () => {
    expect(IdentifyRequest.safeParse({ photo: 'jpeg' }).success).toBe(true);
    expect(IdentifyRequest.safeParse({ photo: '' }).success).toBe(false);
  });
  it('supports the one-photo label request and rejects empty images', () => {
    expect(ReadLabelRequest.safeParse({ ingredientsImage: 'jpeg', nutritionImage: null }).success).toBe(true);
    expect(ReadLabelRequest.safeParse({ ingredientsImage: '', nutritionImage: null }).success).toBe(false);
    expect(ReadLabelRequest.safeParse({ ingredientsImage: 'jpeg', nutritionImage: '' }).success).toBe(false);
  });
  it.each([2, 3, 1000, 1001])('bounds report message length at %s', (length) => {
    expect(ReportRequest.safeParse({ productId: id, message: 'x'.repeat(length) }).success).toBe(length >= 3 && length <= 1000);
  });
  it('validates action-specific moderation bodies', () => {
    expect(ModerateRequest.safeParse({ action: 'verify', productId: id, product: { ...add, photoPath: undefined, ingredientsPhotoPath: undefined, nutritionPhotoPath: undefined } }).success).toBe(true);
    expect(ModerateRequest.safeParse({ action: 'hide', productId: id, reason: 'Motiv' }).success).toBe(true);
    expect(ModerateRequest.safeParse({ action: 'close_report', reportId: id }).success).toBe(true);
    expect(ModerateRequest.safeParse({ action: 'verify', productId: id }).success).toBe(false);
    expect(ModerateRequest.safeParse({ action: 'hide', productId: id, reason: 'x' }).success).toBe(false);
    expect(ModerateRequest.safeParse({ action: 'close_report', productId: id }).success).toBe(false);
  });
  it.each(['bad_request', 'rate_limited', 'not_found', 'unauthorized', 'upstream_failed', 'duplicate'])(
    'accepts the %s error envelope', (error) => {
      expect(ErrorCode.parse(error)).toBe(error);
      expect(ErrorBody.safeParse({ error, message: 'Eroare' }).success).toBe(true);
    },
  );
  it('rejects unknown errors and requires the error message', () => {
    expect(ErrorBody.safeParse({ error: 'unknown', message: 'Eroare' }).success).toBe(false);
    expect(ErrorBody.safeParse({ error: 'bad_request' }).success).toBe(false);
  });
  it('retains an unavailable score and limits numeric scores and reasons', () => {
    expect(ScoreResult.parse(unavailable).score).toBeNull();
    for (const score of [-1, 100.1, 101]) expect(ScoreResult.safeParse({ ...unavailable, score }).success).toBe(false);
    const reasons = Array(4).fill({ tone: 'neutral', title: 'Titlu', detail: 'Detaliu' });
    expect(ScoreResult.safeParse({ ...unavailable, reasons }).success).toBe(false);
  });
  it('requires an ingredient source record to name its human checker', () => {
    expect(IngredientEntry.shape.checkedBy.safeParse('').success).toBe(false);
  });
});

describe('unknown product flow (U1)', () => {
  const label = { ingredientsText: 'lapte', unit: 'g', nutrients: n, unclear: [], ingredientsPhotoPath: 'dev/i.jpg', nutritionPhotoPath: 'dev/n.jpg' };
  const allRead = Object.fromEntries(LABEL_FIELDS.map((key) => [key, 'read']));
  const readAll = { ...label, nutrients: { ...n, fruitVegPct: 0 } }; // every field read

  it.each([
    ['separate', 'jpeg', true], ['separate', null, false],
    ['same_photo', null, true], ['same_photo', 'jpeg', false],
    ['none', null, true], ['none', 'jpeg', false],
    ['skipped', null, true], ['skipped', 'jpeg', false],
  ] as const)('read-label mode %s with nutritionImage %j parses: %s', (nutrition, nutritionImage, ok) => {
    expect(ReadLabelRequest.safeParse({ ingredientsImage: 'jpeg', nutritionImage, nutrition }).success).toBe(ok);
  });
  it('still accepts old read-label requests without a mode', () => {
    expect(ReadLabelRequest.safeParse({ ingredientsImage: 'jpeg', nutritionImage: null }).success).toBe(true);
    expect(ReadLabelRequest.safeParse({ ingredientsImage: 'jpeg', nutritionImage: 'jpeg' }).success).toBe(true);
  });
  it('keeps the ingredients photo required outside the enrich read', () => {
    expect(ReadLabelRequest.safeParse({ ingredientsImage: null, nutritionImage: 'jpeg', nutrition: 'separate' }).success).toBe(false);
    expect(ReadLabelRequest.safeParse({ ingredientsImage: 'jpeg', nutritionImage: null, nutrition: 'unknown' }).success).toBe(false);
  });
  it('reads the nutrition photo alone for an enrich read', () => {
    expect(EnrichReadLabelRequest.safeParse({ ingredientsImage: null, nutritionImage: 'jpeg', nutrition: 'separate' }).success).toBe(true);
    expect(EnrichReadLabelRequest.safeParse({ ingredientsImage: null, nutritionImage: null, nutrition: 'separate' }).success).toBe(false);
    expect(EnrichReadLabelRequest.safeParse({ ingredientsImage: null, nutritionImage: 'jpeg', nutrition: 'same_photo' }).success).toBe(false);
  });
  it('returns a reason for every label field and still parses old responses', () => {
    const noSugar = { ...readAll, nutrients: { ...readAll.nutrients, sugar: null }, reasons: { ...allRead, sugar: 'not_printed' } };
    expect(ReadLabelResponse.parse(noSugar).reasons?.sugar).toBe('not_printed');
    expect(ReadLabelResponse.parse(label).reasons).toBeUndefined();
    expect(ReadLabelResponse.parse(label).unclear).toEqual([]);
    const { fiber: _fiber, ...missingOne } = allRead;
    expect(ReadLabelResponse.safeParse({ ...readAll, reasons: missingOne }).success).toBe(false);
    expect(ReadLabelResponse.safeParse({ ...readAll, reasons: { ...allRead, kcal: 'guessed' } }).success).toBe(false);
  });
  const enrichAll = { ...readAll, ingredientsPhotoPath: null };
  const nulled = <T extends typeof readAll | typeof enrichAll>(r: T, key: (typeof LABEL_FIELDS)[number]) =>
    key === 'ingredientsText' ? { ...r, ingredientsText: null } : { ...r, nutrients: { ...r.nutrients, [key]: null } };
  describe.each([['ReadLabelResponse', ReadLabelResponse, readAll], ['EnrichReadLabelResponse', EnrichReadLabelResponse, enrichAll]] as const)(
    '%s keeps a field null exactly when its reason is not read', (_name, schema, base) => {
      it('accepts every field read with a value', () => {
        expect(schema.safeParse({ ...base, reasons: allRead }).success).toBe(true);
      });
      it.each(LABEL_FIELDS)('rejects a value on %s whose reason is not read', (key) => {
        expect(schema.safeParse({ ...base, reasons: { ...allRead, [key]: 'unreadable' } }).success).toBe(false);
      });
      it.each(LABEL_FIELDS)('rejects a null %s marked read', (key) => {
        expect(schema.safeParse({ ...nulled(base, key), reasons: allRead }).success).toBe(false);
      });
      it.each(LABEL_FIELDS)('accepts a null %s with a reason', (key) => {
        expect(schema.safeParse({ ...nulled(base, key), reasons: { ...allRead, [key]: 'not_printed' } }).success).toBe(true);
      });
    },
  );
  it('rejects an enrich response with an ingredients photo or without a nutrition photo', () => {
    expect(EnrichReadLabelResponse.safeParse({ ...enrichAll, ingredientsPhotoPath: 'dev/i.jpg' }).success).toBe(false);
    expect(EnrichReadLabelResponse.safeParse({ ...enrichAll, nutritionPhotoPath: '' }).success).toBe(false);
  });
  it.each(FieldReason.options)('accepts field reason %s', (reason) => {
    expect(FieldReason.parse(reason)).toBe(reason);
  });
  it('has no ingredients photo path on the enrich read response', () => {
    const enrich = { ...readAll, ingredientsText: null, ingredientsPhotoPath: null, reasons: { ...allRead, ingredientsText: 'not_photographed' } };
    expect(EnrichReadLabelResponse.safeParse(enrich).success).toBe(true);
    expect(EnrichReadLabelResponse.safeParse({ ...enrich, nutritionPhotoPath: null }).success).toBe(false);
    expect(ReadLabelResponse.safeParse(enrich).success).toBe(false);
  });
  it('lets the category be left out and allows an unreadable brand', () => {
    const { categorySlug: _category, ...noCategory } = add;
    expect(AddProductRequest.parse(noCategory).categorySlug).toBeUndefined();
    expect(AddProductRequest.parse({ ...add, brand: '' }).brand).toBe('');
    expect(AddProductRequest.parse({ ...add, nutrients: Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, null])) }).nutrients.sugar).toBeNull();
  });
  it('still makes the moderator name a brand and category when verifying', () => {
    const { photoPath: _p, ingredientsPhotoPath: _i, nutritionPhotoPath: _n, ...input } = add;
    expect(ProductInput.safeParse(input).success).toBe(true);
    expect(ProductInput.safeParse({ ...input, brand: '' }).success).toBe(false);
    expect(ProductInput.safeParse({ ...input, categorySlug: undefined }).success).toBe(false);
  });
  it('validates nutrition enrichment of an existing product', () => {
    const enrich = { productId: id, unit: 'g', nutrients: { ...n, fiber: null }, nutritionPhotoPath: 'dev/n.jpg' };
    expect(EnrichProductRequest.parse(enrich).nutrients.fiber).toBeNull();
    expect(EnrichProductRequest.safeParse({ ...enrich, productId: 'x' }).success).toBe(false);
    expect(EnrichProductRequest.safeParse({ ...enrich, nutritionPhotoPath: '' }).success).toBe(false);
    expect(EnrichProductRequest.safeParse({ ...enrich, unit: null }).success).toBe(false);
  });
});
