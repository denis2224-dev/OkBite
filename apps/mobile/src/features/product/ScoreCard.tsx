import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { productScore, type Product, type ScoreResult } from '@okbite/shared';
import { Body, Detail, Title } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { tierTone } from '../../theme/tierTones';
import { ro } from '../../copy/ro';
import { NutriScoreScale } from './NutriScoreScale';

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
  const scored = product ? productScore(product, score) : null;
  const shown = score.score !== null && score.grade !== 'unavailable' ? { value: scored?.score ?? score.score, grade: score.grade } : null;
  const tone = score.letter ? letterTones[score.letter]
    : shown ? { fg: colors[shown.grade], bg: colors[`${shown.grade}Bg`] } : null;
  const productLine = shown && scored?.tier ? `${ro.history.score(shown.value)} · ${ro.tiers[scored.tier]}` : null;
  const tileSub = score.letter ? (scored ? ro.tiers.nutriScore : ro.history.score(shown?.value ?? 0)) : ro.score.outOf;
  // With a product line the tile is decoration: the line reads the score and the A-E bar reads the letter.
  const tileA11y = productLine ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: shown ? ro.score.ringLabel(shown.value, shown.grade) : '' };
  const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  if (product && identity && shown && scored?.tier && productLine) {
    const tier = scored.tier;
    const fg = tierTone(tier).fg;
    // The overview: photo, name, weight, score with its tier word. Nothing under it.
    return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {thumbUrl
        ? <Image testID="product-thumb" source={{ uri: thumbUrl }} accessible={false} {...hidden} resizeMode="contain"
            onError={() => setFailedUrl(thumbUrl)} style={{ width: 96, height: 96, borderRadius: 22, backgroundColor: colors.mint }} />
        : <View testID="product-thumb-tile" {...hidden} style={{ width: 96, height: 96, borderRadius: 22, backgroundColor: colors.mint }} />}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Title numberOfLines={2}>{product.name}</Title>
        {!!product.quantity && <Body style={{ color: colors.muted }}>{product.quantity}</Body>}
        <View testID="product-score" accessible accessibilityRole="text" accessibilityLabel={productLine}
          style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 10, marginTop: 4 }}>
          <Text {...hidden} allowFontScaling style={{ fontFamily: fonts.headingExtra, fontSize: 34, lineHeight: 40, color: fg }}>{shown.value}</Text>
          <Text {...hidden} allowFontScaling style={{ fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: fg }}>{ro.tiers[tier]}</Text>
        </View>
      </View>
    </View>;
  }
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {shown && tone && <View {...tileA11y}
        style={{ minWidth: 72, minHeight: 72, padding: 8, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: 34, lineHeight: 40, color: tone.fg }}>{score.letter ?? shown.value}</Body>
        <Body style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: tone.fg, textAlign: 'center' }}>{tileSub}</Body>
      </View>}
      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
        {product && identity && <>
          <Title numberOfLines={2}>{product.name}</Title>
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
    <Detail>{ro.score.disclaimer}</Detail>
  </View>;
}
