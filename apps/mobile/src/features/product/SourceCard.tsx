import type { Product } from '@okbite/shared';
import { Card,Body,Heading,Badge } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
export function SourceCard({product}:{product:Product}){const {colors}=useTheme();return <Card><Heading style={{fontSize:20}}>{ro.result.source}</Heading><Body>{product.source}</Body><Body style={{fontSize:12,color:colors.muted}}>{ro.result.added}: {new Date(product.addedAt+'T12:00:00').toLocaleDateString('ro-RO')}</Body>{product.status==='verified'&&product.verifiedAt?<><Badge>{ro.result.verified}</Badge><Body style={{fontSize:12,color:colors.muted}}>{ro.result.checked}: {new Date(product.verifiedAt+'T12:00:00').toLocaleDateString('ro-RO')}</Body></>:<><Badge tone="unverified">{ro.result.unverified}</Badge><Body style={{fontSize:12}}>{ro.result.unverifiedNote}</Body></>}</Card>;}
