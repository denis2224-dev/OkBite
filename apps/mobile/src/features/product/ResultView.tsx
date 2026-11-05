import { useState } from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import type { Product, ScoreResult } from '@okbite/shared';
import { AllergenChip, Badge, Body, Button, Card, Heading, useToast } from '../../ui';
import { ro } from '../../copy/ro';
import { isPreview } from '../../lib/preview';
import { ScoreCard } from './ScoreCard';
import { PortionTable } from './PortionTable';
import { SourceCard } from './SourceCard';
import { ReportSheet } from './ReportSheet';
import { shareProduct } from '../share/shareProduct';
import { productShareUrl } from '../share/productShareText';

export function ResultView({ product, score }: { product: Product; score: ScoreResult }) {
  const [report, setReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const toast = useToast();
  const missing = (['kcal', 'sugar', 'sat', 'salt'] as const).filter(key => product.nutrients[key] === null);
  const shownScore: ScoreResult = missing.length ? { score: null, letter: null, grade: 'unavailable', reasons: [], missing } : score;
  const share = async () => {
    setSharing(true);
    setShareFailed(false);
    try {
      if (await shareProduct(product, shownScore) === 'copied') toast(ro.share.copied);
    } catch {
      setShareFailed(true);
    } finally {
      setSharing(false);
    }
  };
  return <>
    {product.imageUrl && <Image source={{ uri: product.imageUrl }} accessibilityLabel={product.name} style={{ width: '100%', height: 180 }} resizeMode="contain" />}
    <Heading>{product.name}</Heading><Body>{product.brand} · {product.quantity}</Body>
    {product.status === 'unverified' && <>
      <Badge tone="unverified">{ro.result.unverified}</Badge><Body>{ro.result.unverifiedNote}</Body>
    </>}
    <Card>
      <Heading style={{ fontSize: 18 }}>{ro.result.allergens}</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {product.allergens.map(name => <AllergenChip key={name} name={name} />)}
      </View>
      {!product.allergens.length && <Body>{ro.result.noAllergens}</Body>}
      {!!product.mayContain.length && <>
        <Body>{ro.result.mayContain}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {product.mayContain.map(name => <AllergenChip key={name} name={name} />)}
        </View>
      </>}
      <Body>{ro.result.allergyNote}</Body>
    </Card>
    <ScoreCard score={shownScore} /><PortionTable product={product} /><SourceCard product={product} />
    {/* Ingredients and original-label buttons return with their routes in B5. */}
    <Button variant="secondary" onPress={() => router.push({ pathname: '/compare', params: { id: product.id } })}>{ro.result.compare}</Button>
    {!isPreview && <Button variant="secondary" disabled={sharing} onPress={share}>{ro.share.button}</Button>}
    {shareFailed && <View style={{ gap: 8 }}>
      <Body accessibilityLiveRegion="polite">{ro.share.error}</Body>
      <Body selectable>{productShareUrl(product)}</Body>
    </View>}
    <Button variant="ghost" onPress={() => setReport(true)}>{ro.result.report}</Button>
    {report && <ReportSheet productId={product.id} onClose={() => setReport(false)} />}
  </>;
}
