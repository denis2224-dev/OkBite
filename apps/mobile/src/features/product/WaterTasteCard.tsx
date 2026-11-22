import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Carbonation, WaterProfile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Body, Caption, Card, Icon } from '../../ui';
import { DotScale, TasteBar } from './WaterDots';
import { deriveWaterTaste, type TasteKey } from './waterAnalysis';

const TASTE_COLOR: Record<TasteKey, string> = {
  neutral: '#8A938D',
  soft: '#0F9D88',
  mineral: '#7B5CC4',
  rich_mineral: '#9B4DCA',
  salty_intense: '#C83E2B',
};

const CARBONATION_DOTS: Record<Carbonation, number> = {
  still: 1,
  lightly_sparkling: 2,
  sparkling: 4,
};

export function WaterTasteCard({ water }: { water: WaterProfile }) {
  const { colors } = useTheme();
  const wCopy = ro.result.water;
  const taste = deriveWaterTaste(water);
  const carbonation = water.carbonation;
  const [tasteOpen, setTasteOpen] = useState(true);
  const [carbOpen, setCarbOpen] = useState(false);

  if (!taste && !carbonation) return null;

  const shortLabels = [
    wCopy.tasteShort.neutral,
    wCopy.tasteShort.soft,
    wCopy.tasteShort.mineral,
    wCopy.tasteShort.rich_mineral,
    wCopy.tasteShort.salty_intense,
  ];

  return (
    <View testID="water-taste-card" style={styles.section}>
      <Body style={[styles.eyebrow, { color: colors.good }]}>{wCopy.tasteProfileTitle}</Body>
      <Card style={styles.card}>
        {taste && (
          <View style={styles.rowBlock}>
            <PressableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: tasteOpen }}
              onPress={() => setTasteOpen((o) => !o)}
              style={styles.headerRow}
            >
              <View style={styles.leftCol}>
                <Body style={styles.rowTitle}>{wCopy.tasteLabel}</Body>
                <Body style={{ color: TASTE_COLOR[taste.key], fontSize: 13, lineHeight: 18 }}>
                  {wCopy.tasteLevels[taste.key]}
                </Body>
              </View>
              <View style={styles.rightCol}>
                <DotScale activeIndex={taste.index} color={TASTE_COLOR[taste.key]} />
                <View style={{ transform: [{ rotate: tasteOpen ? '-90deg' : '90deg' }] }}>
                  <Icon name="arrow" size={16} color={colors.muted} />
                </View>
              </View>
            </PressableOpacity>
            {tasteOpen && (
              <TasteBar
                activeIndex={taste.index}
                labels={shortLabels}
                inkColor={colors.ink}
                mutedColor={colors.muted}
              />
            )}
          </View>
        )}
        {carbonation && (
          <View
            style={[
              styles.rowBlock,
              taste ? { borderTopWidth: 1, borderColor: colors.divider } : null,
            ]}
          >
            <PressableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: carbOpen }}
              onPress={() => setCarbOpen((o) => !o)}
              style={styles.headerRow}
            >
              <View style={styles.leftCol}>
                <Body style={styles.rowTitle}>{wCopy.carbonationLabel}</Body>
                <Body
                  style={{
                    color: carbonation === 'still' ? colors.muted : '#2376E0',
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {wCopy.carbonation[carbonation]}
                </Body>
              </View>
              <View style={styles.rightCol}>
                <DotScale filled={CARBONATION_DOTS[carbonation]} color="#2B8AE2" />
                <View style={{ transform: [{ rotate: carbOpen ? '-90deg' : '90deg' }] }}>
                  <Icon name="arrow" size={16} color={colors.muted} />
                </View>
              </View>
            </PressableOpacity>
            {carbOpen && (
              <Caption style={styles.noteText}>{wCopy.carbonationNotes[carbonation]}</Caption>
            )}
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, letterSpacing: 0.7 },
  card: { paddingVertical: 6, gap: 0 },
  rowBlock: { paddingVertical: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  leftCol: { flex: 1, gap: 1 },
  rowTitle: { fontFamily: fonts.bold },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteText: { paddingTop: 8 },
});
