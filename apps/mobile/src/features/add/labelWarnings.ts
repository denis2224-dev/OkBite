import { LABEL_FIELDS, NUTRIENT_KEYS, type LabelField, type ReadLabelResponse } from '@okbite/shared';

const SCORE_FIELDS: readonly LabelField[] = ['kcal', 'sat', 'sugar', 'salt'];

// Only for local drafts: corrections may change a field after OCR assigned its reason.
export function reconcileLabelReasons(label: ReadLabelResponse): ReadLabelResponse {
  const ingredientsText = label.ingredientsText?.trim() || null;
  if (!label.reasons) return { ...label, ingredientsText };
  const reasons = { ...label.reasons };
  const unclear = new Set(label.unclear);
  for (const field of LABEL_FIELDS) {
    const value = field === 'ingredientsText' ? ingredientsText : label.nutrients[field];
    if (value !== null) {
      reasons[field] = 'read';
      unclear.delete(field);
    } else if (reasons[field] === 'read') {
      reasons[field] = 'unreadable';
      unclear.add(field);
    }
  }
  return { ...label, ingredientsText, reasons, unclear: [...unclear] };
}

export function getUnclearLabelFields(label: Pick<ReadLabelResponse, 'nutrients' | 'unclear'> & {
  reasons?: Partial<Record<string, string>> | null;
}): LabelField[] {
  const anyRead = NUTRIENT_KEYS.some(key => label.nutrients[key] !== null);
  return (['ingredientsText', ...NUTRIENT_KEYS] as LabelField[]).filter(key => {
    const reason = label.reasons?.[key];
    const unreadable = reason ? reason === 'unreadable' : label.unclear.includes(key);
    // A partial table does not establish that missing optional rows were photographed badly.
    return unreadable && (key === 'ingredientsText' || !anyRead || SCORE_FIELDS.includes(key));
  });
}
