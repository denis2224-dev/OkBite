import { z } from "zod";
import { NutrientKey, Nutrients } from "./nutrients";
import { Allergen, IngredientGroup } from "./ingredient";
import {
  Code,
  Uuid,
  Unit,
  ScoreKind,
  IsoDate,
  Category,
  Product,
} from "./product";
import { Letter, ScoreResult } from "./score";
export * from "./nutrients";
export * from "./ingredient";
export * from "./product";
export * from "./score";

export const LookupResponse = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("found"),
    product: Product,
    score: ScoreResult,
  }),
  z.object({ status: z.literal("not_found") }),
]);

export const FrontRead = z.object({
  brand: z.string().nullable(),
  name: z.string().nullable(),
  quantity: z.string().nullable(),
  code: Code.nullable(),
});

export const Candidate = z.object({
  id: Uuid,
  name: z.string(),
  brand: z.string(),
  quantity: z.string(),
  imageUrl: z.string().url().nullable(),
  similarity: z.number().min(0).max(1),
});

export const IdentifyRequest = z.object({ photo: z.string().min(1) });

export const IdentifyResponse = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("found"),
    product: Product,
    score: ScoreResult,
    photoPath: z.string(),
  }),
  z.object({
    status: z.literal("candidates"),
    candidates: z.array(Candidate).min(1).max(3),
    read: FrontRead,
    photoPath: z.string(),
  }),
  z.object({
    status: z.literal("not_found"),
    read: FrontRead,
    photoPath: z.string(),
  }),
]);

export const ReadLabelRequest = z.object({
  ingredientsImage: z.string().min(1),
  nutritionImage: z.string().min(1).nullable(),
});

export const ReadLabelResponse = z.object({
  ingredientsText: z.string().nullable(),
  unit: Unit.nullable(),
  nutrients: Nutrients,
  unclear: z.array(z.union([NutrientKey, z.literal("ingredientsText")])),
  ingredientsPhotoPath: z.string(),
  nutritionPhotoPath: z.string().nullable(),
});

export const AddProductRequest = z.object({
  code: Code.nullable(),
  name: z.string().min(1).max(120),
  brand: z.string().min(1).max(80),
  quantity: z.string().max(30),
  unit: Unit,
  categorySlug: z.string(),
  ingredientsText: z.string().min(3).max(3000),
  nutrients: Nutrients,
  photoPath: z.string().nullable(),
  ingredientsPhotoPath: z.string(),
  nutritionPhotoPath: z.string().nullable(),
});

export const ReportRequest = z.object({
  productId: Uuid,
  message: z.string().min(3).max(1000),
});

export const ProductInput = AddProductRequest.omit({
  photoPath: true,
  ingredientsPhotoPath: true,
  nutritionPhotoPath: true,
});

export const ModerateRequest = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify"),
    productId: Uuid,
    product: ProductInput,
  }),
  z.object({
    action: z.literal("hide"),
    productId: Uuid,
    reason: z.string().min(3),
  }),
  z.object({ action: z.literal("close_report"), reportId: Uuid }),
]);

export const ErrorCode = z.enum([
  "bad_request",
  "rate_limited",
  "not_found",
  "unauthorized",
  "upstream_failed",
  "duplicate",
]);

export const ErrorBody = z.object({ error: ErrorCode, message: z.string() });

export const CategoryEntry = Category;

export const IngredientEntry = z.object({
  slug: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  group: IngredientGroup,
  role: z.string(),
  explanation: z.string(),
  source: z.string(),
  allergen: Allergen.nullable(),
  checkedBy: z.string().min(1),
  checkedAt: IsoDate,
});

export const ScoreFixture = z.object({
  name: z.string(),
  scoreKind: ScoreKind,
  nutrients: Nutrients,
  expectedPoints: z.number().int(),
  expectedLetter: Letter,
  checkedWith: z.string(),
});

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
