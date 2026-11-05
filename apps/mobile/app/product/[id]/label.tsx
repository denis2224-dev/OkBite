import { Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Body, Card, Screen } from '../../../src/ui';
import { ro } from '../../../src/copy/ro';
import { useProduct } from '../../../src/features/product/useProduct';
import { SourceCard } from '../../../src/features/product/SourceCard';

export default function Label() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useProduct(id);
  const product = data?.product;
  return <Screen title={ro.result.original} back>
    {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
    {error && <Body accessibilityLiveRegion="polite">{error.message}</Body>}
    {product?.status === 'hidden' && <Body>{ro.result.notFound}</Body>}
    {product && product.status !== 'hidden' && <>
      <Body>{product.name} · {product.brand}</Body>
      {product.labelImageUrl && <Image source={{ uri: product.labelImageUrl }} accessibilityRole="image"
        accessibilityLabel={ro.result.original} resizeMode="contain" style={{ width: '100%', height: 320 }} />}
      <Card><Body>{product.ingredientsText ?? ro.result.undeclared}</Body></Card>
      <SourceCard product={product} />
    </>}
  </Screen>;
}
