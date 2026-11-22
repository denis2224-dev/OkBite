import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { summarizeWater, type Product, type WaterNumericKey, type WaterProfile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Badge, Body, Caption, Card, Icon } from '../../ui';
import { DotScale, mineralToneColor } from './WaterDots';
import { buildWaterComposition, type MineralTone } from './waterAnalysis';
import { waterFieldDisplayValue, waterFieldLabel } from './waterFormat';

const DISPLAY_NUMERIC_KEYS: readonly WaterNumericKey[] = [
  'tdsMgL', 'dryResidueMgL', 'ph',
  'caMgL', 'mgMgL', 'naMgL', 'naPlusKMgL', 'kMgL',
  'hco3MgL', 'so4MgL', 'clMgL', 'fMgL', 'no3MgL', 'bMgL', 'h3bo3MgL', 'iUgL',
];

/** Clean mineral summary used inside un-scored partial water cards (no provenance subtitles). */
export function WaterSummaryBody({ water }: { water: WaterProfile }) {
  const { colors } = useTheme();
  const wCopy = ro.result.water;
  const s = summarizeWater(water);

  const badges: string[] = [];
  if (water.carbonation) badges.push(wCopy.carbonation[water.carbonation]);
  if (s.lowSodium) badges.push(wCopy.badges.lowSodium);
  if (s.magnesiumRich) badges.push(wCopy.badges.magnesiumRich);
  if (s.highCalcium) badges.push(wCopy.badges.highCalcium);
  if (s.iodized) badges.push(wCopy.badges.iodized);

  const rows: { key: string; label: string; value: string }[] = [];
  for (const key of DISPLAY_NUMERIC_KEYS) {
    const val = waterFieldDisplayValue(water, key);
    if (val !== null) rows.push({ key, label: waterFieldLabel(key), value: val });
  }
  if (!badges.length && !rows.length) return null;
  return (
    <View style={{ gap: 10 }}>
      {!!badges.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {badges.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </View>
      )}
      {!!rows.length && (
        <View>
          {rows.map((row, i) => (
            <View
              key={row.key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 8,
                borderTopWidth: i ? 1 : 0,
                borderColor: colors.divider,
              }}
            >
              <Body style={{ color: colors.muted }}>{row.label}</Body>
              <Body style={{ fontFamily: fonts.bold }}>{row.value}</Body>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function WaterCard({ product }: { product: Product }) {
  const { colors } = useTheme();
  const wCopy = ro.result.water;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);

  if (!product.water) return null;
  const comp = buildWaterComposition(product.water);

  const items: {
    id: string;
    label: string;
    subtitle: string;
    value: string;
    dots: 1 | 2 | 3 | 4 | 5;
    tone: MineralTone;
    note: string;
  }[] = [];

  if (comp.phRow) {
    const levelText = wCopy.phLevels[comp.phRow.level];
    items.push({
      id: 'ph',
      label: wCopy.phLabel,
      subtitle: comp.phRow.isApprox ? `${levelText}, ${wCopy.approxTag}` : levelText,
      value: comp.phRow.display,
      dots: comp.phRow.dots,
      tone: comp.phRow.tone,
      note: comp.phRow.isApprox ? wCopy.mineralNotes.phApprox : wCopy.mineralNotes.ph,
    });
  }

  for (const row of comp.mineralRows) {
    if (row.key === 'ph') continue;
    items.push({
      id: row.key,
      label: waterFieldLabel(row.key),
      subtitle: wCopy.mineralLevels[row.level],
      value: row.displayValue,
      dots: row.dots,
      tone: row.tone,
      note: wCopy.mineralNotes[row.key],
    });
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Body style={[styles.eyebrow, { color: colors.good }]}>{wCopy.mineralCompositionTitle}</Body>
        <View testID="water-mineral-count" style={[styles.countPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Body style={styles.countText}>{`${comp.declaredCount}/${comp.totalStandardCount}`}</Body>
        </View>
      </View>
      <Card testID="water-card" style={styles.card}>
        {items.map((item, idx) => {
          const open = expandedKey === item.id;
          const color = mineralToneColor(item.tone);
          return (
            <View
              key={item.id}
              style={[styles.rowBlock, idx ? { borderTopWidth: 1, borderColor: colors.divider } : null]}
            >
              <PressableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={`${item.label}: ${item.value}`}
                onPress={() => setExpandedKey(open ? null : item.id)}
                style={styles.rowPress}
              >
                <View style={styles.leftCol}>
                  <Body style={styles.rowTitle}>{item.label}</Body>
                  <Body style={[styles.subtitle, { color }]}>{item.subtitle}</Body>
                </View>
                <View style={styles.rightWrap}>
                  <View style={styles.valueCol}>
                    <Body style={styles.valueText}>{item.value}</Body>
                    <DotScale filled={item.dots} color={color} />
                  </View>
                  <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
                    <Icon name="arrow" size={16} color={colors.muted} />
                  </View>
                </View>
              </PressableOpacity>
              {open && <Caption style={styles.noteText}>{item.note}</Caption>}
            </View>
          );
        })}

        {comp.missingKeys.length > 0 && (
          <View style={[styles.rowBlock, items.length ? { borderTopWidth: 1, borderColor: colors.divider } : null]}>
            <PressableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: otherOpen }}
              onPress={() => setOtherOpen((o) => !o)}
              style={styles.rowPress}
            >
              <Body style={[styles.otherTitle, { color: colors.good }]}>
                {wCopy.otherValues(comp.missingKeys.length)}
              </Body>
              <View style={{ transform: [{ rotate: otherOpen ? '-90deg' : '90deg' }] }}>
                <Icon name="arrow" size={16} color={colors.good} />
              </View>
            </PressableOpacity>
            {otherOpen && (
              <View style={styles.missingList}>
                {comp.missingKeys.map((key) => (
                  <View key={key} style={[styles.missingRow, { borderColor: colors.divider }]}>
                    <View style={styles.leftCol}>
                      <Body style={{ color: colors.ink }}>{waterFieldLabel(key)}</Body>
                      <Body style={[styles.subtitle, { color: colors.muted }]}>{wCopy.notStated}</Body>
                    </View>
                    <DotScale filled={0} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, letterSpacing: 0.7 },
  countPill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  countText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold },
  card: { paddingVertical: 6, gap: 0 },
  rowBlock: { paddingVertical: 10 },
  rowPress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  leftCol: { flex: 1, gap: 1 },
  rowTitle: { fontFamily: fonts.bold },
  subtitle: { fontSize: 13, lineHeight: 18 },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueCol: { alignItems: 'flex-end', gap: 4 },
  valueText: { fontFamily: fonts.bold },
  noteText: { paddingTop: 8 },
  otherTitle: { fontFamily: fonts.bold, fontSize: 15 },
  missingList: { paddingTop: 8, gap: 4 },
  missingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1 },
});
