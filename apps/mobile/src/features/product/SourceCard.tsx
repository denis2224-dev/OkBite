import type { Product } from '@okbite/shared';
import { Body, Card, Heading } from '../../ui';
import { ro } from '../../copy/ro';

// Contract dates are YYYY-MM-DD; Romanian readers expect DD.MM.YYYY.
export const roDate = (date: string) => date.split('-').reverse().join('.');

export function SourceCard({ product }: { product: Product }) {
  return <Card>
    <Heading style={{ fontSize: 18 }}>{ro.result.source}</Heading>
    <Body>{product.source}</Body>
    <Body>{ro.result.added}: {roDate(product.addedAt)}</Body>
    {product.status === 'verified' && product.verifiedAt
      ? <Body>{ro.result.checked}: {roDate(product.verifiedAt)}</Body>
      : <Body>{ro.result.unverified}</Body>}
  </Card>;
}
