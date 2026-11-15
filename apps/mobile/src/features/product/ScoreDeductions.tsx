import { useState } from 'react';
import { View } from 'react-native';
import type { Product, ScoreResult } from '@okbite/shared';
import { Body, Card } from '../../ui';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { productScoreFor } from './productScoreFor';

/** "De ce?": every point the product score lost (nutrition parts, each additive, processing, cap). */
export function ScoreDeductions({ product, score }: { product: Product; score: ScoreResult }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { score: value, deductions } = productScoreFor(product, score);
  if (value === null || !deductions.length) return null;
  return <Card style={{ paddingVertical: 4, gap: 0 }}>
    <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.tiers.why} accessibilityState={{ expanded: open }}
      onPress={() => setOpen(o => !o)} style={{ minHeight: 48, justifyContent: 'center' }}>
      <Body style={{ fontFamily: fonts.bold }}>{ro.tiers.why}</Body>
    </PressableOpacity>
    {open && deductions.map((d, i) => <View key={`${d.key}:${d.detail ?? ''}:${i}`} testID="deduction-row" accessible
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: colors.divider }}>
      <Body style={{ flex: 1 }}>{d.detail ? `${ro.ledger[d.key]}: ${d.detail}` : ro.ledger[d.key]}</Body>
      <Body style={{ fontFamily: fonts.bold, color: d.points ? colors.low : colors.muted }}>{ro.ledger.points(d.points)}</Body>
    </View>)}
  </Card>;
}
