import { ALLERGENS, type Allergen } from '../contract';
import { SYNONYMS } from './synonyms';

// A trace clause runs from the marker to the next ".", ";", line break or "ingrediente".
const TRACES = /(poate cont(s)?ine|urme de)(?:(?!ingrediente)[^.;\n])*/g;

/** Allergens in an ingredients text; "poate conține …" / "urme de …" clauses go to mayContain. */
export function detectAllergens(text: string): { allergens: Allergen[]; mayContain: Allergen[] } {
  const plain = toPlain(text);
  const traces = (plain.match(TRACES) ?? []).join(' ');
  const rest = plain.replace(TRACES, ' ');
  const allergens = ALLERGENS.filter((a) => SYNONYMS[a].test(rest));
  const mayContain = ALLERGENS.filter((a) => SYNONYMS[a].test(traces) && !allergens.includes(a));
  return { allergens, mayContain };
}

// ș/ț become "sh"/"ts" so "pește" (fish) stays apart from "peste" (over); other marks are dropped.
function toPlain(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/s[̧̦]/g, 'sh')
    .replace(/t[̧̦]/g, 'ts')
    .replace(/\p{M}/gu, '');
}
