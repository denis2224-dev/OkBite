import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Tier } from '@okbite/shared';
import { fonts } from '../../theme/tokens';
import { tierTone } from '../../theme/tierTones';

// Same shelf-tag point as product/ScoreTag (punched hole, evenodd), drawn narrower.
const POINT = 'M22 0H14L0 30l14 30h8zM16.4 30a3.4 3.4 0 1 0 -6.8 0a3.4 3.4 0 1 0 6.8 0z';

/** Compact, still version of the score shelf tag for list rows. Decorative: the row around it reads the score. */
export function ScoreTagSmall({ score, tier }: { score: number; tier: Tier }) {
  const { fill: fg, onFill } = tierTone(tier);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.tag}>
    {/* The number sets the height; the point stretches to it in an absolute layer, as in ScoreTag. */}
    <View style={styles.point}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 22 60" preserveAspectRatio="none" aria-hidden><Path d={POINT} fill={fg} fillRule="evenodd" /></Svg>
      </View>
    </View>
    <View style={[styles.body, { backgroundColor: fg }]}>
      <Text allowFontScaling style={[styles.number, { color: onFill }]}>{score}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'stretch' },
  point: { width: 13, alignSelf: 'stretch', marginRight: -1 },
  body: { minWidth: 34, alignItems: 'center', borderTopRightRadius: 9, borderBottomRightRadius: 9, paddingVertical: 5, paddingLeft: 3, paddingRight: 9 },
  number: { fontFamily: fonts.headingExtra, fontSize: 20, lineHeight: 24 },
});
