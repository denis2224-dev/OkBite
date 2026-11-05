import { useLocalSearchParams } from 'expo-router';
import { Screen, Body } from '../../../src/ui';
import { ro } from '../../../src/copy/ro';
import { useProduct } from '../../../src/features/product/useProduct';
import { ResultView } from '../../../src/features/product/ResultView';

export default function ProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, storageError } = useProduct(id);
  return <Screen title={ro.result.title} back>
    {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
    {error && <Body accessibilityLiveRegion="polite">{error.message}</Body>}
    {storageError && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
    {data && <ResultView product={data.product} score={data.score} />}
  </Screen>;
}
