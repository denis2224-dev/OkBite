import { View } from 'react-native';
import type { Letter } from '@okbite/shared';
import { Body } from '../../ui/Typography';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { letterTones } from '../../theme/letterTones';
import { ro } from '../../copy/ro';

const letters: Letter[] = ['A', 'B', 'C', 'D', 'E'];

/** Our own letter tiles; this does not reproduce the official logo artwork. */
export function NutriScoreScale({ letter }: { letter: Letter | null }) {
  const { isDark } = useTheme();
  const tones = isDark ? letterTones.dark : letterTones.light;
  if (letter === null) return null;
  return <View accessible accessibilityRole="image" accessibilityLabel={`${ro.tiers.nutriScore}: ${letter}`} style={{ gap: 8, maxWidth: '100%' }}>
    <Body style={{ fontFamily: fonts.bold, textAlign: 'center' }}>{ro.tiers.nutriScore}</Body>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
      {letters.map(value => {
        const selected = value === letter;
        const tone = tones[value];
        return <View key={value} testID={`nutri-score-${value}`} style={{ minWidth: selected ? 44 : 34, minHeight: selected ? 48 : 36, paddingHorizontal: 8,
          justifyContent: 'center', borderRadius: selected ? 12 : 8, backgroundColor: selected ? tone.fg : tone.bg }}>
          <Body style={{ textAlign: 'center', fontFamily: selected ? fonts.heading : fonts.bold, color: selected ? tones.onSelected : tone.fg,
            fontSize: selected ? 24 : 16, lineHeight: selected ? 30 : 22 }}>{value}</Body>
        </View>;
      })}
    </View>
  </View>;
}
