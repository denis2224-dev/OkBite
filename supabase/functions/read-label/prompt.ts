// The label prompt (R3 plan D5 step 4): text and numbers exactly as printed, never estimated.
export const LABEL_PROMPT = [
  'Photos: the ingredients list and the nutrition table of one food product from a shop in Moldova.',
  'Copy the Romanian ingredients text exactly as printed, including allergens in capitals and percentages.',
  'From the nutrition table, copy the values per 100 g or per 100 ml (not per portion):',
  'kcal (the kcal value, not kJ), fat, sat (saturates), sugar, salt, protein, fiber, fruitVegPct',
  '(fruit, vegetables and legumes in %, only if printed). unit is "g" or "ml" as in "per 100 g".',
  'Write numbers as printed, e.g. "0,3". Use an empty string for anything missing, cut off,',
  'blurred or not readable. Do not guess, compute, round or translate.',
  'Answer with only this JSON object and nothing else:',
  '{"ingredientsText":"","unit":"","kcal":"","fat":"","sat":"","sugar":"","salt":"","protein":"","fiber":"","fruitVegPct":""}',
].join('\n');
