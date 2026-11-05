import { ro, plural } from "../../../src/core/constants/strings_ro";
it("exposes the agreed sections and score disclaimer", () => {
  expect(Object.keys(ro)).toEqual([
    "app",
    "nav",
    "home",
    "capture",
    "identify",
    "scan",
    "result",
    "score",
    "ingredients",
    "compare",
    "add",
    "review",
    "history",
    "offline",
    "errors",
    "share",
    "legal",
  ]);
  expect(ro.score.disclaimer).toBe(
    "Calculat la 100 g; nu indică riscul unei boli.",
  );
  expect(JSON.stringify(ro)).not.toMatch(/[şţŞŢ]/);
});
it.each([
  [1, "1 produs"],
  [2, "2 produse"],
  [19, "19 produse"],
  [20, "20 de produse"],
  [101, "101 produse"],
  [120, "120 de produse"],
])("formats %i", (n, s) =>
  expect(plural(n as number, "produs", "produse")).toBe(s),
);
it("names a score without relying on color", () =>
  expect(ro.score.ringLabel(78, "good")).toBe(
    "78 din 100, calitate nutrițională bună",
  ));
