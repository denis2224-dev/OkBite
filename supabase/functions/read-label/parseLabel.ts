import { NUTRIENT_KEYS, type NutrientKey, ReadLabelResponse } from '../_shared/contract.ts';
import { parseJsonObject } from '../_lib/claude.ts';

export type LabelRead = Omit<ReadLabelResponse, 'ingredientsPhotoPath' | 'nutritionPhotoPath'>;
type Unclear = LabelRead['unclear'][number];

// Per 100 g/ml no gram value can exceed 100 and no food exceeds 900 kcal (pure fat ≈ 900).
const MAX: Record<NutrientKey, number> = {
  kcal: 900,
  fat: 100,
  sat: 100,
  sugar: 100,
  salt: 100,
  protein: 100,
  fiber: 100,
  fruitVegPct: 100,
};

/** "0,3" / 0.3 → 0.3; blank, "<0,5", words or out-of-range values → null (the shopper fills them). */
function amount(value: unknown, max: number): number | null {
  const text = typeof value === 'number'
    ? String(value)
    : typeof value === 'string'
    ? value.trim()
    : '';
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) return null;
  const n = Number(text.replace(',', '.'));
  return n <= max ? n : null;
}

/** Claude's label read; every blank or unreadable field is null and listed in `unclear`. */
export function parseLabel(raw: string): LabelRead {
  const o = parseJsonObject(raw);
  const unclear: Unclear[] = [];
  const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((key) => {
    const v = amount(o[key], MAX[key]);
    if (v === null) unclear.push(key);
    return [key, v];
  }));
  const text = typeof o.ingredientsText === 'string' ? o.ingredientsText.trim() : '';
  const readable = text.length >= 3 && text.length <= 3000; // never hide a truncated allergen
  if (!readable) unclear.push('ingredientsText');
  const unit = typeof o.unit === 'string' ? o.unit.trim().toLowerCase() : '';
  return ReadLabelResponse.innerType().omit({
    ingredientsPhotoPath: true,
    nutritionPhotoPath: true,
  }).parse({
    ingredientsText: readable ? text : null,
    unit: unit === 'g' || unit === 'ml' ? unit : null,
    nutrients,
    unclear,
  });
}
