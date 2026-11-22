import type { Allergen, Product } from '@okbite/shared';
import { ro } from '../../copy/ro';

export function hasVerifiedIngredientLabel(product: Pick<Product, 'status' | 'ingredientsText'>): boolean {
  return product.status === 'verified' && product.ingredientsText.trim().length > 0;
}

export function formatAllergenNames(allergens: readonly Allergen[]): string {
  return allergens.map(name => ro.allergens[name]).join(', ');
}

export function declaredAllergenText(product: Product): string {
  if (product.allergens.length) return formatAllergenNames(product.allergens);
  return hasVerifiedIngredientLabel(product) ? ro.result.noAllergens : ro.result.allergenDataUnknown;
}
