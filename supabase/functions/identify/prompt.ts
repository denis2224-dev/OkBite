// The front-of-pack prompt (R3 plan D4 step 2): what is printed, never guessed.
export const FRONT_PROMPT = [
  'Photo: the front of a food product from a shop in Moldova.',
  'Copy exactly as printed: the brand, the product name and the quantity (e.g. "400 g"),',
  'and the barcode digits if a barcode is visible and readable.',
  'Use an empty string for anything that is not visible or not readable. Do not guess or translate.',
  'Answer with only this JSON object and nothing else:',
  '{"brand":"","name":"","quantity":"","barcodeDigits":""}',
].join('\n');
