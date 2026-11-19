import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

const corners = { tl: { top: 0, left: 0 }, tr: { top: 0, right: 0 }, bl: { bottom: 0, left: 0 }, br: { bottom: 0, right: 0 } } as const;
const SIZE = 28;
const STROKE = 4;

/** Mist corner guides and a still green scan line that show where to hold the barcode. Decorative only, no text. */
export function ScanReticle() {
  const { colors } = useTheme();
  return <View testID="scan-reticle" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fill]}>
    <View style={styles.frame}>
      {(Object.keys(corners) as (keyof typeof corners)[]).map(corner => <View key={corner} testID={`scan-reticle-${corner}`} style={[styles.corner, corners[corner], {
        borderColor: colors.mist,
        borderTopWidth: corner[0] === 't' ? STROKE : 0, borderBottomWidth: corner[0] === 'b' ? STROKE : 0,
        borderLeftWidth: corner[1] === 'l' ? STROKE : 0, borderRightWidth: corner[1] === 'r' ? STROKE : 0,
        borderTopLeftRadius: corner === 'tl' ? 12 : 0, borderTopRightRadius: corner === 'tr' ? 12 : 0,
        borderBottomLeftRadius: corner === 'bl' ? 12 : 0, borderBottomRightRadius: corner === 'br' ? 12 : 0,
      }]} />)}
      <View testID="scan-line" style={[styles.line, { backgroundColor: colors.greenLight }]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  fill: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  frame: { width: '82%', maxWidth: 320, aspectRatio: 1.6, justifyContent: 'center' },
  corner: { position: 'absolute', width: SIZE, height: SIZE },
  line: { marginHorizontal: 12, height: 2, borderRadius: 1 },
});
