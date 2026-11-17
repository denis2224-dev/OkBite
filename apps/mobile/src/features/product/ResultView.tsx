import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { NUTRIENT_KEYS, type Product, type ScoreResult } from '@okbite/shared';
import { Body, Button, Card, Heading, LinkRow, useToast } from '../../ui';
import { ro } from '../../copy/ro';
import { isPreview } from '../../lib/preview';
import { displayScore } from './displayScore';
import { ScoreCard } from './ScoreCard';
import { WhyScore } from './WhyScore';
import { AdditivesCard } from './AdditivesCard';
import { CompositionCard } from './CompositionCard';
import { ProfileAllergenAlert } from './ProfileAllergenAlert';
import { AllergenSummary } from './AllergenSummary';
import { ResultTopBar } from './ResultTopBar';
import { PortionSheet } from './PortionSheet';
import { PartialNutritionCard } from './PartialNutritionCard';
import { SourceCard } from './SourceCard';
import { ReportSheet } from './ReportSheet';
import { shareProduct } from '../share/shareProduct';
import { productShareUrl } from '../share/productShareText';

// Enable only after the U1/U2 enrichment backend and U6 route have been verified together.
const enrichmentReady = process.env.EXPO_PUBLIC_NUTRITION_ENRICHMENT === '1';
export function ResultView({ product, score, nutritionAdditionAvailable = enrichmentReady }: { product: Product; score: ScoreResult; nutritionAdditionAvailable?: boolean }) {
  const [report, setReport] = useState(false);
  const [portion, setPortion] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const toast = useToast();
  const shownScore = displayScore(product, score);
  const hasNutrition = NUTRIENT_KEYS.some(key => product.nutrients[key] !== null);
  const canShowScore = shownScore.score !== null && shownScore.grade !== 'unavailable';
  const showPortion = canShowScore && hasNutrition;
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
    <ResultTopBar onShare={isPreview ? undefined : share} sharing={sharing} onReport={() => setReport(true)} />
    {shareFailed && <View style={{ gap: 8 }}>
      <Body accessibilityLiveRegion="polite">{ro.share.error}</Body>
      <Body selectable>{productShareUrl(product)}</Body>
    </View>}
    <ProfileAllergenAlert product={product} />
    {canShowScore ? <ScoreCard product={product} score={shownScore} /> : <><Heading>{product.name}</Heading><Body>{[product.brand, product.quantity].filter(Boolean).join(', ')}</Body></>}
    <AllergenSummary product={product} />
    {canShowScore ? <WhyScore score={shownScore} sugar={product.nutrients.sugar} /> : <PartialNutritionCard product={product} />}
    <AdditivesCard product={product} />
    <Card testID="result-link-rows" style={{ paddingVertical: 4, gap: 0 }}>
      <LinkRow label={ro.result.ingredientsTile} last={!showPortion} onPress={() => router.push({ pathname: '/product/[id]/ingredients', params: { id: product.id } })} />
      {showPortion && <LinkRow label={ro.result.portionTile} last onPress={() => setPortion(true)} />}
    </Card>
    <CompositionCard product={product} />
    {nutritionAdditionAvailable && product.status === 'unverified' && !hasNutrition &&
      <Button variant="secondary" onPress={() => router.push({pathname: '/add/nutrition', params: {productId: product.id}})}>{ro.result.addNutrition}</Button>}
    <Card style={{ paddingVertical: 4, gap: 0 }}>
      <LinkRow icon="camera" label={ro.result.original} last onPress={() => router.push({ pathname: '/product/[id]/label', params: { id: product.id } })} />
    </Card>
    {/* Provenance is the last card: source, dates, and the OFF or shopper note. */}
    <SourceCard product={product} />
    {report && <ReportSheet productId={product.id} onClose={() => setReport(false)} />}
    {portion && <PortionSheet product={product} onClose={() => setPortion(false)} />}
  </>;
}
