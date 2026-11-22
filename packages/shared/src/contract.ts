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
const mineralAmount = z.number().finite().min(0).nullable();
export const Carbonation = z.enum(['still', 'lightly_sparkling', 'sparkling']);
export const WaterClassification = z.enum(['drinking', 'natural_mineral', 'table_mineral', 'therapeutic']);
export const LabelKind = z.enum(['food', 'water']);
export const WATER_NUMERIC_KEYS = [
  'tdsMgL', 'dryResidueMgL', 'ph', 'caMgL', 'mgMgL', 'naMgL', 'kMgL',
  'naPlusKMgL', 'hco3MgL', 'so4MgL', 'clMgL', 'fMgL', 'no3MgL', 'bMgL', 'h3bo3MgL', 'iUgL',
] as const;
export const WATER_FIELD_KEYS = ['carbonation', 'classification', ...WATER_NUMERIC_KEYS] as const;
export const WaterNumericKey = z.enum(WATER_NUMERIC_KEYS);
export const WaterFieldKey = z.enum(WATER_FIELD_KEYS);
export const WaterRange = z.object({
  min: z.number().finite().min(0),
  max: z.number().finite().min(0),
}).refine((r) => r.min <= r.max, { message: 'range min must not exceed max', path: ['min'] });
export const WaterFieldEvidence = z.object({
  status: z.enum(['verified', 'unverified']),
  source: z.string().min(1).max(200),
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const optionalFieldMap = <K extends string, V extends z.ZodTypeAny>(keys: readonly K[], schema: V) =>
  z.object(Object.fromEntries(keys.map((k) => [k, schema.optional()])) as { [P in K]: z.ZodOptional<V> });

export const WaterProfile = z.object({
  tdsMgL: z.number().finite().min(0).max(50_000).nullable(),
  dryResidueMgL: z.number().finite().min(0).max(50_000).nullable(),
  ph: z.number().finite().min(0).max(14).nullable(),
  carbonation: Carbonation.nullable(),
  classification: WaterClassification.nullable(),
  caMgL: mineralAmount,
  mgMgL: mineralAmount,
  naMgL: mineralAmount,
  kMgL: mineralAmount,
  naPlusKMgL: mineralAmount,
  hco3MgL: mineralAmount,
  so4MgL: mineralAmount,
  clMgL: mineralAmount,
  fMgL: mineralAmount,
  no3MgL: mineralAmount,
  bMgL: mineralAmount,
  h3bo3MgL: mineralAmount,
  iUgL: mineralAmount,
  ranges: optionalFieldMap(WATER_NUMERIC_KEYS, WaterRange).optional(),
  evidence: optionalFieldMap(WATER_FIELD_KEYS, WaterFieldEvidence).optional(),
});
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Category = z.object({ slug: z.string(), name: z.string(), scoreKind: ScoreKind });
export const Ingredient = z.object({
  slug: z.string().nullable(), name: z.string(), group: IngredientGroup.nullable(), role: z.string().nullable(),
  explanation: z.string().nullable(), source: z.string().nullable(), allergen: Allergen.nullable(),
  // Only additives (group 'add') carry a risk; null = not assessed. Optional so old payloads parse.
  risk: z.enum(['low', 'moderate', 'high']).nullable().optional(), riskSource: z.string().url().nullable().optional(),
}); // slug null = not in the knowledge base yet ("Explicație în curând")
export const Product = z.object({
  id: Uuid, code: Code.nullable(), status: ProductStatus,
  name: z.string(), brand: z.string(), quantity: z.string(), category: Category, unit: Unit,
  portion: z.object({ amount: z.number().positive(), label: z.string() }),
  nutrients: Nutrients, water: WaterProfile.nullable().optional(),
  ingredientsText: z.string(), ingredients: z.array(Ingredient),
  allergens: z.array(Allergen), mayContain: z.array(Allergen),
  imageUrl: z.string().url().nullable(), labelImageUrl: z.string().url().nullable(),
  source: z.string(), addedAt: IsoDate, verifiedAt: IsoDate.nullable(),
  // NOVA group from Open Food Facts or the team; null = unknown, never derived in the app.
  processing: z.object({ level: z.number().int().min(1).max(4), source: z.enum(['off', 'team']) }).nullable().optional(),
});
export const ScoreReason = z.object({ tone: z.enum(['good', 'bad', 'neutral']), title: z.string(), detail: z.string() });
export const Grade = z.enum(['good', 'medium', 'low', 'unavailable']);
export const Letter = z.enum(['A', 'B', 'C', 'D', 'E']);
export const ScoreRange = z.object({
  min: z.number().int().min(0).max(100),
  max: z.number().int().min(0).max(100),
}).refine((r) => r.min <= r.max, { message: 'score range min must not exceed max', path: ['min'] });
export const ScoreResult = z.object({
  score: z.number().int().min(0).max(100).nullable(), letter: Letter.nullable(), grade: Grade,
  reasons: z.array(ScoreReason).max(3), missing: z.array(NutrientKey),
  range: ScoreRange.nullable().optional(),
  waterMissing: z.array(WaterFieldKey).optional(),
  unverifiedUsed: z.boolean().optional(),
});
export const WaterSubmissionOutcome = z.enum(['applied', 'partial', 'queued_for_review']);
export const LookupResponse = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('found'),
    product: Product,
    score: ScoreResult,
    waterSubmissionStatus: WaterSubmissionOutcome.optional(),
  }),
  z.object({ status: z.literal('not_found') }),
]);

const TOP_PRODUCTS_LIMIT = 20;
export const TopProductsQuery = z.object({
  category: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(64),
  limit: z.number().int().min(1).max(TOP_PRODUCTS_LIMIT).default(TOP_PRODUCTS_LIMIT),
}).strict();
export const TopProductsResponse = z.object({
  category: z.string().min(1),
  products: z.array(z.object({ product: Product, score: ScoreResult })).max(TOP_PRODUCTS_LIMIT),
});

export const FrontRead = z.object({
  brand: z.string().nullable(), name: z.string().nullable(), quantity: z.string().nullable(), code: Code.nullable(),
  isWater: z.boolean().optional(),
  carbonation: Carbonation.nullable().optional(),
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

export const NutritionMode = z.enum(['separate', 'same_photo', 'none', 'skipped']);
export const FieldReason = z.enum(['read', 'not_printed', 'not_photographed', 'unreadable', 'no_per_100', 'failed']);
export const LABEL_FIELDS = [...NUTRIENT_KEYS, 'ingredientsText'] as const;
export const LabelField = z.enum(LABEL_FIELDS);
// No nutrition = an old client: a null nutritionImage meant "both on one photo".
export const ReadLabelRequest = z.object({
  ingredientsImage: z.string().min(1), nutritionImage: z.string().min(1).nullable(), nutrition: NutritionMode.optional(),
  kind: LabelKind.optional(),
}).refine((r) => r.nutrition === undefined || (r.nutrition === 'separate') === (r.nutritionImage !== null), {
  message: 'nutritionImage must match the nutrition mode', path: ['nutritionImage'],
});
// Adding nutrition later to a saved product: the nutrition photo alone.
export const EnrichReadLabelRequest = z.object({
  ingredientsImage: z.null(), nutritionImage: z.string().min(1), nutrition: z.literal('separate'),
  kind: LabelKind.optional(),
});
const LabelResponse = z.object({
  ingredientsText: z.string().nullable(), unit: Unit.nullable(), nutrients: Nutrients,
  water: WaterProfile.nullable().optional(),
  unclear: z.array(LabelField), // kept for old clients; reasons says why a field is null
  reasons: z.object(Object.fromEntries(LABEL_FIELDS.map((k) => [k, FieldReason])) as Record<LabelField, typeof FieldReason>)
    .optional(), // shortcut: optional while servers without U3 still answer; make required once U3 is deployed
  ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string().nullable(),
});
// A field is 'read' exactly when it has a value: anything else stays null, never 0.
const reasonsMatchValues = (
  r: Pick<z.infer<typeof LabelResponse>, 'ingredientsText' | 'nutrients' | 'reasons'>, ctx: z.RefinementCtx,
) => {
  if (!r.reasons) return;
  for (const key of LABEL_FIELDS) {
    const value = key === 'ingredientsText' ? r.ingredientsText : r.nutrients[key];
    if ((value !== null) !== (r.reasons[key] === 'read')) {
      ctx.addIssue({ code: 'custom', path: ['reasons', key], message: 'a field is read exactly when it has a value' });
    }
  }
};
export const ReadLabelResponse = LabelResponse.superRefine(reasonsMatchValues);
export const EnrichReadLabelResponse = LabelResponse.extend({
  ingredientsPhotoPath: z.null(), nutritionPhotoPath: z.string().min(1),
}).superRefine(reasonsMatchValues);
const AddProductFields = z.object({
  code: Code.nullable(), name: z.string().min(1).max(120), brand: z.string().max(80), // '' = unreadable on the pack
  quantity: z.string().max(30), unit: Unit, categorySlug: z.string().optional(), // absent = add-product saves 'necunoscut'
  ingredientsText: z.string().max(3000), nutrients: Nutrients, water: WaterProfile.nullable().optional(),
  photoPath: z.string().nullable(), ingredientsPhotoPath: z.string(), nutritionPhotoPath: z.string().nullable(),
});
const requireIngredientsUnlessWater = (
  r: { categorySlug?: string; ingredientsText: string; water?: z.infer<typeof WaterProfile> | null },
  ctx: z.RefinementCtx,
) => {
  const isWater = r.categorySlug === 'apa' || (r.water !== null && r.water !== undefined);
  if (!isWater && r.ingredientsText.length < 3) {
    ctx.addIssue({ code: 'too_small', minimum: 3, type: 'string', inclusive: true, path: ['ingredientsText'] });
  }
};
export const AddProductRequest = AddProductFields.superRefine(requireIngredientsUnlessWater);
export const EnrichProductRequest = z.object({
  productId: Uuid, unit: Unit, nutrients: Nutrients, water: WaterProfile.nullable().optional(), nutritionPhotoPath: z.string().min(1),
});
export const ReportRequest = z.object({ productId: Uuid, message: z.string().min(3).max(1000) });
export const ProductInput = AddProductFields.omit({ photoPath: true, ingredientsPhotoPath: true, nutritionPhotoPath: true })
  .extend({ brand: z.string().min(1).max(80), categorySlug: z.string() }) // a verified product names both
  .superRefine(requireIngredientsUnlessWater);
export const WaterPartialProfile = WaterProfile.partial();
export const WaterSubmissionKind = z.enum(['fill', 'conflict', 'verified_update']);
export const WaterSubmissionStatus = z.enum(['pending', 'accepted', 'rejected']);
export const WaterSubmission = z.object({
  id: Uuid,
  productId: Uuid,
  productName: z.string(),
  productBrand: z.string(),
  productQuantity: z.string(),
  currentWater: WaterPartialProfile.nullable(),
  proposedWater: WaterPartialProfile,
  photoPath: z.string(),
  photoUrl: z.string().url().nullable().optional(),
  kind: WaterSubmissionKind,
  status: WaterSubmissionStatus,
  createdAt: IsoDate,
});
export const AdminAddWaterInput = z.object({
  code: Code.nullable(),
  brand: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().min(1).max(30),
  status: z.enum(['verified', 'unverified']),
  source: z.string().trim().min(1).max(200),
  sourceUrl: z
    .string()
    .trim()
    .max(300)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'expected http/https URL')
    .nullable()
    .optional(),
  ingredientsText: z.string().max(3000),
  water: WaterProfile,
});
export const ModerateRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('verify'), productId: Uuid, product: ProductInput }),
  z.object({ action: z.literal('hide'), productId: Uuid, reason: z.string().min(3) }),
  z.object({ action: z.literal('close_report'), reportId: Uuid }),
  z.object({
    action: z.literal('resolve_water_submission'),
    submissionId: Uuid,
    decision: z.enum(['accept', 'reject']),
  }),
  z.object({ action: z.literal('add_water'), product: AdminAddWaterInput }),
]);
export const ErrorCode = z.enum(['bad_request', 'rate_limited', 'not_found', 'unauthorized', 'upstream_failed', 'duplicate']);
export const ErrorBody = z.object({ error: ErrorCode, message: z.string() });

export const ClientErrorRequest = z.object({
  message: z.string().min(1).max(1000), stack: z.string().max(2000).nullable(),
  screen: z.string().max(200).refine((value) => !/[?#]/.test(value)),
  appVersion: z.string().min(1).max(50), platform: z.enum(['ios', 'android', 'web']),
}).strict();
export const ClientErrorResponse = z.object({ status: z.literal('ok') });

// Hand-maintained data files in /data (R3)
export const CategoryEntry = Category;
export const IngredientEntry = z.object({
  slug: z.string(), name: z.string(), aliases: z.array(z.string()), group: IngredientGroup, role: z.string(),
  explanation: z.string(), source: z.string(), allergen: Allergen.nullable(),
  checkedBy: z.string().min(1), checkedAt: IsoDate,
});
export const ScoreFixture = z.object({
  name: z.string(), scoreKind: ScoreKind, nutrients: Nutrients,
  ingredientsText: z.string().nullable().optional(),
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
export type Carbonation = z.infer<typeof Carbonation>;
export type WaterClassification = z.infer<typeof WaterClassification>;
export type LabelKind = z.infer<typeof LabelKind>;
export type WaterNumericKey = z.infer<typeof WaterNumericKey>;
export type WaterFieldKey = z.infer<typeof WaterFieldKey>;
export type WaterRange = z.infer<typeof WaterRange>;
export type WaterFieldEvidence = z.infer<typeof WaterFieldEvidence>;
export type WaterProfile = z.infer<typeof WaterProfile>;
export type WaterPartialProfile = z.infer<typeof WaterPartialProfile>;
export type IsoDate = z.infer<typeof IsoDate>;
export type Category = z.infer<typeof Category>;
export type Ingredient = z.infer<typeof Ingredient>;
export type Product = z.infer<typeof Product>;
export type ScoreReason = z.infer<typeof ScoreReason>;
export type Grade = z.infer<typeof Grade>;
export type Letter = z.infer<typeof Letter>;
export type ScoreRange = z.infer<typeof ScoreRange>;
export type ScoreResult = z.infer<typeof ScoreResult>;
export type WaterSubmissionOutcome = z.infer<typeof WaterSubmissionOutcome>;
export type LookupResponse = z.infer<typeof LookupResponse>;
export type TopProductsQuery = z.infer<typeof TopProductsQuery>;
export type TopProductsResponse = z.infer<typeof TopProductsResponse>;
export type FrontRead = z.infer<typeof FrontRead>;
export type Candidate = z.infer<typeof Candidate>;
export type IdentifyRequest = z.infer<typeof IdentifyRequest>;
export type IdentifyResponse = z.infer<typeof IdentifyResponse>;
export type ReadLabelRequest = z.infer<typeof ReadLabelRequest>;
export type ReadLabelResponse = z.infer<typeof ReadLabelResponse>;
export type NutritionMode = z.infer<typeof NutritionMode>;
export type FieldReason = z.infer<typeof FieldReason>;
export type LabelField = z.infer<typeof LabelField>;
export type EnrichReadLabelRequest = z.infer<typeof EnrichReadLabelRequest>;
export type EnrichReadLabelResponse = z.infer<typeof EnrichReadLabelResponse>;
export type EnrichProductRequest = z.infer<typeof EnrichProductRequest>;
export type AddProductRequest = z.infer<typeof AddProductRequest>;
export type ReportRequest = z.infer<typeof ReportRequest>;
export type ProductInput = z.infer<typeof ProductInput>;
export type WaterSubmissionKind = z.infer<typeof WaterSubmissionKind>;
export type WaterSubmissionStatus = z.infer<typeof WaterSubmissionStatus>;
export type WaterSubmission = z.infer<typeof WaterSubmission>;
export type AdminAddWaterInput = z.infer<typeof AdminAddWaterInput>;
export type ModerateRequest = z.infer<typeof ModerateRequest>;
export type ErrorCode = z.infer<typeof ErrorCode>;
export type ErrorBody = z.infer<typeof ErrorBody>;
export type ClientErrorRequest = z.infer<typeof ClientErrorRequest>;
export type ClientErrorResponse = z.infer<typeof ClientErrorResponse>;
export type CategoryEntry = z.infer<typeof CategoryEntry>;
export type IngredientEntry = z.infer<typeof IngredientEntry>;
export type ScoreFixture = z.infer<typeof ScoreFixture>;
