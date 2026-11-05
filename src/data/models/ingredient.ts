import { z } from "zod";

export const ALLERGENS = [
  "Gluten",
  "Crustacee",
  "Ouă",
  "Pește",
  "Arahide",
  "Soia",
  "Lapte",
  "Fructe cu coajă lemnoasă",
  "Țelină",
  "Muștar",
  "Susan",
  "Dioxid de sulf și sulfiți",
  "Lupin",
  "Moluște",
] as const;

export const Allergen = z.enum(ALLERGENS);

export const IngredientGroup = z.enum(["base", "fat", "taste", "add", "cult"]);

export const Ingredient = z.object({
  slug: z.string().nullable(),
  name: z.string(),
  group: IngredientGroup.nullable(),
  role: z.string().nullable(),
  explanation: z.string().nullable(),
  source: z.string().nullable(),
  allergen: Allergen.nullable(),
});

export type Allergen = z.infer<typeof Allergen>;

export type IngredientGroup = z.infer<typeof IngredientGroup>;

export type Ingredient = z.infer<typeof Ingredient>;
