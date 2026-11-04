import { Share } from "react-native";
import {
  shareProduct,
  productShareText,
} from "../../../src/features/share/share_product";
import { foundYogurt } from "../../../src/data/mock/mock_products";
it("shares the product with the public link", async () => {
  const send = jest.spyOn(Share, "share").mockResolvedValueOnce({
    action: Share.sharedAction,
    activityType: undefined,
  });
  await shareProduct(foundYogurt.product, foundYogurt.score);
  expect(send).toHaveBeenCalledWith({
    message:
      "Iaurt natural 2,5% (Livada Verde): 78 din 100 pe okBite\nhttps://okbite.md/product/" +
      foundYogurt.product.id,
  });
  send.mockRestore();
});
it("does not invent a score when it is unavailable", () => {
  expect(
    productShareText(foundYogurt.product, {
      ...foundYogurt.score,
      score: null,
    }),
  ).toContain("Scor indisponibil");
  expect(
    productShareText(foundYogurt.product, {
      ...foundYogurt.score,
      score: null,
    }),
  ).not.toContain("null");
});
