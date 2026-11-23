import { View } from 'react-native';
import { matchProfile, type Product } from '@okbite/shared';
import { Body, Caption, Icon } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { useProfile } from '../profile';
import { declaredAllergenText, formatAllergenNames, hasVerifiedIngredientLabel } from './allergenLabel';

/** Summarizes the label under the score. ProfileAllergenAlert shows matches above the score. */
export function AllergenSummary({ product }: { product: Product }) {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const match = matchProfile(product, profile);
  const hasProfileAllergens = profile.allergens.length > 0;
  const hasDeclaredAllergens = product.allergens.length > 0;
  const showClearance = hasProfileAllergens && !match.allergens.length && !match.mayContain.length
    && hasVerifiedIngredientLabel(product);
  const showDeclaration = !hasProfileAllergens && hasDeclaredAllergens;
  const summary = showClearance
    ? ro.result.noProfileAllergens
    : showDeclaration ? ro.result.containsAllergen(formatAllergenNames(product.allergens).toLocaleLowerCase()) : null;

  return <View style={{ gap: 8 }}>
    {summary && <View testID="allergen-summary" accessible accessibilityRole="text" accessibilityLabel={summary}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.goodBg }}>
      <Icon name={showClearance ? 'check' : 'info'} size={22} color={colors.good} />
      <Body style={{ flex: 1, color: colors.good, fontFamily: fonts.bold }}>{summary}</Body>
    </View>}
    {hasDeclaredAllergens && !showDeclaration && <Body>{ro.result.allergens}: {declaredAllergenText(product)}</Body>}
    {!hasDeclaredAllergens && !showClearance && <Body>{declaredAllergenText(product)}</Body>}
    {product.mayContain.length > 0 && <Body>{ro.result.mayContain} {formatAllergenNames(product.mayContain)}</Body>}
    <Caption>{ro.result.missingAllergenNote}</Caption>
  </View>;
}
