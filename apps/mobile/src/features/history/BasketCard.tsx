import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
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
// The A–E scale colours keep the five tiers apart in the bar (excellent and good share one tier tone).
const barColor: Record<Tier, string> = { excellent: letterTones.A.fg, good: letterTones.B.fg, fair: letterTones.C.fg, poor: letterTones.D.fg, bad: letterTones.E.fg };

/** Counts from 0 to `target` once; shows `target` at once when motion is reduced or the check is unavailable. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    let live = true; let frame = 0;
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then(reduced => {
      if (!live || reduced !== false) return;
      const start = Date.now();
      const tick = () => {
        const t = Math.min(1, (Date.now() - start) / 750);
        setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1 && live) frame = requestAnimationFrame(tick);
      };
      setValue(0); frame = requestAnimationFrame(tick);
    }).catch(() => undefined);
    return () => { live = false; cancelAnimationFrame(frame); };
  }, [target]);
  return value;
}

export function BasketCard({ basket }: { basket: Basket }) {
  const { colors } = useTheme();
  const shown = useCountUp(basket.average);
  const present = order.filter(tier => basket.mix[tier] > 0);
  return <Card testID="basket-card">
    <Section>{ro.history.basket.title}</Section>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 10, columnGap: 14 }}>
      <ScoreTag score={shown} tier={basket.tier} label={`${ro.history.score(basket.average)} · ${ro.tiers[basket.tier]}`} />
      <View style={{ flex: 1, minWidth: 140 }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, color: tierTone(basket.tier).fg }}>{ro.tiers[basket.tier]}</Body>
        <Caption>{ro.history.basket.average(basket.scored)}</Caption>
      </View>
    </View>
    <View accessible accessibilityRole="image" accessibilityLabel={ro.history.basket.mixLabel(basket.mix)} style={{ flexDirection: 'row', height: 14, gap: 3 }}>
      {present.map(tier => <View key={tier} style={{ flexGrow: basket.mix[tier], borderRadius: 4, backgroundColor: barColor[tier] }} />)}
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
      <Caption>{`${ro.history.score(basket.best.score)} · ${ro.tiers[basket.best.tier]}`}</Caption>
    </View>
  </Card>;
}
