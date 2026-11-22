import { View } from 'react-native';
import type { Product } from '@okbite/shared';
import { Body } from '../../ui';
import { fonts } from '../../theme/tokens';
import { ro } from '../../copy/ro';

/** The NOVA processing level, shown inside the Compoziție card. */
export function ProcessingLevel({ product }: { product: Product }) {
  const level = product.processing?.level as 1 | 2 | 3 | 4 | undefined;
  return <View style={{ gap: 4 }}>
    <Body style={{ fontFamily: fonts.bold }}>{ro.processing.title}</Body>
    {level
      ? <>
        <Body>{`${level}, ${ro.processing[level]}`}</Body>
        <Body>{ro.processing[`level${level}` as const]}</Body>
      </>
      : <Body>{ro.processing.unknown}</Body>}
  </View>;
}
