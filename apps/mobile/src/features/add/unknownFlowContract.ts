/* eslint-disable @typescript-eslint/no-redeclare -- Zod schemas intentionally share names with inferred types. */
import { z } from 'zod';
import { Code, NUTRIENT_KEYS, Nutrients, ReadLabelRequest, ReadLabelResponse, Unit, Uuid } from '@okbite/shared';

// shortcut: temporary U1 shim until Denis's U1 contract PR merges into @okbite/shared;
// then import NutritionMode, FieldReason, and the updated ReadLabel schemas from @okbite/shared and delete this file.
export const NutritionMode = z.enum(['separate', 'same_photo', 'none', 'skipped']);
export type NutritionMode = z.infer<typeof NutritionMode>;
export const FieldReason = z.enum(['read', 'not_printed', 'not_photographed', 'unreadable', 'no_per_100', 'failed']);
export const GuidedReadLabelRequest = ReadLabelRequest.extend({ nutrition: NutritionMode }).superRefine((value, context) => {
  if ((value.nutrition === 'separate') !== (value.nutritionImage !== null)) {
    context.addIssue({ code: 'custom', message: 'Nutrition photo must match explicit mode' });
  }
});
export type GuidedReadLabelRequest = z.infer<typeof GuidedReadLabelRequest>;
export const GuidedReadLabelResponse = ReadLabelResponse.extend({
  ingredientsPhotoPath: z.string().trim().min(1),
  nutritionPhotoPath: z.string().trim().min(1).nullable(),
  reasons: z.record(z.enum([...NUTRIENT_KEYS, 'ingredientsText']), FieldReason),
}).superRefine((value, context) => {
  for (const key of [...NUTRIENT_KEYS, 'ingredientsText'] as const) {
    if (!value.reasons[key]) context.addIssue({ code: 'custom', message: `Missing reason: ${key}` });
  }
});
export type GuidedReadLabelResponse = z.infer<typeof GuidedReadLabelResponse>;
export type FieldReason = z.infer<typeof FieldReason>;

export const UnknownAddProductRequest = z.object({
  categorySlug: z.string().trim().min(1).max(60).optional(),
  code: Code.nullable(),
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80),
  quantity: z.string().trim().max(30),
  photoPath: z.string().trim().min(1).nullable(),
  ingredientsText: z.string().trim().min(3).max(3000),
  unit: Unit.nullable(),
  nutrients: Nutrients,
  ingredientsPhotoPath: z.string().trim().min(1),
  nutritionPhotoPath: z.string().trim().min(1).nullable(),
});
export type UnknownAddProductRequest = z.infer<typeof UnknownAddProductRequest>;

export const EnrichReadLabelRequest = z.object({
  ingredientsImage: z.literal(null),
  nutritionImage: z.string().min(1),
  nutrition: z.literal('separate'),
});
export type EnrichReadLabelRequest = z.infer<typeof EnrichReadLabelRequest>;

export const EnrichReadLabelResponse = z.object({
  ingredientsText: z.string().nullable(),
  unit: Unit.nullable(),
  nutrients: Nutrients,
  unclear: z.array(z.enum([...NUTRIENT_KEYS, 'ingredientsText'])),
  ingredientsPhotoPath: z.string().nullable(),
  nutritionPhotoPath: z.string().trim().min(1),
  reasons: z.record(z.enum([...NUTRIENT_KEYS, 'ingredientsText']), FieldReason).optional(),
});
export type EnrichReadLabelResponse = z.infer<typeof EnrichReadLabelResponse>;

export const EnrichProductRequest = z.object({
  productId: Uuid,
  unit: Unit,
  nutrients: Nutrients,
  nutritionPhotoPath: z.string().trim().min(1),
});
export type EnrichProductRequest = z.infer<typeof EnrichProductRequest>;
