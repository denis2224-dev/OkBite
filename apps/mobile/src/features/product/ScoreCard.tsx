import { View } from 'react-native';
import { productScore, type Product, type ScoreResult } from '@okbite/shared';
import { Body, Heading } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { ro } from '../../copy/ro';
import { NutriScoreScale } from './NutriScoreScale';

/** Letter tile, product name and tier, then the A–E bar with the disclaimer directly under it.
 * Compare's picker passes no product: it shows its own name line. */
export function ScoreCard({ product, score }: { product?: Product; score: ScoreResult }) {
  const { colors } = useTheme();
  // With a product, the 0-100 number is the product score (nutrition, additives, processing) with its tier,
  // and the tile carries only the Nutri-Score letter, so each number appears once.
  const scored = product ? productScore(product, score) : null;
  const shown = score.score !== null && score.grade !== 'unavailable' ? { value: scored?.score ?? score.score, grade: score.grade } : null;
  const tone = score.letter ? letterTones[score.letter]
    : shown ? { fg: colors[shown.grade], bg: colors[`${shown.grade}Bg`] } : null;
  const productLine = shown && scored?.tier ? `${ro.history.score(shown.value)} · ${ro.tiers[scored.tier]}` : null;
  // The A-E bar below already announces the letter, so the tile announces the product score.
  const tileLabel = !shown ? '' : productLine ?? ro.score.ringLabel(shown.value, shown.grade);
  const tileSub = score.letter ? (scored ? ro.tiers.nutriScore : `${shown?.value} ${ro.score.outOf}`) : ro.score.outOf;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {shown && tone && <View accessible accessibilityRole="image" accessibilityLabel={tileLabel}
        style={{ minWidth: 72, minHeight: 72, padding: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: 34, lineHeight: 40, color: tone.fg }}>{score.letter ?? shown.value}</Body>
        <Body style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: tone.fg, textAlign: 'center' }}>{tileSub}</Body>
      </View>}
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        {product && <>
          <Heading numberOfLines={2} style={{ fontSize: 22, lineHeight: 28 }}>{product.name}</Heading>
          <Body style={{ color: colors.muted }}>{[product.brand, product.quantity].filter(Boolean).join(', ')}</Body>
        </>}
        {productLine && <Body testID="product-score" style={{ fontFamily: fonts.bold }}>{productLine}</Body>}
        <Body style={{ color: colors.muted }}>{shown ? `${ro.score.title}: ${ro.score[shown.grade]}` : ro.result.scoreUnavailable}</Body>
      </View>
    </View>
    {shown ? <NutriScoreScale letter={score.letter} /> : <>
      <Body>{ro.result.insufficient}</Body><Body>{ro.result.missing}</Body>
      {score.missing.map(key => <Body key={key}>{ro.result.nutrients[key]}</Body>)}
    </>}
    <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{ro.score.disclaimer}</Body>
  </View>;
}
