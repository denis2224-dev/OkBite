import { View } from 'react-native';
import { summarizeWater, type Product, type WaterFieldKey, type WaterNumericKey, type WaterProfile } from '@okbite/shared';
import { Badge, Body, Card, Heading } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { waterFieldDisplayValue, waterFieldLabel } from './waterFormat';

const DISPLAY_NUMERIC_KEYS: readonly WaterNumericKey[] = [
  'tdsMgL', 'dryResidueMgL', 'ph',
  'caMgL', 'mgMgL', 'naMgL', 'naPlusKMgL', 'kMgL',
  'hco3MgL', 'so4MgL', 'clMgL', 'fMgL', 'no3MgL', 'bMgL', 'h3bo3MgL', 'iUgL',
];

function provenanceLine(water: WaterProfile, key: WaterFieldKey): string | null {
  const ev = water.evidence?.[key];
  if (!ev) return null;
  const wCopy = ro.result.water;
  const tag = ev.status === 'verified' ? wCopy.verifiedFieldTag : wCopy.unverifiedFieldTag;
  return `${ev.source} · ${tag}`;
}

/** Mineral highlights, pH/mineralization metrics, ranges, explicit zeroes, and per-field provenance. */
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

  const rows: { key: WaterFieldKey; label: string; value: string; provenance: string | null }[] = [];
  for (const key of DISPLAY_NUMERIC_KEYS) {
    const val = waterFieldDisplayValue(water, key);
    if (val !== null) {
      rows.push({ key, label: waterFieldLabel(key), value: val, provenance: provenanceLine(water, key) });
    }
  }
  if (!rows.length && water.carbonation) {
    rows.push({
      key: 'carbonation',
      label: wCopy.carbonationLabel,
      value: wCopy.carbonation[water.carbonation],
      provenance: provenanceLine(water, 'carbonation'),
    });
  }

  if (!badges.length && !rows.length) return null;
  return <View style={{ gap: 10 }}>
    {!!badges.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {badges.map(label => <Badge key={label}>{label}</Badge>)}
    </View>}
    {!!rows.length && <View>
      {rows.map((row, i) => <View key={row.key} accessible accessibilityLabel={`${row.label}: ${row.value}`}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8,
          borderTopWidth: i ? 1 : 0, borderColor: colors.divider }}>
        <View style={{ flex: 1 }}>
          <Body style={{ color: colors.muted }}>{row.label}</Body>
          {row.provenance && <Body style={{ fontSize: 11, lineHeight: 15, color: colors.muted }}>{row.provenance}</Body>}
        </View>
        <Body style={{ fontFamily: fonts.bold }}>{row.value}</Body>
      </View>)}
    </View>}
  </View>;
}

export function WaterCard({ product }: { product: Product }) {
  if (!product.water) return null;
  return <Card testID="water-card">
    <Heading style={{ fontSize: 18 }}>{ro.result.water.cardTitle}</Heading>
    <WaterSummaryBody water={product.water} />
  </Card>;
}
