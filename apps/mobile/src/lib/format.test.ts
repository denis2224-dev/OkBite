import { formatAmount } from "./format";
it.each([
  [13.2, "13,2"],
  [0.1, "0,1"],
  [478, "478"],
  [2.56, "2,6"],
  [4, "4"],
])("formats %s", (n, s) => expect(formatAmount(n as number)).toBe(s));
it("preserves zeros in whole numbers", () =>
  expect(formatAmount(100)).toBe("100"));
