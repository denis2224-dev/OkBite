import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Body, Button } from '../../../src/ui';
import { ro } from '../../../src/copy/ro';
import { useProduct } from '../../../src/features/product/useProduct';
import { ResultView } from '../../../src/features/product/ResultView';
import { CompareAction } from '../../../src/features/product/CompareAction';
import { noteResultOpened } from '../../../src/lib/installPrompt';
import { COMPARE_FLAG, isCompareFlag } from '../../../src/features/identify/routes';

export default function ProductPage() {
  const { id, cached: saved, [COMPARE_FLAG]: fromCompare } = useLocalSearchParams<{ id: string; cached?: string; forCompare?: string }>();
  const { data, error, loading, storageError, retry } = useProduct(id, saved === '1');
  const openedId = data?.product.id;
  useEffect(() => { if (openedId) noteResultOpened(openedId); }, [openedId]); // Two opened results unlock the install invitation.
  // Photographed from Compare: once the product is in history (it is saved while loading), go back and put it in slot A or B.
  const backToCompare = isCompareFlag(fromCompare) && openedId && !storageError ? openedId : null;
  useEffect(() => { if (backToCompare) router.replace({ pathname: '/compare', params: { added: backToCompare } }); }, [backToCompare]);
  // Once loaded, the result's own top row (collapse, share, report) replaces the title bar.
  return <Screen title={data ? undefined : ro.result.title} footer={data ? <CompareAction productId={data.product.id} /> : undefined}>
    {loading && <Body accessibilityLiveRegion="polite">{ro.app.loading}</Body>}
    {error && <><Body accessibilityLiveRegion="polite">{error.message}</Body>{error.code === 'not_found' ? <Button onPress={() => router.push('/scan')}>{ro.scan.title}</Button> : <Button onPress={retry}>{ro.app.retry}</Button>}<Button variant="secondary" onPress={() => router.push('/history')}>{ro.offline.history}</Button></>}
    {storageError && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
    {data && <ResultView product={data.product} score={data.score} />}
  </Screen>;
}
