import { type FieldReason, type LabelField, NUTRIENT_KEYS, ReadLabelResponse } from '../_shared/contract.ts';
import { normalizeWaterObject } from '../_shared/water/parseWater.ts';
import { parseJsonObject } from '../_lib/claude.ts';

export const WATER_PROMPT = [
  'Photo: the mineral / physicochemical composition and source panel on a bottled or delivered water from Moldova (RO/RU/UA/EN).',
  'Copy values exactly as printed with their unit (e.g. "350-400 mg/l", "7,4", "<0,05 mg/l", "6,5-12 g/l", "80 µg/l").',
  'Fields: tdsMgL (Total mineralization), dryResidueMgL (Dry residue at 180 C), ph,',
  'carbonation ("still" | "lightly_sparkling" | "sparkling"), classification ("drinking" | "natural_mineral" | "table_mineral" | "therapeutic"),',
  'caMgL (Ca2+), mgMgL (Mg2+), naMgL (Na+), kMgL (K+), naPlusKMgL (Na+ + K+ if combined),',
  'hco3MgL (HCO3-), so4MgL (SO4 2-), clMgL (Cl-), fMgL (F-), no3MgL (NO3-),',
  'bMgL (Boron B), h3bo3MgL (Boric / metaboric acid H3BO3), iUgL (Iodine in ug/l or mg/l),',
  'ingredientsText (optional short source/well/ingredients/warning line if printed, else empty).',
  'Use empty string "" for unprinted values and "?" if cut off or blurred. Do not guess or translate.',
  'Answer with only this JSON object and nothing else:',
  JSON.stringify({
    tdsMgL: '', dryResidueMgL: '', ph: '', carbonation: '', classification: '',
    caMgL: '', mgMgL: '', naMgL: '', kMgL: '', naPlusKMgL: '',
    hco3MgL: '', so4MgL: '', clMgL: '', fMgL: '', no3MgL: '',
    bMgL: '', h3bo3MgL: '', iUgL: '', ingredientsText: '',
  }),
].join('\n');

export function parseWaterLabel(raw: string, ingredientsAsked: boolean) {
  const o = parseJsonObject(raw);
  const water = normalizeWaterObject(o);
  const rawText = ingredientsAsked && typeof o.ingredientsText === 'string' ? o.ingredientsText.trim() : '';
  const hasText = rawText.length >= 3 && rawText.length <= 3000;
  const ingredientsText = hasText ? rawText : null;
  const reasons = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, 'not_printed' as const]),
  ) as Record<LabelField, FieldReason>;
  reasons.ingredientsText = !ingredientsAsked ? 'not_photographed' : hasText ? 'read' : 'not_printed';
  const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as Record<
    (typeof NUTRIENT_KEYS)[number],
    null
  >;
  return ReadLabelResponse.innerType().omit({
    ingredientsPhotoPath: true,
    nutritionPhotoPath: true,
  }).required({ reasons: true }).parse({
    ingredientsText,
    unit: 'ml',
    nutrients,
    water,
    unclear: [],
    reasons,
  });
}
