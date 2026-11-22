import { Text, View } from 'react-native';
import type { Tier } from '@okbite/shared';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { tierTone } from '../theme/tierTones';

/** 50 pt grade tile for list rows; a dash on the track colour when there is no score. Decorative: the row reads the score. */
export function GradeSquare({ score, tier, testID }: { score: number | null; tier: Tier | null; testID?: string }) {
  const { colors } = useTheme();
  const tone = score !== null && tier ? tierTone(tier) : null;
  return <View testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: 50, height: 50, borderRadius: radii.listBadge, alignItems: 'center', justifyContent: 'center', backgroundColor: tone ? tone.fill : colors.track }}>
    <Text allowFontScaling={false} style={{ fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: tone ? tone.onFill : colors.textSecondary }}>{tone ? score : '—'}</Text>
  </View>;
}
