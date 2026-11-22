import { matchProfile, type Product } from '@okbite/shared';
import { StatusToast } from '../../ui';
import { ro } from '../../copy/ro';
import { useProfile } from '../profile';

/** One line under the score answering "is this OK for me?". It says the label is clear only for a
 * team-verified product, and stays quiet when ProfileAllergenAlert already warns at the top. */
export function AllergenSummary({ product }: { product: Product }) {
  const { profile } = useProfile();
  const match = matchProfile(product, profile);
  if (match.allergens.length || match.mayContain.length) return null;
  if (profile.allergens.length > 0 && product.status === 'verified') {
    return <StatusToast testID="allergen-summary" title={ro.result.noProfileAllergens} />;
  }
  if (profile.allergens.length === 0 && product.allergens.length > 0) {
    const names = product.allergens.map(name => ro.allergens[name].toLocaleLowerCase()).join(', ');
    return <StatusToast testID="allergen-summary" variant="neutral" title={ro.result.containsAllergen(names)} />;
  }
  return null;
}
