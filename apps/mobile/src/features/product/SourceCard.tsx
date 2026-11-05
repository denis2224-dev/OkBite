import type { Product } from '@okbite/shared';
import { Body, Card, Heading } from '../../ui';
import { ro } from '../../copy/ro';

export function SourceCard({ product }: { product: Product }) {
  return <Card>
    <Heading style={{ fontSize: 18 }}>{ro.result.source}</Heading>
    <Body>{product.source}</Body>
    <Body>{ro.result.added}: {product.addedAt}</Body>
    {product.status === 'verified' && product.verifiedAt
      ? <Body>{ro.result.checked}: {product.verifiedAt}</Body>
      : <Body>{ro.result.unverified}</Body>}
  </Card>;
}
