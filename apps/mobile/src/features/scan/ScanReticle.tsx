import { StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';

const corners = { tl: { top: 0, left: 0 }, tr: { top: 0, right: 0 }, bl: { bottom: 0, left: 0 }, br: { bottom: 0, right: 0 } } as const;
const SIZE = 28;
const STROKE = 4;

/** Corner guides that show where to hold the barcode, with the hint on a legible pill. Decorative only. */
export function ScanReticle() {
  const { colors } = useTheme();
  return <View testID="scan-reticle" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fill]}>
    <View style={styles.frame}>
      {(Object.keys(corners) as (keyof typeof corners)[]).map(corner => <View key={corner} testID={`scan-reticle-${corner}`} style={[styles.corner, corners[corner], {
        borderColor: colors.accent,
        borderTopWidth: corner[0] === 't' ? STROKE : 0, borderBottomWidth: corner[0] === 'b' ? STROKE : 0,
        borderLeftWidth: corner[1] === 'l' ? STROKE : 0, borderRightWidth: corner[1] === 'r' ? STROKE : 0,
        borderTopLeftRadius: corner === 'tl' ? 12 : 0, borderTopRightRadius: corner === 'tr' ? 12 : 0,
        borderBottomLeftRadius: corner === 'bl' ? 12 : 0, borderBottomRightRadius: corner === 'br' ? 12 : 0,
      }]} />)}
    </View>
    <View testID="scan-reticle-hint" style={[styles.hint, { backgroundColor: colors.cameraOverlay }]}>
      <Text style={[styles.hintText, { color: colors.cameraInk }]}>{ro.scan.frameHint}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  fill: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  frame: { width: '82%', maxWidth: 320, aspectRatio: 1.6 },
  corner: { position: 'absolute', width: SIZE, height: SIZE },
  hint: { position: 'absolute', bottom: 16, left: 16, right: 16, alignSelf: 'center', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  hintText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
