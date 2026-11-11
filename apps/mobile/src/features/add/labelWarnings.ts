import { NUTRIENT_KEYS, type LabelField, type ReadLabelResponse } from '@okbite/shared';

const SCORE_FIELDS: readonly LabelField[] = ['kcal', 'sat', 'sugar', 'salt'];

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
