import { ro } from "../constants/strings_ro";
export function barcodeError(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return ro.app.design.manualEmpty;
  return digits.length === 8 || digits.length === 13
    ? null
    : `Codul trebuie să aibă 8 sau 13 cifre. Ai introdus ${digits.length}.`;
}
