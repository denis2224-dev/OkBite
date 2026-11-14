/** Returns a valid EAN-8 or EAN-13 (UPC-A becomes EAN-13 with a leading 0), or null. */
export function normalizeCode(raw: string): string | null {
  if (codeValidationError(raw)) return null;
  const digits = raw.replace(/\s/g, '');
  return digits.length === 12 ? `0${digits}` : digits;
}

/** Distinguishes malformed input from an incorrect GS1 check digit. */
export function codeValidationError(raw: string): 'format' | 'checksum' | null {
  const digits = raw.replace(/\s/g, '');
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(digits)) return 'format';
  const code = digits.length === 12 ? `0${digits}` : digits;
  return hasValidCheckDigit(code) ? null : 'checksum';
}

// GS1 check digit: weights 3,1,3,… from the rightmost data digit.
function hasValidCheckDigit(code: string): boolean {
  const data = code.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Number(data[data.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}
