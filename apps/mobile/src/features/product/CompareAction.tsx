import { router } from 'expo-router';
import { PrimaryButton } from '../../ui';
import { ro } from '../../copy/ro';

/** The result screen's one main action, shown in the screen's fixed footer. */
export function CompareAction({ productId }: { productId: string }) {
  return <PrimaryButton label={ro.result.compare} icon="arrowRight" onPress={() => router.push({ pathname: '/compare', params: { id: productId } })} />;
}
