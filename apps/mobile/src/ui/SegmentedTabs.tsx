import { Text, View } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export type SegmentTab = { key: string; label: string };

/** Equal-width tabs in a surface container; the selected one is a primary pill. All tabs keep the same size and weight. */
export function SegmentedTabs({ tabs, index, onChange }: { tabs: SegmentTab[]; index: number; onChange: (index: number) => void }) {
  const { colors } = useTheme();
  return <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 5, borderRadius: radii.segment, backgroundColor: colors.surface, gap: 4 }}>
    {tabs.map((tab, i) => {
      const selected = i === index;
      return <PressableOpacity key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected }} onPress={() => onChange(i)}
        style={{ flex: 1, minHeight: 44, borderRadius: radii.segmentTab, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: selected ? colors.primary : colors.transparent }}>
        <Text allowFontScaling numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: selected ? colors.onPrimary : colors.textSecondary }}>{tab.label}</Text>
      </PressableOpacity>;
    })}
  </View>;
}
