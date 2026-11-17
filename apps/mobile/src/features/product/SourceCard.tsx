import type { Product } from '@okbite/shared';
import { Body, Card, Heading } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';

// Contract dates are YYYY-MM-DD; Romanian readers expect DD.MM.YYYY.
export const roDate = (date: string) => date.split('-').reverse().join('.');

// Imports store OFF_SOURCE ('Open Food Facts (ODbL)'); shopper rows store 'Fotografiile utilizatorului'.
export const isOffProduct = (product: Product) => product.source.startsWith('Open Food Facts');

/** The last card of the result: where the data comes from. No "Unverified" badge; OFF rows say so plainly. */
export function SourceCard({ product }: { product: Product }) {
  const { colors } = useTheme();
  const off = isOffProduct(product);
  const verified = product.status === 'verified' && !!product.verifiedAt;
  return <Card testID="source-card">
    <Heading style={{ fontSize: 18 }}>{ro.result.source}</Heading>
    {off ? <Body>{ro.result.offNote}</Body> : !verified && <Body>{ro.result.unverifiedNote}</Body>}
    <Body style={{ color: colors.muted }}>{product.source}</Body>
    <Body style={{ color: colors.muted }}>{off ? ro.result.imported : ro.result.added}: {roDate(product.addedAt)}</Body>
    {verified && <Body style={{ color: colors.muted }}>{ro.result.checked}: {roDate(product.verifiedAt!)}</Body>}
  </Card>;
}
