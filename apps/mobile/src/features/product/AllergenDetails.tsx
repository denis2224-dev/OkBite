import { View } from 'react-native';
import type { Product } from '@okbite/shared';
import { AllergenChip, Body, Caption } from '../../ui';
import { ro } from '../../copy/ro';
import { declaredAllergenText } from './allergenLabel';

export function AllergenDetails({ product }: { product: Product }) {
  return <View style={{ gap: 8 }}>
    {product.allergens.length > 0
      ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {product.allergens.map(name => <AllergenChip key={name} name={name} />)}
      </View>
      : <Body>{declaredAllergenText(product)}</Body>}
    {product.mayContain.length > 0 && <>
      <Body>{ro.result.mayContain}</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {product.mayContain.map(name => <AllergenChip key={name} name={name} tone="trace" />)}
      </View>
    </>}
    <Caption>{ro.result.missingAllergenNote}</Caption>
  </View>;
}
