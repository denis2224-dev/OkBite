// The front-of-pack prompt (R3 plan D4 step 2): what is printed, never guessed.
export const FRONT_PROMPT = [
  'Photo: the front of a food or bottled-water product from a shop in Moldova.',
  'Copy exactly as printed: the brand, the product line/variant name (keep still/sparkling/sport/kids/Iodată/No. qualifiers) and the quantity (e.g. "400 g", "1,5 L"),',
  'and the barcode digits if a barcode is visible and readable.',
  'Set isWater to true if the product is bottled or delivered drinking, mineral, spring, or carbonated water; otherwise false.',
  'For bottled waters, set carbonation to "still", "lightly_sparkling", or "sparkling" ONLY when clearly printed (e.g. plată/necarbogazoasă, slab carbogazoasă, carbogazoasă/gazată); else "".',
  'Use an empty string for anything that is not visible or not readable. Do not guess or translate.',
  'Answer with only this JSON object and nothing else:',
  '{"brand":"","name":"","quantity":"","barcodeDigits":"","isWater":false,"carbonation":""}',
].join('\n');
