import { FrontRead, inferFrontWaterMeta, normalizeCode, parseWaterCarbonation } from '../_shared/index.ts';
import { parseJsonObject } from '../_lib/claude.ts';

const field = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim()
    ? value.trim().replace(/\s+/g, ' ').slice(0, max)
    : null;

/** Claude's front read; a barcode counts only when its checksum is valid (R3 review focus). */
export function parseFront(raw: string): FrontRead {
  const o = parseJsonObject(raw);
  const digits = typeof o.barcodeDigits === 'string' ? o.barcodeDigits : '';
  const brand = field(o.brand, 80);
  const name = field(o.name, 120);
  const parsedCarbonation = typeof o.carbonation === 'string' && o.carbonation.trim()
    ? parseWaterCarbonation(o.carbonation)
    : null;
  const { isWater, carbonation } = inferFrontWaterMeta({
    brand,
    name,
    isWater: o.isWater === true,
    carbonation: parsedCarbonation,
  });
  return FrontRead.parse({
    brand,
    name,
    quantity: field(o.quantity, 30),
    code: digits ? normalizeCode(digits) : null,
    ...(isWater ? { isWater: true } : {}),
    ...(carbonation ? { carbonation } : {}),
  });
}
