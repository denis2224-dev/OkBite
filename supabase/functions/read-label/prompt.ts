// The label prompt (R3 plan D5 step 4, U3 modes): text and numbers exactly as printed, never estimated.
import { NUTRIENT_KEYS } from '../_shared/contract.ts';

// Only the parts the shopper photographed are asked for, so the model never fills the others.
export function labelPrompt(ask: { ingredients: boolean; nutrition: boolean }): string {
  const lines = [
    `Photos: ${
      [ask.ingredients && 'the ingredients list', ask.nutrition && 'the nutrition table'].filter(
        Boolean,
      ).join(' and ')
    } of one food product from a shop in Moldova.`,
  ];
  const fields: Record<string, string | boolean> = {};
  if (ask.ingredients) {
    lines.push(
      'Copy the Romanian ingredients text exactly as printed, including allergens in capitals and percentages.',
    );
    fields.ingredientsText = '';
  }
  if (ask.nutrition) {
    lines.push(
      'From the nutrition table, copy the values per 100 g or per 100 ml (not per portion):',
      'kcal (the kcal value, not kJ), fat, sat (saturates), sugar, salt, protein, fiber, fruitVegPct',
      '(fruit, vegetables and legumes in %). unit is "g" or "ml" as in "per 100 g".',
      'Copy each cell as printed with its unit as a JSON string, e.g. "0,3 g" or "0 g". Write "0 g" only where the label prints 0.',
      'Use an empty string for a row the label does not print, and "?" for a row that is printed but',
      'cut off, blurred or not readable. Never write 0 for a missing or unreadable row.',
      'If the table gives values only per portion, set perPortionOnly to true and leave every value empty.',
    );
    Object.assign(fields, { unit: '', perPortionOnly: false });
    for (const key of NUTRIENT_KEYS) fields[key] = '';
  }
  lines.push(
    'Do not guess, compute, round or translate.',
    'Answer with only this JSON object and nothing else:',
    JSON.stringify(fields),
  );
  return lines.join('\n');
}
