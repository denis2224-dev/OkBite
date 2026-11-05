import { z } from "zod";
import { Nutrients } from "./nutrients";
import { Ingredient, Allergen } from "./ingredient";

export const Code = z.string().regex(/^(\d{8}|\d{13})$/);

export const Uuid = z.string().uuid();

export const Unit = z.enum(["g", "ml"]);

export const ScoreKind = z.enum([
  "general",
  "cheese",
  "red_meat",
  "fat",
  "beverage",
  "water",
]);

export const ProductStatus = z.enum(["verified", "unverified", "hidden"]);

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const Category = z.object({
  slug: z.string(),
  name: z.string(),
  scoreKind: ScoreKind,
});

export const Product = z.object({
  id: Uuid,
  code: Code.nullable(),
  status: ProductStatus,
  name: z.string(),
  brand: z.string(),
  quantity: z.string(),
  category: Category,
  unit: Unit,
  portion: z.object({ amount: z.number().positive(), label: z.string() }),
  nutrients: Nutrients,
  ingredientsText: z.string(),
  ingredients: z.array(Ingredient),
  allergens: z.array(Allergen),
  mayContain: z.array(Allergen),
  imageUrl: z.string().url().nullable(),
  labelImageUrl: z.string().url().nullable(),
  source: z.string(),
  addedAt: IsoDate,
  verifiedAt: IsoDate.nullable(),
});

export type Code = z.infer<typeof Code>;

export type Uuid = z.infer<typeof Uuid>;

export type Unit = z.infer<typeof Unit>;

export type ScoreKind = z.infer<typeof ScoreKind>;

export type ProductStatus = z.infer<typeof ProductStatus>;

export type IsoDate = z.infer<typeof IsoDate>;

export type Category = z.infer<typeof Category>;

export type Product = z.infer<typeof Product>;
