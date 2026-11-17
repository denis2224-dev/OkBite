import { useState } from 'react';
import { View } from 'react-native';
import { resolveProductIngredients, type Ingredient, type Product } from '@okbite/shared';
import { Body, Card, Section } from '../../ui';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { ro } from '../../copy/ro';
import { AdditiveSheet, RiskChip } from './AdditiveSheet';

export function AdditivesCard({ product }: { product: Product }) {
  const [open, setOpen] = useState<Ingredient | null>(null);
  const additives = resolveProductIngredients(product).filter((i) => i.group === 'add');
  if (additives.length === 0) return null;
  return <Card>
    <Section>{ro.additives.title}</Section>
    {additives.map((a, i) => <PressableOpacity key={`${a.slug ?? a.name}-${i}`} accessibilityRole="button"
      accessibilityLabel={`${a.name}, ${a.risk ? ro.additives[a.risk] : ro.additives.notAssessed}`} onPress={() => setOpen(a)}
      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Body style={{ flex: 1, fontFamily: fonts.bold }}>{a.name}</Body>
      <View><RiskChip risk={a.risk} /></View>
    </PressableOpacity>)}
    {open && <AdditiveSheet ingredient={open} productId={product.id} onClose={() => setOpen(null)} />}
  </Card>;
}
