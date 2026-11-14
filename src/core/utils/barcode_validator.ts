import { codeValidationError } from "../../../packages/shared/src/ean";
import { ro } from "../constants/strings_ro";

export function barcodeError(value: string): string | null {
  if (!value.trim()) return ro.app.design.manualEmpty;
  const digits = value.replace(/\s/g, "");
  if (digits.length !== 8 && digits.length !== 13) return ro.scan.manualInvalid;
  const reason = codeValidationError(value);
  if (reason === "checksum") return ro.scan.manualChecksum;
  return reason === "format" ? ro.scan.manualInvalid : null;
}
