import { barcodeError } from "../../../src/core/utils/barcode_validator";
import { ro } from "../../../src/core/constants/strings_ro";
it("accepts only eight or thirteen digits", () => {
  expect(barcodeError("96385074")).toBeNull();
  expect(barcodeError("4840001000014")).toBeNull();
  expect(barcodeError("")).toBe(ro.scan.manualInvalid);
  expect(barcodeError("123456789012")).toBe(ro.scan.manualInvalid);
  expect(barcodeError("abcdefgh")).toBe(ro.scan.manualInvalid);
});
