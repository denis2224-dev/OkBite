import { View } from 'react-native';
import { summarizeWater, type Product, type WaterProfile } from '@okbite/shared';
import { Badge, Body, Card, Heading } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';

const ION_KEYS = [
  'caMgL', 'mgMgL', 'naMgL', 'naPlusKMgL', 'kMgL',
  'hco3MgL', 'so4MgL', 'clMgL', 'fMgL', 'no3MgL', 'h3bo3MgL', 'iUgL',
] as const;

const formatPh = (n: number) => n.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');

/** Mineral highlights, pH/mineralization metrics and declared ions for bottled water. */
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

  const rows: [string, string][] = [];
  if (water.tdsMgL !== null) rows.push([wCopy.tdsLabel, `${formatAmount(water.tdsMgL)} ${wCopy.mgL}`]);
  if (water.dryResidueMgL !== null) rows.push([wCopy.dryResidueLabel, `${formatAmount(water.dryResidueMgL)} ${wCopy.mgL}`]);
  if (water.ph !== null) rows.push([wCopy.phLabel, formatPh(water.ph)]);
  for (const key of ION_KEYS) {
    const val = water[key];
    if (val !== null) rows.push([wCopy.ions[key], `${formatAmount(val)} ${key === 'iUgL' ? wCopy.ugL : wCopy.mgL}`]);
  }

  if (!badges.length && !rows.length) return null;
  return <View style={{ gap: 10 }}>
    {!!badges.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {badges.map(label => <Badge key={label}>{label}</Badge>)}
    </View>}
    {!!rows.length && <View>
      {rows.map(([label, value], i) => <View key={label} accessible accessibilityLabel={`${label}: ${value}`}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8,
          borderTopWidth: i ? 1 : 0, borderColor: colors.divider }}>
        <Body style={{ flex: 1, color: colors.muted }}>{label}</Body>
        <Body style={{ fontFamily: fonts.bold }}>{value}</Body>
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
