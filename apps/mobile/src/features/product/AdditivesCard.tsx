import { useState } from 'react';
import { View } from 'react-native';
import { resolveProductIngredients, type Ingredient, type Product } from '@okbite/shared';
import { Caption, Card, Icon } from '../../ui';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { AdditiveSheet } from './AdditiveSheet';
import { ResultIcon } from './ResultIcon';
import { ResultSection } from './ResultSection';

const risks = ['low', 'moderate', 'high', null] as const;

/** Additives, grouped by their risk: each one is a small chip with its name and a chevron; tapping opens its sheet. */
export function AdditivesCard({ product }: { product: Product }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<Ingredient | null>(null);
  const additives = resolveProductIngredients(product).filter((i) => i.group === 'add');
  if (additives.length === 0) return null;
  return <ResultSection title={ro.additives.title} count={additives.length}>
    <Card testID="additives-card" style={{ gap: 14, borderRadius: 22 }}>
      {risks.map(risk => {
        const group = additives.filter(a => (a.risk ?? null) === risk);
        if (!group.length) return null;
        return <View key={risk ?? 'none'} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {risk === 'low' && <Icon name="leaf" size={15} color={colors.good} />}
            <Caption style={{ fontFamily: fonts.bold, color: risk === 'high' ? colors.low : risk === 'moderate' ? colors.medium : colors.good }}>{risk ? ro.additives[risk] : ro.additives.notAssessed}</Caption>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {group.map((a, i) => <PressableOpacity key={`${a.slug ?? a.name}-${i}`} accessibilityRole="button"
              accessibilityLabel={`${a.name}, ${a.risk ? ro.additives[a.risk] : ro.additives.notAssessed}`} onPress={() => setOpen(a)}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 8, borderRadius: 999, backgroundColor: colors.soft }}>
              <Caption style={{ fontFamily: fonts.bold, color: colors.ink }}>{a.name}</Caption>
              <View style={{ transform: [{ rotate: '-90deg' }] }}><ResultIcon name="chevronDown" size={16} color={colors.muted} /></View>
            </PressableOpacity>)}
          </View>
        </View>;
      })}
    </Card>
    {open && <AdditiveSheet ingredient={open} productId={product.id} onClose={() => setOpen(null)} />}
  </ResultSection>;
}
