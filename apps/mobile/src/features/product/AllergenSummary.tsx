import { View } from 'react-native';
import { matchProfile, type Product } from '@okbite/shared';
import { Body, Icon } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { useProfile } from '../profile';

/** One line under the score answering "is this OK for me?". It says the label is clear only for a
 * team-verified product, and stays quiet when ProfileAllergenAlert already warns at the top. */
export function AllergenSummary({ product }: { product: Product }) {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const match = matchProfile(product, profile);
  if (match.allergens.length || match.mayContain.length) return null;
  let row: { text: string; icon: 'check' | 'info'; fg: string; bg: string } | null = null;
  if (profile.allergens.length > 0 && product.status === 'verified') {
    row = { text: ro.result.noProfileAllergens, icon: 'check', fg: colors.good, bg: colors.goodBg };
  } else if (profile.allergens.length === 0 && product.allergens.length > 0) {
    const names = product.allergens.map(name => ro.allergens[name].toLocaleLowerCase()).join(', ');
    row = { text: ro.result.containsAllergen(names), icon: 'info', fg: colors.neutral, bg: colors.neutralBg };
  }
  if (!row) return null;
  return <View testID="allergen-summary" accessible accessibilityRole="text" accessibilityLabel={row.text}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: row.bg }}>
    <Icon name={row.icon} size={22} color={row.fg} />
    <Body style={{ flex: 1, color: row.fg, fontFamily: fonts.bold }}>{row.text}</Body>
  </View>;
}
