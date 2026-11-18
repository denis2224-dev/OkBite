import { View } from 'react-native';
import { matchProfile, type Product } from '@okbite/shared';
import { Body, Icon } from '../../ui';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { useProfile } from '../profile';
import { depth } from '../../theme/depth';

/** A pressed sage info pill under the score answering "is this OK for me?". It says the label is clear only for a
 * team-verified product, and stays quiet when ProfileAllergenAlert already warns at the top. */
export function AllergenSummary({ product }: { product: Product }) {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const match = matchProfile(product, profile);
  if (match.allergens.length || match.mayContain.length) return null;
  let row: { text: string; icon: 'check' | 'info' } | null = null;
  if (profile.allergens.length > 0 && product.status === 'verified') {
    row = { text: ro.result.noProfileAllergens, icon: 'check' };
  } else if (profile.allergens.length === 0 && product.allergens.length > 0) {
    const names = product.allergens.map(name => ro.allergens[name].toLocaleLowerCase()).join(', ');
    row = { text: ro.result.containsAllergen(names), icon: 'info' };
  }
  if (!row) return null;
  return <View testID="allergen-summary" accessible accessibilityRole="text" accessibilityLabel={row.text}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radii.small, ...depth.pressed }}>
    <Icon name={row.icon} size={22} color={colors.primary} />
    <Body style={{ flex: 1, color: colors.primary, fontFamily: fonts.bold }}>{row.text}</Body>
  </View>;
}
