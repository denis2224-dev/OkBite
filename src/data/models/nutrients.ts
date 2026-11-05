import { z } from "zod";

export const NUTRIENT_KEYS = [
  "kcal",
  "fat",
  "sat",
  "sugar",
  "salt",
  "protein",
  "fiber",
  "fruitVegPct",
] as const;

export const NutrientKey = z.enum(NUTRIENT_KEYS);

const amount = z.number().nonnegative().nullable();

export const Nutrients = z.object({
  kcal: amount,
  fat: amount,
  sat: amount,
  sugar: amount,
  salt: amount,
  protein: amount,
  fiber: amount,
  fruitVegPct: z.number().min(0).max(100).nullable(),
});

export type NutrientKey = z.infer<typeof NutrientKey>;

export type Nutrients = z.infer<typeof Nutrients>;
