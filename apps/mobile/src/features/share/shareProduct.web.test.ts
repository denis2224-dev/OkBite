import { shareProduct } from "./shareProduct.web";
import { foundYogurt } from "../../test/fixtures";
it("copies the public link when browser sharing is unavailable", async () => {
  const writeText = jest.fn(async () => {});
  Object.defineProperty(global, "navigator", {
    value: { clipboard: { writeText } },
    configurable: true,
  });
  expect(await shareProduct(foundYogurt.product, foundYogurt.score)).toBe(
    "copied",
  );
  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining("https://okbite.md/product/"),
  );
});
it("treats dismissing the share sheet as cancellation", async () => {
  Object.defineProperty(global, "navigator", {
    value: {
      share: async () => {
        throw Object.assign(new Error("cancelled"), { name: "AbortError" });
      },
    },
    configurable: true,
  });
  expect(await shareProduct(foundYogurt.product, foundYogurt.score)).toBe(
    "cancelled",
  );
});
