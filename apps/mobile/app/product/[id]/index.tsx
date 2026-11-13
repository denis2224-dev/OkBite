import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Body, Button } from '../../../src/ui';
import { ro } from '../../../src/copy/ro';
import { useProduct } from '../../../src/features/product/useProduct';
import { ResultView } from '../../../src/features/product/ResultView';
import { CompareAction } from '../../../src/features/product/CompareAction';
import { noteResultOpened } from '../../../src/lib/installPrompt';

export default function ProductPage() {
  const { id, cached: saved } = useLocalSearchParams<{ id: string; cached?: string }>();
  const { data, error, loading, storageError, cached, retry } = useProduct(id, saved === '1');
  const openedId = data?.product.id;
  useEffect(() => { if (openedId) noteResultOpened(openedId); }, [openedId]); // Two opened results unlock the install invitation.
  // Once loaded, the result's own top row (collapse, share, report) replaces the title bar.
  return <Screen title={data ? undefined : ro.result.title} back footer={data ? <CompareAction productId={data.product.id} /> : undefined}>
    {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
    {error && <><Body accessibilityLiveRegion="polite">{error.message}</Body><Button onPress={retry}>{ro.app.retry}</Button><Button variant="secondary" onPress={() => router.push('/history')}>{ro.offline.history}</Button></>}
    {storageError && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
    {cached && <Body>{ro.offline.cached}</Body>}
    {data && <ResultView product={data.product} score={data.score} />}
  </Screen>;
}
