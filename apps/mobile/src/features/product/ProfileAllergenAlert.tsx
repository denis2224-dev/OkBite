import { View } from 'react-native';
import { matchProfile, type Allergen, type Product } from '@okbite/shared';
import { Body, Icon, type IconName } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { useProfile } from '../profile';

type Row = { key: 'contains' | 'trace' | 'avoid'; title: string; sub: string; trace: boolean; icon: IconName };

/** Warns first when the product hits the allergens or avoid list saved on this phone. Never guesses. */
export function ProfileAllergenAlert({ product }: { product: Product }) {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const match = matchProfile(product, profile);
  const names = (items: Allergen[]) => items.map(item => ro.allergens[item].toLocaleLowerCase()).join(', ');
  const rows: Row[] = [];
  if (match.allergens.length) rows.push({ key: 'contains', title: ro.result.containsAllergen(names(match.allergens)), sub: ro.result.profileAlertSub, trace: false, icon: 'alert' });
  if (match.mayContain.length) rows.push({ key: 'trace', title: ro.result.mayContainAllergen(names(match.mayContain)), sub: ro.result.profileAlertSub, trace: true, icon: 'info' });
  if (match.avoid.length) rows.push({ key: 'avoid', title: ro.result.profileAvoid, sub: match.avoid.map(item => ro.profile[item.key]).join(', '), trace: true, icon: 'alert' });
  if (!rows.length && !match.unknown.length) return null;
  return <View style={{ gap: 8 }}>
    {rows.length > 0 && <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite"
      accessibilityLabel={rows.map(row => `${row.title}. ${row.sub}`).join('. ')} style={{ gap: 8 }}>
      {rows.map(row => {
        const color = row.trace ? colors.warning : colors.low;
        return <View key={row.key} testID={`profile-alert-${row.key}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16,
          backgroundColor: row.trace ? colors.warningBg : colors.lowBg, borderWidth: 1, borderColor: row.trace ? colors.warningBorder : colors.lowBg }}>
          <Icon name={row.icon} size={26} color={color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Body style={{ color, fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 }}>{row.title}</Body>
            <Body style={{ color }}>{row.sub}</Body>
          </View>
        </View>;
      })}
    </View>}
    {match.unknown.length > 0 && <Body style={{ color: colors.muted }}>{ro.result.profileUnknown}</Body>}
  </View>;
}
