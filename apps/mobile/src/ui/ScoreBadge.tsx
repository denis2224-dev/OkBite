import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import type { Tier } from '@okbite/shared';
import { fonts, radii, shadows, typeScale } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { tierTone } from '../theme/tierTones';
import { ro } from '../copy/ro';

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** Primary score badge ("86 din 100") with the tier word beside it. The number is final at once; the badge swings in once
 * unless the phone asks for reduced motion (a missing or failing check counts as reduced). */
export function ScoreBadge({ score, tier, label, testID }: { score: number; tier: Tier; label: string; testID?: string }) {
  const { colors } = useTheme();
  const [hang] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let live = true;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then(reduced => {
      if (!live || reduced !== false) return;
      hang.setValue(0);
      Animated.timing(hang, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }).catch(() => undefined);
    return () => { live = false; };
  }, [hang]);
  const motion = { opacity: hang, transform: [{ translateX: hang.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }, { rotate: hang.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) }] };
  return <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 8 }}>
    <Animated.View testID={testID ? `${testID}-box` : undefined} {...hidden} style={[{ flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: colors.primary, borderRadius: radii.badge, paddingVertical: 12, paddingHorizontal: 18, boxShadow: shadows.primaryGlow }, motion]}>
      <Text allowFontScaling style={{ fontFamily: fonts.medium, ...typeScale.score, color: colors.onPrimary }}>{score}</Text>
      <Text allowFontScaling style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.onPrimary }}>{ro.score.outOf}</Text>
    </Animated.View>
    <Text {...hidden} allowFontScaling style={{ fontFamily: fonts.medium, fontSize: 22, lineHeight: 28, color: tierTone(tier).word }}>{ro.tiers[tier]}</Text>
  </View>;
}
