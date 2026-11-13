import { View } from 'react-native';
import type { Letter } from '@okbite/shared';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { ro } from '../../copy/ro';

const letters: Letter[] = ['A', 'B', 'C', 'D', 'E'];

/** Our own thin A–E bar; this does not reproduce the official logo artwork. The current letter is filled, outlined and named. */
export function NutriScoreScale({ letter }: { letter: Letter | null }) {
  const { colors } = useTheme();
  const tones = letterTones;
  if (letter === null) return null;
  return <View accessible accessibilityRole="image" accessibilityLabel={`${ro.tiers.nutriScore}: ${letter}`}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 14 }}>
    {letters.map(value => {
      const selected = value === letter;
      return <View key={value} testID={`nutri-score-${value}`} style={{ flex: 1, height: selected ? 14 : 8, borderRadius: 7,
        backgroundColor: selected ? tones[value].fg : tones[value].bg, borderWidth: selected ? 2 : 0, borderColor: selected ? colors.ink : colors.transparent }} />;
    })}
  </View>;
}
