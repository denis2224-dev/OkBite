import { Text, View, type PressableProps } from 'react-native';
import type { Tier } from '@okbite/shared';
import { PressableOpacity } from '../shared/PressableOpacity';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GradeSquare } from './GradeSquare';
import { Icon } from './Icon';

type Props = Pick<PressableProps, 'onPress' | 'onLongPress' | 'disabled' | 'accessibilityActions' | 'onAccessibilityAction'> & {
  title: string; score: number | null; tier: Tier | null; label: string; first?: boolean; testID?: string;
  /** Profile allergens the product declares, shown under the title. */
  warning?: string;
  /** A short muted line under the title, e.g. a water range or "Scor indisponibil". */
  note?: string;
};

/** Grade square, title, chevron. Tier and date stay in `label` (read aloud), not on screen. */
export function ListRow({ title, score, tier, label, first = false, testID, warning, note, ...press }: Props) {
  const { colors } = useTheme();
  return <PressableOpacity {...press} testID={testID} accessibilityRole="button" accessibilityLabel={label}
    style={{ minHeight: 72, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }}>
    <GradeSquare score={score} tier={tier} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text allowFontScaling style={{ fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink }}>{title}</Text>
      {note ? <Text allowFontScaling style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted }}>{note}</Text> : null}
      {warning ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name="alert" size={16} color={colors.dangerText} />
        <Text allowFontScaling style={{ flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.dangerText }}>{warning}</Text>
      </View> : null}
    </View>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="chevron" size={18} color={colors.muted} /></View>
  </PressableOpacity>;
}
