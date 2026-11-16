import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Tier } from '@okbite/shared';
import { fonts, typeScale } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { tierTone } from '../../theme/tierTones';
import { ro } from '../../copy/ro';

// The tag's point with its punched hole; evenodd makes the hole a real cut-out on any background.
const POINT = 'M22 0H14L0 30l14 30h8zM16.4 30a3.4 3.4 0 1 0 -6.8 0a3.4 3.4 0 1 0 6.8 0z';

/** The product score as a shelf tag in the tier colour. It sizes to its text and swings in once unless motion is reduced. */
export function ScoreTag({ score, tier, label, testID }: { score: number; tier: Tier; label: string; testID?: string }) {
  const { colors } = useTheme();
  const fg = tierTone(tier).fg;
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
  const motion = {
    opacity: hang,
    transform: [
      { translateX: hang.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
      { rotate: hang.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) },
    ],
  };
  return <Animated.View testID={testID} accessible accessibilityRole="image" accessibilityLabel={label}
    style={[{ flexDirection: 'row', alignItems: 'stretch', alignSelf: 'flex-start' }, motion]}>
    {/* The text in the body sets the tag's height; the point only stretches to it. Its drawing sits in an absolute layer,
        because on iOS and Android a 100%-high SVG in an auto-height row grows the whole tag instead. */}
    <View testID={testID ? `${testID}-point` : undefined} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 22, alignSelf: 'stretch', marginRight: -1 /* overlap: no hairline at the join */ }}>
      <View testID={testID ? `${testID}-point-art` : undefined} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 22 60" preserveAspectRatio="none" aria-hidden>
          <Path d={POINT} fill={fg} fillRule="evenodd" />
        </Svg>
      </View>
    </View>
    <View testID={testID ? `${testID}-body` : undefined} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: fg, borderTopRightRadius: 14, borderBottomRightRadius: 14,
        paddingTop: 8, paddingRight: 16, paddingBottom: 9, paddingLeft: 6 }}>
      <Text allowFontScaling style={{ fontFamily: fonts.headingExtra, ...typeScale.score, color: colors.onPrimary }}>{score}</Text>
      <Text allowFontScaling style={{ fontFamily: fonts.medium, ...typeScale.caption, color: colors.onPrimary }}>{ro.score.outOf}</Text>
    </View>
  </Animated.View>;
}
