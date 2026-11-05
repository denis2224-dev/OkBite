import { expect, it } from 'vitest';
import { hasNonNutritiveSweetener } from './sweeteners';

it.each([
  'apă, îndulcitori: aspartam, acesulfam K', 'îndulcitori (E950, E955)', 'E 951', 'e-952',
  'ciclamat de sodiu', 'zaharină', 'SUCRALOZĂ', 'glicozide de steviol', 'extract de stevia', 'E960a',
  'neohesperidină DC', 'taumatină', 'neotam', 'advantam', 'E962',
])('%s → sweetener', (text) => expect(hasNonNutritiveSweetener(text)).toBe(true));

// Sugars and sugar alcohols are not non-nutritive sweeteners (report Table 2).
it.each([
  'zahăr, sirop de glucoză-fructoză', 'eritritol (E968)', 'sorbitol, E420', 'xilitol E967', 'maltitol',
  'E960b', 'E9500', 'zahar', '',
  'apă, glicozide de steviol produse enzimatic (E960c)', 'rebaudiozidă M (E960b)', 'glicozide de steviol produse enzimatic',
])('%s → none', (text) => expect(hasNonNutritiveSweetener(text)).toBe(false));
