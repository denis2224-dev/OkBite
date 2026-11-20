import { View } from 'react-native';
import type { Tier } from '@okbite/shared';
import { Body, Caption, Card, Section } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { letterTones } from '../../theme/letterTones';
import { tierTone } from '../../theme/tierTones';
import { ro } from '../../copy/ro';
import { ScoreTag } from '../product/ScoreTag';
import type { Basket } from './basket';

const order: Tier[] = ['excellent', 'good', 'fair', 'poor', 'bad'];
// Tier colours from the palette; "Foarte slab" borrows the E red so it stays apart from "Slab".
const barColor: Record<Tier, string> = { excellent: tierTone('excellent').fg, good: tierTone('good').fg, fair: tierTone('fair').fg, poor: tierTone('poor').fg, bad: letterTones.E.fg };

export function BasketCard({ basket }: { basket: Basket }) {
  const { colors } = useTheme();
  const present = order.filter(tier => basket.mix[tier] > 0);
  return <Card testID="basket-card">
    <Section>{ro.history.basket.title}</Section>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 10, columnGap: 14 }}>
      {/* The number is the average straight away; only the tag swings in, as on the product page. */}
      <ScoreTag score={basket.average} tier={basket.tier} label={`${ro.history.score(basket.average)} · ${ro.tiers[basket.tier]}`} />
      <View style={{ flex: 1, minWidth: 140 }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, color: tierTone(basket.tier).fg }}>{ro.tiers[basket.tier]}</Body>
        <Caption>{ro.history.basket.average(basket.scored)}</Caption>
      </View>
    </View>
    <View accessible accessibilityRole="image" accessibilityLabel={ro.history.basket.mixLabel(basket.mix)} style={{ flexDirection: 'row', height: 14, gap: 3 }}>
      {present.map(tier => <View key={tier} testID={`basket-bar-${tier}`} style={{ flexGrow: basket.mix[tier], borderRadius: 4, backgroundColor: barColor[tier] }} />)}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
      {present.map(tier => <View key={tier} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: barColor[tier] }} />
        <Caption>{ro.history.basket.count(basket.mix[tier], ro.tiers[tier])}</Caption>
      </View>)}
      {basket.unscored > 0 && <Caption>{ro.history.basket.unscored(basket.unscored)}</Caption>}
    </View>
    <View style={{ height: 1, backgroundColor: colors.divider }} />
    <View style={{ gap: 2 }}>
      <Body style={{ fontFamily: fonts.bold }}>{ro.history.basket.best(basket.best.name)}</Body>
      <Caption>{`${ro.history.score(basket.best.score)}, ${ro.tiers[basket.best.tier]}`}</Caption>
    </View>
  </Card>;
}
