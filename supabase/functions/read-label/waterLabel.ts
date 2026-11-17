import { type FieldReason, type LabelField, NUTRIENT_KEYS, ReadLabelResponse } from '../_shared/contract.ts';
import { normalizeWaterObject } from '../_shared/water/parseWater.ts';
import { parseJsonObject } from '../_lib/claude.ts';

export const WATER_PROMPT = [
  'Photo: the mineral, physicochemical composition, source, or HG Nr. 934/2007 laboratory report panel on a bottled or delivered water from Moldova (RO/RU/UA/EN).',
  'Values may appear either in a table OR in prose under a shared unit header such as "(mg/l)" (for example "reziduu sec solubil 390, NO2-0,23, NO3-6,4, Ca2 + 14,0, Mg2 + 42,6").',
  'Copy ONLY the numeric measurement and its printed unit (e.g. "350-400 mg/l", "7,4", "<0,05 mg/l", "6,5-12 g/l", "80 µg/l"). Strip ion charges printed next to numbers: e.g. "Ca2 + 14,0" -> "14,0", "Mg2 + 42,6" -> "42,6", "NO3-6,4" -> "6,4".',
  'Fields: tdsMgL (Total mineralization), dryResidueMgL (Dry residue / "reziduu sec" / "reziduu sec solubil" / "сухой остаток"), ph,',
  'carbonation ("still" | "lightly_sparkling" | "sparkling"), classification ("drinking" | "natural_mineral" | "table_mineral" | "therapeutic" — use "drinking" when label states apă potabilă / HG 934),',
  'caMgL (Ca2+), mgMgL (Mg2+), naMgL (Na+), kMgL (K+), naPlusKMgL (Na+ + K+ if combined),',
  'hco3MgL (HCO3-), so4MgL (SO4 2- only — NEVER copy SO2- into so4MgL), clMgL (Cl-), fMgL (F-), no3MgL (NO3- nitrate only — NEVER copy NO2- nitrite into no3MgL),',
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
