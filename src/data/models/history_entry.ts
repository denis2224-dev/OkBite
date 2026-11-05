import { z } from "zod";
import { Product } from "./product";
import { ScoreResult } from "./score";
export const HistoryEntrySchema = z.object({
  product: Product,
  score: ScoreResult,
  savedAt: z.string().datetime(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
