import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import type { MineralTone } from './waterAnalysis';

const TONE_COLORS: Record<MineralTone, string> = {
  good: '#1D9A6C',
  neutral: '#8A938D',
  warn: '#E67E22',
  low: '#C83E2B',
  info: '#2B8AE2',
};

const TASTE_SEGMENT_COLORS = ['#E2E6E3', '#1DB8A0', '#D7C4F8', '#E7B4F2', '#F7B7BF'] as const;
const INACTIVE_DOT = '#E2E6E3';

export function mineralToneColor(tone: MineralTone): string {
  return TONE_COLORS[tone];
}

export function DotScale({
  filled = 0,
  activeIndex,
  color = TONE_COLORS.good,
  size = 7,
}: {
  filled?: number;
  activeIndex?: number;
  color?: string;
  size?: number;
}) {
  return (
    <View style={styles.dotRow} accessible={false}>
      {[0, 1, 2, 3, 4].map((i) => {
        const lit = activeIndex !== undefined ? i === activeIndex : i < filled;
        return (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: lit ? color : INACTIVE_DOT,
            }}
          />
        );
      })}
    </View>
  );
}

export function TasteBar({
  activeIndex,
  labels,
  inkColor,
  mutedColor,
}: {
  activeIndex: 0 | 1 | 2 | 3 | 4;
  labels: readonly string[];
  inkColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.tasteWrap}>
      <View style={styles.segmentRow}>
        {TASTE_SEGMENT_COLORS.map((segColor, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: segColor },
              i === 0 && styles.segStart,
              i === 4 && styles.segEnd,
            ]}
          >
            {i === activeIndex && (
              <View style={[styles.marker, { backgroundColor: inkColor }]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.labelRow}>
        {labels.map((label, i) => (
          <Text
            key={i}
            style={[
              styles.segLabel,
              {
                color: i === activeIndex ? inkColor : mutedColor,
                fontFamily: i === activeIndex ? fonts.bold : fonts.body,
              },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tasteWrap: { gap: 8, paddingTop: 10 },
  segmentRow: { flexDirection: 'row', alignItems: 'center', height: 14, gap: 3 },
  segment: { flex: 1, height: 7, alignItems: 'center', justifyContent: 'center' },
  segStart: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  segEnd: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  marker: { width: 2.5, height: 14, borderRadius: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
  segLabel: { flex: 1, fontSize: 11, lineHeight: 14, textAlign: 'center' },
});
