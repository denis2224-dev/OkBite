/* eslint-disable @typescript-eslint/no-redeclare -- Zod schemas intentionally share names with inferred types. */
import { z } from 'zod';
import { FieldReason, NutritionMode, ReadLabelRequest, ReadLabelResponse } from '@okbite/shared';

export { FieldReason, NutritionMode };

// The guided flow always sends an explicit mode (the shared schema keeps it optional for old clients).
export const GuidedReadLabelRequest = ReadLabelRequest.and(z.object({ nutrition: NutritionMode }));
export type GuidedReadLabelRequest = z.infer<typeof GuidedReadLabelRequest>;
// ...and needs a reason per field (the shared schema keeps it optional until U3 is deployed).
export const GuidedReadLabelResponse = ReadLabelResponse.and(z.object({
  ingredientsPhotoPath: z.string().trim().min(1),
  reasons: ReadLabelResponse.innerType().shape.reasons.unwrap(),
}));
export type GuidedReadLabelResponse = z.infer<typeof GuidedReadLabelResponse>;
