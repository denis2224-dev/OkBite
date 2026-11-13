import { View } from 'react-native';
import type { Product, ScoreResult } from '@okbite/shared';
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
  const shown = score.score !== null && score.grade !== 'unavailable' ? { value: score.score, grade: score.grade } : null;
  const tone = score.letter ? letterTones[score.letter]
    : shown ? { fg: colors[shown.grade], bg: colors[`${shown.grade}Bg`] } : null;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {shown && tone && <View accessible accessibilityRole="image" accessibilityLabel={ro.score.ringLabel(shown.value, shown.grade)}
        style={{ minWidth: 72, minHeight: 72, padding: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: 34, lineHeight: 40, color: tone.fg }}>{score.letter ?? shown.value}</Body>
        <Body style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: tone.fg, textAlign: 'center' }}>{score.letter ? `${shown.value} ${ro.score.outOf}` : ro.score.outOf}</Body>
      </View>}
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        {product && <>
          <Heading numberOfLines={2} style={{ fontSize: 22, lineHeight: 28 }}>{product.name}</Heading>
          <Body style={{ color: colors.muted }}>{[product.brand, product.quantity].filter(Boolean).join(', ')}</Body>
        </>}
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
