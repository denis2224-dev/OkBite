import { ALLERGENS, type Allergen } from '../contract';
import { SYNONYMS } from './synonyms';

const TRACES = /poate contine|urme de/;

/** Allergens in an ingredients text; what follows "poate conține" / "urme de" goes to mayContain. */
export function detectAllergens(text: string): { allergens: Allergen[]; mayContain: Allergen[] } {
  const plain = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cut = plain.search(TRACES);
  const before = cut === -1 ? plain : plain.slice(0, cut);
  const after = cut === -1 ? '' : plain.slice(cut);
  const allergens = ALLERGENS.filter((a) => SYNONYMS[a].test(before));
  const mayContain = ALLERGENS.filter((a) => SYNONYMS[a].test(after) && !allergens.includes(a));
  return { allergens, mayContain };
}
