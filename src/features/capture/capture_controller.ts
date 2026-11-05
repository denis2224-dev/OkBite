import { ro } from "../../core/constants/strings_ro";
import { formatAmount } from "../../core/utils/formatters";
import { scoreGrade } from "../../core/utils/score_grade";
import type { Nutrients, ScoreResult } from "../../data/models/contract";
export type Step =
  | "capture"
  | "scan"
  | "confirm"
  | "result"
  | "notFound"
  | "ingredientsPhoto"
  | "nutritionPhoto"
  | "review"
  | "offline";
export type Flow = { step: Step };
export function start(): Flow {
  return { step: "ingredientsPhoto" };
}
export function next(
  flow: Flow,
  event: "photo" | "confirm" | "unknown" | "add",
): Flow {
  if (event === "unknown") return { step: "notFound" };
  if (event === "add") return start();
  if (event === "confirm") return { step: "result" };
  return { step: flow.step === "nutritionPhoto" ? "review" : "nutritionPhoto" };
}
export const nutrientKeys = [
  "kcal",
  "fat",
  "sat",
  "sugar",
  "salt",
  "protein",
  "fiber",
] as const;
export type Review = { ingredients: string } & Record<
  (typeof nutrientKeys)[number],
  string
>;
export function invalidFields(value: Review) {
  const invalid: string[] = [];
  if (!value.ingredients.trim() || value.ingredients.includes("[?]"))
    invalid.push("ingredientele");
  for (const key of nutrientKeys) {
    const raw = value[key].trim(),
      n = Number(raw.replace(",", "."));
    if (
      !raw ||
      !Number.isFinite(n) ||
      n < 0 ||
      n > (key === "kcal" ? 900 : 100)
    )
      invalid.push(ro.result.nutrients[key].toLowerCase());
  }
  return invalid;
}
export function reviewError(value: Review) {
  const fields = invalidFields(value);
  if (fields.length) return `Verifică: ${fields.join(", ")}.`;
  if (Number(value.sat.replace(",", ".")) > Number(value.fat.replace(",", ".")))
    return ro.app.design.saturatedError;
  return "";
}
export function validateReview(value: Review) {
  return !reviewError(value);
}
export function previewScore(n: Nutrients): ScoreResult {
  const value = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          Math.min((n.sugar ?? 0) * 2.2, 40) -
          (n.sat ?? 0) * 2 -
          (n.salt ?? 0) * 20 -
          (n.kcal ?? 0) * 0.01 +
          (n.fiber ?? 0) * 1.5 +
          (n.protein ?? 0),
      ),
    ),
  );
  const reasons: ScoreResult["reasons"] = [];
  if ((n.sugar ?? 0) > 22.5)
    reasons.push({
      tone: "bad",
      title: "Mult zahăr",
      detail: `${formatAmount(n.sugar!)} g la 100 g, peste pragul de 22,5 g considerat ridicat.`,
    });
  if ((n.sat ?? 0) > 5)
    reasons.push({
      tone: "bad",
      title: "Grăsimi saturate ridicate",
      detail: `${formatAmount(n.sat!)} g la 100 g, peste pragul de 5 g.`,
    });
  if ((n.salt ?? 0) > 1.5)
    reasons.push({
      tone: "bad",
      title: "Multă sare",
      detail: `${formatAmount(n.salt!)} g la 100 g, peste pragul de 1,5 g.`,
    });
  if ((n.fiber ?? 0) >= 3)
    reasons.push({
      tone: "good",
      title: (n.fiber ?? 0) >= 6 ? "Bogat în fibre" : "Sursă de fibre",
      detail: `${formatAmount(n.fiber!)} g la 100 g.`,
    });
  if ((n.kcal ?? 0) > 400)
    reasons.push({
      tone: "neutral",
      title: "Densitate energetică mare",
      detail: `${Math.round(n.kcal!)} kcal la 100 g.`,
    });
  if (!reasons.length)
    reasons.push({
      tone: "good",
      title: "Valori moderate",
      detail: "Niciun nutrient nu depășește pragurile de „ridicat”.",
    });
  return {
    score: value,
    letter: null,
    grade: scoreGrade(value),
    reasons: reasons.slice(0, 3),
    missing: [],
  };
}
