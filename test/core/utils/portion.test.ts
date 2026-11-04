import {
  perPortion,
  percentOfReference,
  teaspoons,
} from "../../../src/core/utils/portion";
it("scales nutrients to the chosen portion", () =>
  expect(perPortion(13.2, 150)).toBeCloseTo(19.8));
it("calculates the reference percentage", () =>
  expect(percentOfReference("sat", 2.4)).toBe(12));
it("rounds sugar to half-teaspoons", () => {
  expect(teaspoons(19.8)).toBe("5 lingurițe");
  expect(teaspoons(1.5)).toBe("jumătate de linguriță");
  expect(teaspoons(2)).toBe("jumătate de linguriță");
});
