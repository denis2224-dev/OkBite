import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import type { Tier } from '@okbite/shared';
import { fonts, radii, typeScale } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';

/** The product score as a flat forest tag: the number large, "din 100" small. Every tier uses forest; the tier word
 * beside the tag names it (`tier` stays in the props for callers). It sizes to its text and fades in once unless motion is reduced. */
export function ScoreTag({ score, label, testID }: { score: number; tier: Tier; label: string; testID?: string }) {
  const { colors } = useTheme();
  const [hang] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let live = true;
    // A missing or failing check counts as "reduce motion": the tag then simply stays where it is.
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then(reduced => {
      if (!live || reduced !== false) return;
      hang.setValue(0);
      Animated.timing(hang, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }).catch(() => undefined);
    return () => { live = false; };
  }, [hang]);
  const motion = { opacity: hang, transform: [{ translateY: hang.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] };
  return <Animated.View testID={testID} accessible accessibilityRole="image" accessibilityLabel={label}
    style={[{ alignSelf: 'flex-start' }, motion]}>
    <View testID={testID ? `${testID}-body` : undefined} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: colors.primary, borderRadius: radii.card,
        paddingTop: 8, paddingHorizontal: 16, paddingBottom: 9 }}>
      <Text allowFontScaling style={{ fontFamily: fonts.headingExtra, ...typeScale.score, color: colors.onPrimary }}>{score}</Text>
      <Text allowFontScaling style={{ fontFamily: fonts.medium, ...typeScale.caption, color: colors.onPrimary }}>{ro.score.outOf}</Text>
    </View>
  </Animated.View>;
}
