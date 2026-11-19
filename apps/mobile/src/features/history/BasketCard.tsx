import { Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { ScoreBadge, SegmentedScoreBar, SoftCard } from '../../ui';
import type { Basket } from './basket';

/** "Coșul tău" without a heading: the average badge (it swings in once), the tier bar, then the best find. Counts are read aloud. */
export function BasketCard({ basket }: { basket: Basket }) {
  const { colors } = useTheme();
  return <SoftCard testID="basket-card" style={{ gap: 18 }}>
    <ScoreBadge testID="basket-score" score={basket.average} tier={basket.tier}
      label={`${ro.history.score(basket.average)} · ${ro.tiers[basket.tier]}. ${ro.history.basket.average(basket.scored)}`} />
    <SegmentedScoreBar mix={basket.mix} label={ro.history.basket.mixLabel(basket.mix)} />
    <View style={{ height: 1, backgroundColor: colors.divider }} />
    <Text allowFontScaling accessibilityLabel={`${ro.history.basket.best(basket.best.name)}. ${ro.history.score(basket.best.score)} · ${ro.tiers[basket.best.tier]}`}
      style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.ink }}>{ro.history.basket.best(basket.best.name)}</Text>
  </SoftCard>;
}
