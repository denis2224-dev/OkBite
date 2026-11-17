import { View } from 'react-native';
import { productScore, summarizeWater, type Product, type ScoreResult } from '@okbite/shared';
import { Body, Heading } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { ro } from '../../copy/ro';
import { NutriScoreScale } from './NutriScoreScale';
import { waterFieldLabel } from './waterFormat';

/** Letter tile, product name and tier, then the A–E strip or water adaptive range & missing-input summary. */
export function ScoreCard({ product, score, identity = true }: { product?: Product; score: ScoreResult; identity?: boolean }) {
  const { colors } = useTheme();
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
  const showWaterTier = waterSummary && (hasPoint || (hasRange && (waterSummary.tier === 'therapeutic' || waterSummary.tier === 'occasional_high_mineral')));

  const tileA11y = productLine
    ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: shown ? ro.score.ringLabel(shown.value, shown.grade) : rangeLine ?? '' };

  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {(shown || hasRange) && tone && <View {...tileA11y}
        style={{ minWidth: 72, minHeight: 72, padding: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: hasRange ? 24 : 34, lineHeight: hasRange ? 32 : 40, color: tone.fg }}>{tileText}</Body>
        <Body style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: tone.fg, textAlign: 'center' }}>{tileSub}</Body>
      </View>}
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        {product && identity && <>
          <Heading numberOfLines={2} style={{ fontSize: 22, lineHeight: 28 }}>{product.name}</Heading>
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
    {hasRange && score.waterMissing && score.waterMissing.length > 0 && <View style={{ gap: 2 }}>
      <Body style={{ fontFamily: fonts.bold, fontSize: 13 }}>{wCopy.missingInputs}</Body>
      <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{score.waterMissing.map(waterFieldLabel).join(', ')}</Body>
    </View>}
    {isWater && score.unverifiedUsed && (
      <Body testID="water-unverified-note" style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{wCopy.unverifiedNote}</Body>
    )}
    {(shown || hasRange) ? <NutriScoreScale letter={score.letter} /> : <>
      <Body>{ro.result.insufficient}</Body><Body>{ro.result.missing}</Body>
      {score.missing.map(key => <Body key={key}>{ro.result.nutrients[key]}</Body>)}
    </>}
    <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{isWater ? wCopy.disclaimer : ro.score.disclaimer}</Body>
  </View>;
}
