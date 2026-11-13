import { View } from 'react-native';
import type { Allergen } from '@okbite/shared';
import { Body } from './Typography';
import { useTheme } from '../theme/useTheme';
import { fonts } from '../theme/tokens';
import { ro } from '../copy/ro';
import { Icon } from './Icon';

/** `contains` is a declared allergen; `trace` is a "may contain" warning and reads softer. */
export function AllergenChip({ name, tone = 'contains' }: { name: Allergen; tone?: 'contains' | 'trace' }) {
  const { colors } = useTheme();
  const trace = tone === 'trace';
  const color = trace ? colors.warning : colors.low;
  const label = ro.allergens[name];
  return <View accessible accessibilityLabel={trace ? `${ro.result.mayContain} ${label}` : label}
    style={{ maxWidth: '100%', flexShrink: 1, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
      backgroundColor: trace ? colors.warningBg : colors.lowBg, borderWidth: trace ? 1 : 0, borderColor: trace ? colors.warningBorder : colors.transparent }}>
    <Icon name={trace ? 'info' : 'alert'} size={16} color={color} />
    <Body style={{ flexShrink: 1, color, fontFamily: trace ? fonts.medium : fonts.bold }}>{label}</Body>
  </View>;
}
