import { useState } from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { NUTRIENT_KEYS, resolveProductIngredients, type Product, type ScoreResult } from '@okbite/shared';
import { AllergenChip, Badge, Body, Button, Card, Heading, LinkRow, useToast } from '../../ui';
import { fonts } from '../../theme/tokens';
import { ro } from '../../copy/ro';
import { isPreview } from '../../lib/preview';
import { displayScore } from './displayScore';
import { ScoreCard } from './ScoreCard';
import { WhyScore } from './WhyScore';
import { ProfileAllergenAlert } from './ProfileAllergenAlert';
import { PartialNutritionCard } from './PartialNutritionCard';
import { PortionTable } from './PortionTable';
import { SourceCard } from './SourceCard';
import { ReportSheet } from './ReportSheet';
import { shareProduct } from '../share/shareProduct';
import { productShareUrl } from '../share/productShareText';

// Enable only after the U1/U2 enrichment backend and U6 route have been verified together.
const enrichmentReady = process.env.EXPO_PUBLIC_NUTRITION_ENRICHMENT === '1';
export function ResultView({ product, score, nutritionAdditionAvailable = enrichmentReady }: { product: Product; score: ScoreResult; nutritionAdditionAvailable?: boolean }) {
  const [report, setReport] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const toast = useToast();
  const shownScore = displayScore(product, score);
  const hasNutrition = NUTRIENT_KEYS.some(key => product.nutrients[key] !== null);
  const canShowScore = shownScore.score !== null && shownScore.grade !== 'unavailable';
  const explainedIngredients = resolveProductIngredients(product)
    .filter(item => Boolean(item.slug && item.explanation && item.source && /^https?:\/\//i.test(item.source)))
    .sort((a, b) => (a.group === 'add' ? 0 : 1) - (b.group === 'add' ? 0 : 1));
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
    <ProfileAllergenAlert product={product} />
    {canShowScore ? <ScoreCard product={product} score={shownScore} /> : <><Heading>{product.name}</Heading><Body>{product.brand} · {product.quantity}</Body></>}
    {product.status === 'unverified' && <>
      <Badge tone="unverified">{ro.result.unverified}</Badge><Body>{ro.result.unverifiedNote}</Body>
    </>}
    {canShowScore ? <WhyScore score={shownScore} sugar={product.nutrients.sugar} /> : <PartialNutritionCard product={product} />}
    <Card>
      <Heading style={{ fontSize: 18 }}>{ro.result.allergens}</Heading>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {product.allergens.map(name => <AllergenChip key={name} name={name} />)}
      </View>
      {!product.allergens.length && <Body>{ro.result.noAllergens}</Body>}
      {!!product.mayContain.length && <>
        <Body style={{ fontFamily: fonts.bold }}>{ro.result.mayContain}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {product.mayContain.map(name => <AllergenChip key={name} name={name} tone="trace" />)}
        </View>
      </>}
      <Body>{ro.result.missingAllergenNote}</Body>
      <Body>{ro.result.allergyNote}</Body>
    </Card>
    {canShowScore && hasNutrition && <PortionTable product={product} />}
    {product.imageUrl && <Image source={{ uri: product.imageUrl }} accessibilityLabel={product.name} style={{ width: '100%', height: 180 }} resizeMode="contain" />}
    <Card>
      <Heading style={{fontSize:18}}>{ro.result.transcribedLabel}</Heading>
      <Body selectable>{product.ingredientsText}</Body>
      {explainedIngredients.length > 0 && <View style={{ gap: 8, marginTop: 8 }}>
        <Body style={{ fontFamily: fonts.bold }}>{ro.result.explainedWithSource}</Body>
        {explainedIngredients.map((item, idx) => (
          <View key={`${item.slug}:${idx}`} style={{ gap: 2 }}>
            <Body style={{ fontFamily: fonts.bold }}>{item.name}</Body>
            {item.role && <Body>{item.role}</Body>}
            {item.explanation && <Body>{item.explanation}</Body>}
          </View>
        ))}
      </View>}
    </Card>
    <SourceCard product={product} />
    {nutritionAdditionAvailable && product.status === 'unverified' && !hasNutrition &&
      <Button variant="secondary" onPress={() => router.push({pathname: '/add/nutrition', params: {productId: product.id}})}>{ro.result.addNutrition}</Button>}
    <Card style={{ paddingVertical: 4, gap: 0 }}>
      <LinkRow icon="book" label={ro.ingredients.title} hint={ro.result.ingredientsHint} onPress={() => router.push({ pathname: '/product/[id]/ingredients', params: { id: product.id } })} />
      <LinkRow icon="camera" label={ro.result.original} last onPress={() => router.push({ pathname: '/product/[id]/label', params: { id: product.id } })} />
    </Card>
    <Button icon="compare" onPress={() => router.push({ pathname: '/compare', params: { id: product.id } })}>{ro.result.compare}</Button>
    {!isPreview && <Button variant="secondary" icon="share" disabled={sharing} onPress={share}>{ro.share.button}</Button>}
    {shareFailed && <View style={{ gap: 8 }}>
      <Body accessibilityLiveRegion="polite">{ro.share.error}</Body>
      <Body selectable>{productShareUrl(product)}</Body>
    </View>}
    <Button variant="ghost" onPress={() => setReport(true)}>{ro.result.report}</Button>
    {report && <ReportSheet productId={product.id} onClose={() => setReport(false)} />}
  </>;
}
