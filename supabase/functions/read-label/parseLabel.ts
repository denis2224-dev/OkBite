import {
  type FieldReason,
  type LabelField,
  NUTRIENT_KEYS,
  type NutrientKey,
  type NutritionMode,
  ReadLabelResponse,
} from '../_shared/contract.ts';
import { parseJsonObject } from '../_lib/claude.ts';

// This server always sends reasons (optional in the contract only for servers without U3).
export type LabelRead =
  & Omit<ReadLabelResponse, 'ingredientsPhotoPath' | 'nutritionPhotoPath' | 'reasons'>
  & {
    reasons: Record<LabelField, FieldReason>;
  };
/** What this call asked the model: the ingredients photo (absent on an enrich read) and the nutrition mode. */
export type LabelAsk = { ingredients: boolean; nutrition: NutritionMode };
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
const UNIT = (key: NutrientKey) => key === 'kcal' ? 'kcal' : key === 'fruitVegPct' ? '%' : 'g';
// Why a nutrient is null when the shopper did not photograph a table.
const NOT_ASKED: Partial<Record<NutritionMode, FieldReason>> = {
  none: 'not_printed',
  skipped: 'not_photographed',
};

/** "0,3" / "0 g" / "250 kcal" / 0.3 → number; blank, "?", "<0,5", "mg", words, out of range → null. */
function amount(value: unknown, key: NutrientKey): number | null {
  // A bare JSON 0 is not a transcription: the prompt asks for printed text, so it is a model default.
  if (value === 0) return null;
  const rawText = typeof value === 'number'
    ? String(value)
    : typeof value === 'string'
    ? value.trim()
    : '';
  const text = key === 'kcal'
    ? rawText.replace(
      /^(?:\d+(?:[.,]\d+)?\s*kj\s*(?:\/|\()?\s*)?(\d+(?:[.,]\d+)?\s*kcal)(?:\s*\)|\s*\/?\s*\d+(?:[.,]\d+)?\s*kj)?$/i,
      '$1',
    )
    : rawText;
  const m = text.match(/^(\d+(?:[.,]\d+)?)\s*([a-z%]*)$/i);
  if (!m || (m[2] && m[2].toLowerCase() !== UNIT(key))) return null; // "20 kcal" is not a fat value
  const n = Number(m[1].replace(',', '.'));
  return n <= MAX[key] ? n : null;
}

// Empty string, null, or dash means "row not printed"; "?" or unparseable text is unreadable.
const UNREAD_CELL = (v: unknown): FieldReason =>
  v === '' || v === null || v === '-' || v === '—' ? 'not_printed' : 'unreadable';

/** Every field null with the given reasons: the AI was not asked, or failed. */
export function emptyRead(ask: LabelAsk, failed: boolean): LabelRead {
  const nutrientReason = NOT_ASKED[ask.nutrition] ?? (failed ? 'failed' : 'unreadable');
  const reasons = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, nutrientReason])) as Record<
    LabelField,
    FieldReason
  >;
  reasons.ingredientsText = ask.ingredients
    ? (failed ? 'failed' : 'unreadable')
    : 'not_photographed';
  return {
    ingredientsText: null,
    unit: null,
    nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as LabelRead['nutrients'],
    unclear: [
      ...(NOT_ASKED[ask.nutrition] ? [] : NUTRIENT_KEYS),
      ...(ask.ingredients ? ['ingredientsText' as const] : []),
    ],
    reasons,
  };
}

/** The model's label read; every requested field that is null is listed in `unclear`, with its reason. */
export function parseLabel(
  raw: string,
  ask: LabelAsk = { ingredients: true, nutrition: 'same_photo' },
): LabelRead {
  const o = parseJsonObject(raw);
  const read = emptyRead(ask, false);
  const unclear: Unclear[] = [];
  if (!NOT_ASKED[ask.nutrition]) {
    const perPortionOnly = o.perPortionOnly === true;
    for (const key of NUTRIENT_KEYS) {
      const v = perPortionOnly ? null : amount(o[key], key);
      read.nutrients[key] = v;
      read.reasons[key] = v !== null ? 'read' : perPortionOnly ? 'no_per_100' : UNREAD_CELL(o[key]);
      if (v === null) unclear.push(key);
    }
    const unitMatch = typeof o.unit === 'string'
      ? o.unit.trim().match(/^(?:(?:per|la)\s+)?(?:100\s*)?(g|ml)$/i)
      : null;
    read.unit = !perPortionOnly && unitMatch ? (unitMatch[1].toLowerCase() as 'g' | 'ml') : null;
  }
  if (ask.ingredients) {
    const text = typeof o.ingredientsText === 'string' ? o.ingredientsText.trim() : '';
    const readable = text.length >= 3 && text.length <= 3000; // never hide a truncated allergen
    read.ingredientsText = readable ? text : null;
    read.reasons.ingredientsText = readable ? 'read' : 'unreadable';
    if (!readable) unclear.push('ingredientsText');
  }
  return ReadLabelResponse.innerType().omit({
    ingredientsPhotoPath: true,
    nutritionPhotoPath: true,
  }).required({ reasons: true }).parse({
    ...read,
    unclear,
  });
}
