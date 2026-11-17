import { Text, View } from 'react-native';
import type { Letter } from '@okbite/shared';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { fonts } from '../../theme/tokens';
import { ro } from '../../copy/ro';

const letters: Letter[] = ['A', 'B', 'C', 'D', 'E'];

/** Our own thin A–E bar; this does not reproduce the official logo artwork. The current letter is filled, outlined and named.
 * `showLetter` (score hero): the current segment is taller and prints its letter instead of the outline. */
export function NutriScoreScale({ letter, showLetter = false }: { letter: Letter | null; showLetter?: boolean }) {
  const { colors } = useTheme();
  const tones = letterTones;
  if (letter === null) return null;
  return <View accessible accessibilityRole="image" accessibilityLabel={`${ro.tiers.nutriScore}: ${letter}`}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 14 }}>
    {letters.map(value => {
      const selected = value === letter;
      const named = selected && showLetter;
      return <View key={value} testID={`nutri-score-${value}`} style={{ flex: 1, height: named ? 22 : selected ? 14 : 8, borderRadius: named ? 8 : 7, justifyContent: 'center',
        backgroundColor: selected ? tones[value].fg : tones[value].bg, borderWidth: selected && !named ? 2 : 0, borderColor: selected && !named ? colors.ink : colors.transparent }}>
        {named && <Text accessibilityElementsHidden importantForAccessibility="no" allowFontScaling={false}
          style={{ fontFamily: fonts.bold, fontSize: 13, lineHeight: 22, color: tones.onSelected, textAlign: 'center' }}>{value}</Text>}
      </View>;
    })}
  </View>;
}
