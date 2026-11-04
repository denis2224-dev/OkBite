import { LookupResponse, AddProductRequest } from "@okbite/shared";
import records from "./preview-data.json";
export const previewEntries = records
  .map((entry) => LookupResponse.parse({ status: "found", ...entry }))
  .filter(
    (entry): entry is Extract<LookupResponse, { status: "found" }> =>
      entry.status === "found",
  );
export const foundYogurt = previewEntries[0]!;
export const validAdd = AddProductRequest.parse({
  code: null,
  name: "Biscuiți",
  brand: "Exemplu",
  quantity: "200 g",
  unit: "g",
  categorySlug: "biscuiti",
  ingredientsText: "făină, zahăr",
  nutrients: foundYogurt.product.nutrients,
  photoPath: null,
  ingredientsPhotoPath: "demo/i.jpg",
  nutritionPhotoPath: null,
});
