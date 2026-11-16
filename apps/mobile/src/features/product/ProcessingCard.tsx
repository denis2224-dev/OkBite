import type { Product } from '@okbite/shared';
import { Body, Card, Section } from '../../ui';
import { ro } from '../../copy/ro';

export function ProcessingCard({ product }: { product: Product }) {
  const level = product.processing?.level as 1 | 2 | 3 | 4 | undefined;
  return <Card>
    <Section>{ro.processing.title}</Section>
    {level
      ? <>
        <Body>{`${level} · ${ro.processing[level]}`}</Body>
        <Body>{ro.processing[`level${level}` as const]}</Body>
      </>
      : <Body>{ro.processing.unknown}</Body>}
  </Card>;
}
