import type { Product } from '@okbite/shared';
import { Body, Card, Section } from '../../ui';
import { ro } from '../../copy/ro';

// Contract dates are YYYY-MM-DD; Romanian readers expect DD.MM.YYYY.
export const roDate = (date: string) => date.split('-').reverse().join('.');

// Imports store OFF_SOURCE ('Open Food Facts (ODbL)'); shopper rows store 'Fotografiile utilizatorului'.
export const isOffProduct = (product: Product) => product.source.startsWith('Open Food Facts');

export function SourceCard({ product }: { product: Product }) {
  return <Card>
    <Section>{ro.result.source}</Section>
    <Body>{product.source}</Body>
    <Body>{isOffProduct(product) ? ro.result.imported : ro.result.added}: {roDate(product.addedAt)}</Body>
    {product.status === 'verified' && product.verifiedAt
      ? <Body>{ro.result.checked}: {roDate(product.verifiedAt)}</Body>
      : <Body>{ro.result.unverified}</Body>}
  </Card>;
}
