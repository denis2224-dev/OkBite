import { z } from "zod";
import { NutrientKey } from "./nutrients";

export const ScoreReason = z.object({
  tone: z.enum(["good", "bad", "neutral"]),
  title: z.string(),
  detail: z.string(),
});

export const Grade = z.enum(["good", "medium", "low", "unavailable"]);

export const Letter = z.enum(["A", "B", "C", "D", "E"]);

export const ScoreResult = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  letter: Letter.nullable(),
  grade: Grade,
  reasons: z.array(ScoreReason).max(3),
  missing: z.array(NutrientKey),
});

export type ScoreReason = z.infer<typeof ScoreReason>;

export type Grade = z.infer<typeof Grade>;

export type Letter = z.infer<typeof Letter>;

export type ScoreResult = z.infer<typeof ScoreResult>;
