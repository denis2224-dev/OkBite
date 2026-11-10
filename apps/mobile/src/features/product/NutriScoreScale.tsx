import { View } from 'react-native';
import type { Letter } from '@okbite/shared';
import { Body } from '../../ui/Typography';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';

/** Our own letter tiles; this does not reproduce the official logo artwork. */
export function NutriScoreScale({ letter }: { letter: Letter | null }) {
  const { colors } = useTheme();
  if (letter === null) return null;
  const tones = { A: 'good', B: 'good', C: 'medium', D: 'low', E: 'low' } as const;
  return <View accessible accessibilityRole="image" accessibilityLabel={`${ro.tiers.nutriScore}: ${letter}`} style={{ gap: 8, maxWidth: '100%' }}>
    <Body style={{ fontWeight: '700', textAlign: 'center' }}>{ro.tiers.nutriScore}</Body>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
      {(Object.keys(tones) as Letter[]).map(value => {
        const selected = value === letter;
        const tone = tones[value];
        return <View key={value} testID={`nutri-score-${value}`} style={{ minWidth: 36, paddingHorizontal: 8, paddingVertical: 6,
          borderRadius: 8, backgroundColor: colors[`${tone}Bg`], borderWidth: 2, borderColor: selected ? colors[tone] : colors.transparent }}>
          <Body style={{ textAlign: 'center', fontWeight: selected ? '800' : '500', color: colors[tone], fontSize: selected ? 22 : 18 }}>{value}</Body>
        </View>;
      })}
    </View>
  </View>;
}
