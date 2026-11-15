import { barcodeError } from "../../../src/core/utils/barcode_validator";

it.each(["96385074", "4840001000014", " 4840001 000014 "])("accepts valid code %s", (code) => {
  expect(barcodeError(code)).toBeNull();
});
it.each(["12345", "abc", "9638507x", "036000291452"])("reports invalid format for %s", (code) => {
  expect(barcodeError(code)).toBe("Codul trebuie să aibă 8 sau 13 cifre.");
});
it.each(["4840022010013", "5449000000997", "96385075"])("reports invalid checksum for %s", (code) => {
  expect(barcodeError(code)).toBe("Codul nu pare valid. Verifică cifrele.");
});
it("asks for digits for blank input", () => {
  expect(barcodeError("  ")).toBe("Introdu cifrele de sub codul de bare.");
});
