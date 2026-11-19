import { useState } from 'react';
import { Image, View } from 'react-native';
import { productScore, summarizeWater, type Product, type ScoreResult } from '@okbite/shared';
import { Body, Caption, Title } from '../../ui';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { tierTone } from '../../theme/tierTones';
import { ro } from '../../copy/ro';
import { NutriScoreScale } from './NutriScoreScale';
import { ScoreTag } from './ScoreTag';

/** Result hero: photo thumbnail and name, the product score as a shelf tag with its tier, then the A–E bar
 * (naming the letter) with the disclaimer directly under it. Without a tier, and in Compare's picker
 * (`identity={false}`), it keeps the letter tile, name and tier lines. */
export function ScoreCard({ product, score, identity = true }: { product?: Product; score: ScoreResult; identity?: boolean }) {
  const { colors } = useTheme();
  // A photo URL that fails to load (e.g. a removed OFF image) hides the thumbnail instead of leaving an empty tile.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const thumbUrl = product?.imageUrl && product.imageUrl !== failedUrl ? product.imageUrl : null;
  // With a product, the 0-100 number is the product score (nutrition, additives, processing) with its tier,
  // and the tile carries only the Nutri-Score letter, so each number appears once.
  const isWater = product?.category.scoreKind === 'water';
  const wCopy = ro.result.water;
  const waterSummary = isWater && product?.water ? summarizeWater(product.water) : null;
  const scored = product ? productScore(product, score) : null;
  const hasPoint = score.score !== null && score.grade !== 'unavailable';
  const hasRange = Boolean(isWater && !hasPoint && score.range && score.grade !== 'unavailable');
  const shown = hasPoint ? { value: scored?.score ?? score.score!, grade: score.grade } : null;
  const grade = hasPoint ? score.grade : hasRange ? score.grade : null;
  const tone = score.letter ? letterTones[score.letter]
    : grade && grade !== 'unavailable' ? { fg: colors[grade], bg: colors[`${grade}Bg`] } : null;
  const productLine = shown && scored?.tier ? `${ro.history.score(shown.value)} · ${ro.tiers[scored.tier]}` : null;
  const rangeLine = hasRange && score.range ? wCopy.estimatedRange(score.range.min, score.range.max) : null;
  const tileText = score.letter ?? (hasRange && score.range ? wCopy.rangeChip(score.range.min, score.range.max) : shown?.value);
  const tileSub = score.letter ? (scored ? ro.tiers.nutriScore : ro.history.score(shown?.value ?? 0)) : ro.score.outOf;
  // With a product line the tile is decoration: the line reads the score and the A-E bar reads the letter.
  const showWaterTier = waterSummary && (hasPoint || (hasRange && (waterSummary.tier === 'therapeutic' || waterSummary.tier === 'occasional_high_mineral')));
  const tileA11y = productLine ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: shown ? ro.score.ringLabel(shown.value, shown.grade) : rangeLine ?? '' };
  const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  if (product && !isWater && identity && shown && scored?.tier && productLine) {
    const tier = scored.tier;
    return <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {thumbUrl && <Image testID="product-thumb" source={{ uri: thumbUrl }} accessible={false} {...hidden} resizeMode="contain"
          onError={() => setFailedUrl(thumbUrl)}
          style={{ width: 64, height: 64, borderRadius: radii.small, backgroundColor: colors.soft }} />}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Title numberOfLines={2}>{product.name}</Title>
          <Body style={{ color: colors.muted }}>{[product.brand, product.quantity].filter(Boolean).join(', ')}</Body>
        </View>
      </View>
      <View testID="score-row" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 14, columnGap: 18 }}>
        <ScoreTag testID="product-score" score={shown.value} tier={tier} label={productLine} />
        <Title {...hidden} accessibilityRole={undefined} style={{ color: tierTone(tier).fg }}>{ro.tiers[tier]}</Title>
      </View>
      <View style={{ gap: 12 }}>
        <NutriScoreScale letter={score.letter} showLetter />
        <Caption>{ro.score.disclaimer}</Caption>
      </View>
    </View>;
  }
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {(shown || hasRange) && tone && <View {...tileA11y}
        style={{ minWidth: 72, minHeight: 72, padding: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: hasRange ? 24 : 34, lineHeight: hasRange ? 32 : 40, color: tone.fg }}>{tileText}</Body>
        <Body style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: tone.fg, textAlign: 'center' }}>{tileSub}</Body>
      </View>}
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        {product && identity && <>
          <Title numberOfLines={2}>{product.name}</Title>
          <Body style={{ color: colors.muted }}>{[product.brand, product.quantity].filter(Boolean).join(', ')}</Body>
        </>}
        {productLine && <Body testID="product-score" style={{ fontFamily: fonts.bold }}>{productLine}</Body>}
        {rangeLine && <Body testID="product-score-range" style={{ fontFamily: fonts.bold }}>{rangeLine}</Body>}
        {showWaterTier && grade && grade !== 'unavailable' && (
          <Body testID="water-tier-insight" style={{ color: colors[grade] }}>{wCopy.tiers[waterSummary.tier]}</Body>
        )}
        <Body style={{ color: colors.muted }}>
          {grade && grade !== 'unavailable' ? `${isWater ? wCopy.scoreTitle : ro.score.title}: ${ro.score[grade]}` : ro.result.scoreUnavailable}
        </Body>
      </View>
    </View>
    {!isWater && (shown ? <NutriScoreScale letter={score.letter} /> : <>
      <Body>{ro.result.insufficient}</Body><Body>{ro.result.missing}</Body>
      {score.missing.map(key => <Body key={key}>{ro.result.nutrients[key]}</Body>)}
    </>)}
    {!isWater && <Caption>{ro.score.disclaimer}</Caption>}
  </View>;
}
