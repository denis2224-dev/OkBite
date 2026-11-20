import { View } from 'react-native';
import type { ScoreReason, Tier } from '@okbite/shared';
import { Body, Card, Detail, Icon } from '../../ui';
import { fonts } from '../../theme/tokens';
import { tierTone } from '../../theme/tierTones';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { teaspoons } from './portion';
import { ResultSection } from './ResultSection';

const rank: Record<ScoreReason['tone'], number> = { bad: 0, neutral: 1, good: 2 };
const isSugarProblem = (reason: ScoreReason) => reason.tone !== 'good' && /zah[aă]r/i.test(reason.title);

/** "In short": one verdict line from the product-score tier, then the score's own reasons (at most 3), problems first. No new numbers. */
export function InShort({ tier, reasons: all, sugar }: { tier: Tier; reasons: readonly ScoreReason[]; sugar: number | null }) {
  const { colors } = useTheme();
  const reasons = [...all].sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 3);
  return <ResultSection title={ro.result.inShort}>
    <Card testID="in-short" style={{ gap: 12, borderRadius: 22 }}>
      <View accessible accessibilityLabel={ro.result.verdict[tier]} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Icon name={tier === 'excellent' || tier === 'good' ? 'check' : 'alert'} size={20} color={tierTone(tier).fg} />
        <Body style={{ flex: 1, fontFamily: fonts.bold, color: tierTone(tier).fg }}>{ro.result.verdict[tier]}</Body>
      </View>
      {reasons.map((reason, index) => {
        const tone = reason.tone === 'good' ? { fg: colors.good, label: ro.score.positive }
          : reason.tone === 'bad' ? { fg: colors.low, label: ro.score.negative } : { fg: colors.neutral, label: ro.score.neutral };
        const spoons = sugar !== null && isSugarProblem(reason) ? `≈ ${teaspoons(sugar)}` : null;
        return <View key={index} accessible accessibilityLabel={`${tone.label}: ${reason.title}. ${reason.detail}${spoons ? `. ${spoons}` : ''}`}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View testID={`reason-tone-${reason.tone}`}><Icon name={reason.tone === 'good' ? 'check' : 'info'} size={18} color={tone.fg} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Body style={{ fontFamily: fonts.bold }}>{reason.title}</Body>
            <Detail>{reason.detail}</Detail>
            {spoons && <Detail>{spoons}</Detail>}
          </View>
        </View>;
      })}
    </Card>
  </ResultSection>;
}
