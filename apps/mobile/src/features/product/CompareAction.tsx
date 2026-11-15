import { router } from 'expo-router';
import { Button } from '../../ui';
import { ro } from '../../copy/ro';

/** The result screen's one main action, shown in the screen's fixed footer. */
export function CompareAction({ productId }: { productId: string }) {
  return <Button icon="compare" onPress={() => router.push({ pathname: '/compare', params: { id: productId } })}>{ro.result.compare}</Button>;
}
