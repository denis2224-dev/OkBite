import { ro } from "../constants/strings_ro";
export function barcodeError(value: string): string | null {
  return /^(\d{8}|\d{13})$/.test(value) ? null : ro.scan.manualInvalid;
}
