import { View } from 'react-native';
import { productScore, summarizeWater, type Product, type ScoreResult } from '@okbite/shared';
import { Body, Heading } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { ro } from '../../copy/ro';
import { NutriScoreScale } from './NutriScoreScale';

/** Letter tile, product name and tier, then the A–E bar with the disclaimer directly under it.
 * Compare's picker passes no product: it shows its own name line. */
export function ScoreCard({ product, score, identity = true }: { product?: Product; score: ScoreResult; identity?: boolean }) {
  const { colors } = useTheme();
  const isWater = product?.category.scoreKind === 'water';
  const waterSummary = isWater && product?.water ? summarizeWater(product.water) : null;
  // With a product, the 0-100 number is the product score (nutrition, additives, processing) with its tier,
  // and the tile carries only the Nutri-Score letter, so each number appears once.
  const scored = product ? productScore(product, score) : null;
  const shown = score.score !== null && score.grade !== 'unavailable' ? { value: scored?.score ?? score.score, grade: score.grade } : null;
  const tone = score.letter ? letterTones[score.letter]
    : shown ? { fg: colors[shown.grade], bg: colors[`${shown.grade}Bg`] } : null;
  const productLine = shown && scored?.tier ? `${ro.history.score(shown.value)} · ${ro.tiers[scored.tier]}` : null;
  const tileSub = score.letter ? (scored ? ro.tiers.nutriScore : ro.history.score(shown?.value ?? 0)) : ro.score.outOf;
  // With a product line the tile is decoration: the line reads the score and the A-E bar reads the letter.
  const tileA11y = productLine ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: shown ? ro.score.ringLabel(shown.value, shown.grade) : '' };
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {shown && tone && <View {...tileA11y}
        style={{ minWidth: 72, minHeight: 72, padding: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: 34, lineHeight: 40, color: tone.fg }}>{score.letter ?? shown.value}</Body>
        <Body style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: tone.fg, textAlign: 'center' }}>{tileSub}</Body>
      </View>}
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        {product && identity && <>
          <Heading numberOfLines={2} style={{ fontSize: 22, lineHeight: 28 }}>{product.name}</Heading>
          <Body style={{ color: colors.muted }}>{[product.brand, product.quantity].filter(Boolean).join(', ')}</Body>
        </>}
        {productLine && <Body testID="product-score" style={{ fontFamily: fonts.bold }}>{productLine}</Body>}
        {waterSummary && shown && <Body testID="water-tier-insight" style={{ color: colors[shown.grade] }}>{ro.result.water.tiers[waterSummary.tier]}</Body>}
        <Body style={{ color: colors.muted }}>{shown ? `${isWater ? ro.result.water.scoreTitle : ro.score.title}: ${ro.score[shown.grade]}` : ro.result.scoreUnavailable}</Body>
      </View>
    </View>
    {shown ? <NutriScoreScale letter={score.letter} /> : <>
      <Body>{ro.result.insufficient}</Body><Body>{ro.result.missing}</Body>
      {score.missing.map(key => <Body key={key}>{ro.result.nutrients[key]}</Body>)}
    </>}
    <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{isWater ? ro.result.water.disclaimer : ro.score.disclaimer}</Body>
  </View>;
}
