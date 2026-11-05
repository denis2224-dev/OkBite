import type { Grade } from "../../data/models/contract";
export function scoreGrade(score: number | null): Grade {
  return score === null
    ? "unavailable"
    : score >= 60
      ? "good"
      : score >= 40
        ? "medium"
        : "low";
}
