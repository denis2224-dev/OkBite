import { View } from 'react-native';
import type { Product, ScoreResult } from '@okbite/shared';
import { Body, Card, Detail } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';
import { insideRows } from './insideRows';
import { packageAmount } from './packageAmount';
import { ResultSection } from './ResultSection';

/** "What's inside": the declared nutrients for the whole package (its printed weight), each with a thin bar and a short level line where the app has a sourced one. */
export function WhatsInside({ product, score }: { product: Product; score: ScoreResult }) {
  const { colors } = useTheme();
  const rows = insideRows(product, score);
  if (!rows.length) return null;
  // When the weight cannot be read the values stay per 100 g, and the card says so.
  const per100Only = packageAmount(product) === null;
  return <ResultSection title={ro.result.whatsInside}>
    <Card testID="whats-inside" style={{ paddingVertical: 4, gap: 0, borderRadius: 22 }}>
      {per100Only && <Detail testID="whats-inside-basis" style={{ paddingTop: 8 }}>{ro.result.per100(product.unit)}</Detail>}
      {rows.map((row, index) => {
        const unit = row.key === 'kcal' ? 'kcal' : row.key === 'fruitVegPct' ? '%' : ro.app.unitGram;
        const value = `${formatAmount(row.value)} ${unit}`;
        const fill = row.reason?.tone === 'bad' ? colors.low : row.reason?.tone === 'good' ? colors.good : colors.primary;
        const caption = row.reason?.title ?? (row.percent !== null ? ro.result.daily(row.percent) : null);
        return <View key={row.key} accessible accessibilityLabel={[ro.result.nutrients[row.key], value, per100Only ? ro.result.per100(product.unit) : product.quantity, caption].filter(Boolean).join(', ')}
          style={{ paddingVertical: 12, borderTopWidth: index ? 1 : 0, borderColor: colors.divider }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <Body style={{ flex: 1, fontFamily: fonts.bold }}>{ro.result.nutrients[row.key]}</Body>
            <Body style={{ fontFamily: fonts.heading }}>{value}</Body>
          </View>
          {row.percent !== null && <View testID={`inside-bar-${row.key}`} accessible={false} style={{ height: 6, borderRadius: 3, backgroundColor: colors.soft, marginTop: 8, overflow: 'hidden' }}>
            <View testID={`inside-fill-${row.key}`} style={{ height: 6, borderRadius: 3, width: `${Math.max(2, Math.min(row.percent, 100))}%`, backgroundColor: fill }} />
          </View>}
          {caption && <Detail style={{ marginTop: 6 }}>{caption}</Detail>}
        </View>;
      })}
    </Card>
  </ResultSection>;
}
