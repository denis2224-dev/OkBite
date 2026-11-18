import { StyleSheet, Text, View } from 'react-native';
import type { Tier } from '@okbite/shared';
import { fonts, radii } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { useTheme } from '../../theme/useTheme';
import { tierTone } from '../../theme/tierTones';

/** Compact score for list rows: a small raised tile in the tier tone. Decorative: the row around it reads the score. */
export function ScoreTagSmall({ score, tier }: { score: number; tier: Tier }) {
  const { colors } = useTheme();
  return <View testID="score-tile" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.tile, { backgroundColor: tierTone(tier).fg }]}>
    <Text allowFontScaling style={[styles.number, { color: colors.onPrimary }]}>{score}</Text>
  </View>;
}

const styles = StyleSheet.create({
  tile: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.small, paddingVertical: 4, paddingHorizontal: 8, ...depth.raisedSmall },
  number: { fontFamily: fonts.headingExtra, fontSize: 20, lineHeight: 24 },
});
