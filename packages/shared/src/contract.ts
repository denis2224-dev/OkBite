import { z } from 'zod';

export const ALLERGENS = ['Gluten', 'Crustacee', 'Ouă', 'Pește', 'Arahide', 'Soia', 'Lapte',
  'Fructe cu coajă lemnoasă', 'Țelină', 'Muștar', 'Susan', 'Dioxid de sulf și sulfiți', 'Lupin', 'Moluște'] as const;
export const Allergen = z.enum(ALLERGENS);
export const Code = z.string().regex(/^(\d{8}|\d{13})$/);
export const Uuid = z.string().uuid();
export const Unit = z.enum(['g', 'ml']);
export const ScoreKind = z.enum(['general', 'cheese', 'red_meat', 'fat', 'beverage', 'water']);
export const IngredientGroup = z.enum(['base', 'fat', 'taste', 'add', 'cult']);
export const ProductStatus = z.enum(['verified', 'unverified', 'hidden']);
export const NUTRIENT_KEYS = ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber', 'fruitVegPct'] as const;
export const NutrientKey = z.enum(NUTRIENT_KEYS);
const amount = z.number().nonnegative().nullable();
export const Nutrients = z.object({
  kcal: amount, fat: amount, sat: amount, sugar: amount, salt: amount, protein: amount, fiber: amount,
  fruitVegPct: z.number().min(0).max(100).nullable(),
});
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Category = z.object({ slug: z.string(), name: z.string(), scoreKind: ScoreKind });
export const Ingredient = z.object({
  slug: z.string().nullable(), name: z.string(), group: IngredientGroup.nullable(), role: z.string().nullable(),
  explanation: z.string().nullable(), source: z.string().nullable(), allergen: Allergen.nullable(),
}); // slug null = not in the knowledge base yet ("Explicație în curând")
export const Product = z.object({
  id: Uuid, code: Code.nullable(), status: ProductStatus,
  name: z.string(), brand: z.string(), quantity: z.string(), category: Category, unit: Unit,
  portion: z.object({ amount: z.number().positive(), label: z.string() }),
  nutrients: Nutrients, ingredientsText: z.string(), ingredients: z.array(Ingredient),
  allergens: z.array(Allergen), mayContain: z.array(Allergen),
  imageUrl: z.string().url().nullable(), labelImageUrl: z.string().url().nullable(),
  source: z.string(), addedAt: IsoDate, verifiedAt: IsoDate.nullable(),
});
export const ScoreReason = z.object({ tone: z.enum(['good', 'bad', 'neutral']), title: z.string(), detail: z.string() });
export const Grade = z.enum(['good', 'medium', 'low', 'unavailable']);
export const Letter = z.enum(['A', 'B', 'C', 'D', 'E']);
export const ScoreResult = z.object({
  score: z.number().int().min(0).max(100).nullable(), letter: Letter.nullable(), grade: Grade,
  reasons: z.array(ScoreReason).max(3), missing: z.array(NutrientKey),
});
export const LookupResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('found'), product: Product, score: ScoreResult }),
  z.object({ status: z.literal('not_found') }),
]);

export const FrontRead = z.object({
  brand: z.string().nullable(), name: z.string().nullable(), quantity: z.string().nullable(), code: Code.nullable(),
});
export const Candidate = z.object({
  id: Uuid, name: z.string(), brand: z.string(), quantity: z.string(),
  imageUrl: z.string().url().nullable(), similarity: z.number().min(0).max(1),
});
export const IdentifyRequest = z.object({ photo: z.string().min(1) }); // base64 JPEG
export const IdentifyResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('found'), product: Product, score: ScoreResult, photoPath: z.string() }),
  z.object({ status: z.literal('candidates'), candidates: z.array(Candidate).min(1).max(3), read: FrontRead, photoPath: z.string() }),
  z.object({ status: z.literal('not_found'), read: FrontRead, photoPath: z.string() }),
]);

export const ReadLabelRequest = z.object({
  ingredientsImage: z.string().min(1), nutritionImage: z.string().min(1).nullable(), // null = both on one photo
});
export const ReadLabelResponse = z.object({
  ingredientsText: z.string().nullable(), unit: Unit.nullable(), nutrients: Nutrients,
  unclear: z.array(z.union([NutrientKey, z.literal('ingredientsText')])),
  ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string().nullable(),
});
export const AddProductRequest = z.object({
  code: Code.nullable(), name: z.string().min(1).max(120), brand: z.string().min(1).max(80),
  quantity: z.string().max(30), unit: Unit, categorySlug: z.string(),
  ingredientsText: z.string().min(3).max(3000), nutrients: Nutrients,
  photoPath: z.string().nullable(), ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string().nullable(),
});
export const ReportRequest = z.object({ productId: Uuid, message: z.string().min(3).max(1000) });
export const ProductInput = AddProductRequest.omit({ photoPath: true, ingredientsPhotoPath: true, nutritionPhotoPath: true });
export const ModerateRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('verify'), productId: Uuid, product: ProductInput }),
  z.object({ action: z.literal('hide'), productId: Uuid, reason: z.string().min(3) }),
  z.object({ action: z.literal('close_report'), reportId: Uuid }),
]);
export const ErrorCode = z.enum(['bad_request', 'rate_limited', 'not_found', 'unauthorized', 'upstream_failed', 'duplicate']);
export const ErrorBody = z.object({ error: ErrorCode, message: z.string() });

// Hand-maintained data files in /data (R3)
export const CategoryEntry = Category;
export const IngredientEntry = z.object({
  slug: z.string(), name: z.string(), aliases: z.array(z.string()), group: IngredientGroup, role: z.string(),
  explanation: z.string(), source: z.string(), allergen: Allergen.nullable(),
  checkedBy: z.string().min(1), checkedAt: IsoDate,
});
export const ScoreFixture = z.object({
  name: z.string(), scoreKind: ScoreKind, nutrients: Nutrients,
  expectedPoints: z.number().int(), expectedLetter: Letter, checkedWith: z.string(),
});

export type Allergen = z.infer<typeof Allergen>;
export type Code = z.infer<typeof Code>;
export type Uuid = z.infer<typeof Uuid>;
export type Unit = z.infer<typeof Unit>;
export type ScoreKind = z.infer<typeof ScoreKind>;
export type IngredientGroup = z.infer<typeof IngredientGroup>;
export type ProductStatus = z.infer<typeof ProductStatus>;
export type NutrientKey = z.infer<typeof NutrientKey>;
export type Nutrients = z.infer<typeof Nutrients>;
export type IsoDate = z.infer<typeof IsoDate>;
export type Category = z.infer<typeof Category>;
export type Ingredient = z.infer<typeof Ingredient>;
export type Product = z.infer<typeof Product>;
export type ScoreReason = z.infer<typeof ScoreReason>;
export type Grade = z.infer<typeof Grade>;
export type Letter = z.infer<typeof Letter>;
export type ScoreResult = z.infer<typeof ScoreResult>;
export type LookupResponse = z.infer<typeof LookupResponse>;
export type FrontRead = z.infer<typeof FrontRead>;
export type Candidate = z.infer<typeof Candidate>;
export type IdentifyRequest = z.infer<typeof IdentifyRequest>;
export type IdentifyResponse = z.infer<typeof IdentifyResponse>;
export type ReadLabelRequest = z.infer<typeof ReadLabelRequest>;
export type ReadLabelResponse = z.infer<typeof ReadLabelResponse>;
export type AddProductRequest = z.infer<typeof AddProductRequest>;
export type ReportRequest = z.infer<typeof ReportRequest>;
export type ProductInput = z.infer<typeof ProductInput>;
export type ModerateRequest = z.infer<typeof ModerateRequest>;
export type ErrorCode = z.infer<typeof ErrorCode>;
export type ErrorBody = z.infer<typeof ErrorBody>;
export type CategoryEntry = z.infer<typeof CategoryEntry>;
export type IngredientEntry = z.infer<typeof IngredientEntry>;
export type ScoreFixture = z.infer<typeof ScoreFixture>;
