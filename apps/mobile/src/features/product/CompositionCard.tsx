import { View } from 'react-native';
import type { Product } from '@okbite/shared';
import { AllergenChip, Body, Caption, Card, Section } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { ProcessingLevel } from './ProcessingCard';

/** "Compoziție": what is in the product (declared allergens, possible traces) and how processed it is, in one card. */
export function CompositionCard({ product }: { product: Product }) {
  const { colors } = useTheme();
  return <Card testID="composition-card">
    <Section>{ro.result.composition}</Section>
    <View style={{ gap: 8 }}>
      <Body style={{ fontFamily: fonts.bold }}>{ro.result.allergens}</Body>
      {!!product.allergens.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {product.allergens.map(name => <AllergenChip key={name} name={name} />)}
      </View>}
      {product.status === 'verified' && !product.allergens.length && <Body>{ro.result.noAllergens}</Body>}
      {!!product.mayContain.length && <>
        <Body>{ro.result.mayContain}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {product.mayContain.map(name => <AllergenChip key={name} name={name} tone="trace" />)}
        </View>
      </>}
      <Caption>{ro.result.missingAllergenNote}</Caption>
    </View>
    <View style={{ height: 1, backgroundColor: colors.divider }} />
    <ProcessingLevel product={product} />
  </Card>;
}
