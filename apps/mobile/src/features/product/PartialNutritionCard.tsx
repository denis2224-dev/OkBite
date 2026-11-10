import { View } from 'react-native';
import { NUTRIENT_KEYS, type Product } from '@okbite/shared';
import { Body, Card, Heading } from '../../ui';
import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';

/** The current Product contract stores values per 100 g/ml, never per portion. */
export function PartialNutritionCard({ product }: { product: Product }) {
  const available = NUTRIENT_KEYS.filter(key => product.nutrients[key] !== null);
  return <Card>
    <Heading style={{ fontSize: 18 }}>{available.length ? ro.result.scoreUnavailable : ro.result.nutritionUnavailable}</Heading>
    {!available.length && <Body>{ro.result.scoreUnavailable}</Body>}
    {product.category.slug === 'necunoscut' && <Body>{ro.result.categoryUnconfirmed}</Body>}
    {!!available.length && <>
      <Body>{ro.result.insufficientNutrition}</Body>
      <Body style={{fontWeight:'700'}}>{ro.result.per100(product.unit)}</Body>
      {available.map(key => <View key={key} style={{ gap: 4 }}>
        <Body>{ro.result.nutrients[key]}</Body>
        <Body>{formatAmount(product.nutrients[key]!)} {key === 'kcal' ? 'kcal' : key === 'fruitVegPct' ? '%' : ro.app.unitGram}</Body>
      </View>)}
    </>}
  </Card>;
}
