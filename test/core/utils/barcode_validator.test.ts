import { barcodeError } from "../../../src/core/utils/barcode_validator";
it("accepts eight or thirteen digits and reports exact input errors", () => {
  expect(barcodeError("96385074")).toBeNull();
  expect(barcodeError("4840001000017")).toBeNull();
  expect(barcodeError("")).toBe("Introdu cifrele de sub codul de bare.");
  expect(barcodeError("123456789012")).toBe(
    "Codul trebuie să aibă 8 sau 13 cifre. Ai introdus 12.",
  );
  expect(barcodeError("abcdefgh")).toBe(
    "Introdu cifrele de sub codul de bare.",
  );
});
