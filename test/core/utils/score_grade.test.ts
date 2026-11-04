import { scoreGrade } from "../../../src/core/utils/score_grade";
it.each([
  [null, "unavailable"],
  [0, "low"],
  [39, "low"],
  [40, "medium"],
  [59, "medium"],
  [60, "good"],
  [100, "good"],
] as const)("grades %s", (value, grade) =>
  expect(scoreGrade(value)).toBe(grade),
);
