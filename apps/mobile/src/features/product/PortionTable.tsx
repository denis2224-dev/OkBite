import { View } from 'react-native';
import type { Product } from '@okbite/shared';
import { Body, Card, Heading } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';
import { perPortion, percentOfReference, teaspoons } from './portion';

export function PortionTable({ product }: { product: Product }) {
  const { colors } = useTheme();
  const sugar = product.nutrients.sugar;
  return <Card>
    <Heading style={{ fontSize: 18 }}>{ro.result.portion}</Heading>
    <Body>{product.portion.label}</Body>
    <Body>{ro.result.portionAmount(formatAmount(product.portion.amount), product.unit)}</Body>
    {(['kcal', 'sugar', 'sat', 'salt'] as const).map(key => {
      const raw = product.nutrients[key];
      const value = raw === null ? null : perPortion(raw, product.portion.amount);
      const percent = value === null ? null : Math.round(percentOfReference(key, value));
      return <View key={key} style={{ gap: 6 }}>
        <Body style={{ fontWeight: '700' }}>{ro.result.nutrients[key]}</Body>
        <Body>{value === null ? ro.result.undeclared : `${formatAmount(value)} ${key === 'kcal' ? 'kcal' : ro.app.unitGram}`}</Body>
        {percent !== null && <>
          <View accessible={false} style={{ height: 6, borderRadius: 3, backgroundColor: colors.soft }}>
            <View style={{ height: 6, borderRadius: 3, width: `${Math.min(percent, 100)}%`, backgroundColor: colors.controlBorder }} />
          </View>
          <Body style={{ color: colors.muted }}>{ro.result.daily(percent)}</Body>
        </>}
      </View>;
    })}
    {sugar !== null && <Body>{ro.result.sugarNote(teaspoons(perPortion(sugar, product.portion.amount)))}</Body>}
    <Body style={{ color: colors.muted }}>{ro.result.portionNote}</Body>
  </Card>;
}
