import {
  start,
  next,
  validateReview,
  reviewError,
  previewScore,
} from "../../../src/features/capture/capture_controller";
import { mockOcr, ocrFor } from "../../../src/data/mock/mock_ocr";
it("takes exactly two photos before extracted text", () => {
  expect(start().step).toBe("ingredientsPhoto");
  expect(next(start(), "photo").step).toBe("nutritionPhoto");
  expect(next(next(start(), "photo"), "photo").step).toBe("review");
});
it("keeps unknown products on the add path", () => {
  let flow = next(start(), "unknown");
  expect(flow.step).toBe("notFound");
  flow = next(flow, "add");
  expect(flow.step).toBe("ingredientsPhoto");
});
it("validates all seven values, unclear ingredients, and saturated fat", () => {
  expect(validateReview(mockOcr)).toBe(true);
  expect(reviewError({ ...mockOcr, sugar: "" })).toBe("Verifică: zaharuri.");
  expect(reviewError({ ...mockOcr, fiber: "-1" })).toBe("Verifică: fibre.");
  expect(reviewError({ ...mockOcr, sat: "31" })).toBe(
    "Grăsimile saturate nu pot depăși grăsimile totale.",
  );
  expect(validateReview(ocrFor(true))).toBe(false);
});
it("calculates the reference score for a corrected photographed label", () => {
  const result = previewScore({
    kcal: 530,
    fat: 30,
    sat: 14,
    sugar: 35,
    salt: 0.3,
    protein: 6,
    fiber: 2,
    fruitVegPct: null,
  });
  expect(result.score).toBe(30);
  expect(result.grade).toBe("low");
  expect(result.reasons).toHaveLength(3);
});
